import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSchema } from "@shared/schema";
import { SolanaService } from "./services/solana";
import { getBaseService } from "./services/base";
import { gameService, type ChainType } from "./services/game";
import { casinoEngine } from "./services/casino-engine";
import { jackpotService } from "./services/jackpot";
import { rateLimiters, quotaMiddleware } from "./middleware/rate-limiter";
import { idempotencyMiddleware } from "./middleware/idempotency";
import { validateWalletAddress } from "./middleware/security";
import { APIError, asyncHandler } from "./middleware/error-handler";
import { withRetry } from "./utils/retry";
import { randomUUID } from "crypto";

const solanaService = new SolanaService();
const baseService = getBaseService();

// Valid ticket costs per chain
const VALID_TICKET_COSTS: Record<ChainType, number[]> = {
  solana: [0.1, 0.2, 0.5, 0.75, 1.0],
  base: [0.001, 0.002, 0.005, 0.0075, 0.01],
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply rate limiting to all API routes
  app.use("/api", rateLimiters.general);

  // Get stats for specific chain
  app.get("/api/stats/:chain", asyncHandler(async (req, res) => {
    const { chain } = req.params as { chain: ChainType };
    
    if (chain !== 'solana' && chain !== 'base') {
      throw new APIError("Invalid chain. Use 'solana' or 'base'", 400, "VALIDATION_ERROR");
    }

    const [chainStats, poolBalance] = await Promise.all([
      storage.getChainStats(chain),
      chain === 'solana' 
        ? solanaService.getPoolBalance()
        : baseService.getPoolBalance(),
    ]);

    res.json({
      chain,
      totalPool: poolBalance.toString(),
      totalWins: chainStats?.totalWins || 0,
      totalGames: chainStats?.totalGames || 0,
      lastWinAmount: chainStats?.lastWinAmount || "0",
      poolWallet: chain === 'solana' 
        ? solanaService.getPoolWalletAddress()
        : baseService.getPoolAddress(),
    });
  }));

  // Get combined stats (legacy endpoint)
  app.get("/api/stats", asyncHandler(async (_req, res) => {
    const [solanaStats, baseStats, solanaBalance, baseBalance] = await Promise.all([
      storage.getChainStats('solana'),
      storage.getChainStats('base'),
      solanaService.getPoolBalance(),
      baseService.getPoolBalance(),
    ]);

    res.json({
      solana: {
        totalPool: solanaBalance.toString(),
        totalWins: solanaStats?.totalWins || 0,
        totalGames: solanaStats?.totalGames || 0,
        poolWallet: solanaService.getPoolWalletAddress(),
      },
      base: {
        totalPool: baseBalance.toString(),
        totalWins: baseStats?.totalWins || 0,
        totalGames: baseStats?.totalGames || 0,
        poolWallet: baseService.getPoolAddress(),
      },
    });
  }));

  // Get recent wins (combined)
  app.get("/api/games/recent-wins", asyncHandler(async (req, res) => {
    const { chain } = req.query as { chain?: ChainType };
    
    const recentWins = chain 
      ? await storage.getRecentWinsByChain(chain, 10)
      : await storage.getRecentWins(10);
      
    res.json(recentWins);
  }));

  // Create and play game with verification
  app.post(
    "/api/games/create-and-play",
    rateLimiters.standard,
    quotaMiddleware,
    idempotencyMiddleware,
    validateWalletAddress,
    asyncHandler(async (req, res) => {
      const { 
        purchaseSignature, 
        playerWallet, 
        ticketCost, 
        chain = 'solana' 
      } = req.body as {
        purchaseSignature: string;
        playerWallet: string;
        ticketCost: number;
        chain: ChainType;
      };

      // Validate chain
      if (chain !== 'solana' && chain !== 'base') {
        throw new APIError("Invalid chain", 400, "VALIDATION_ERROR");
      }

      // Validate required fields
      if (!purchaseSignature || !playerWallet || !ticketCost) {
        throw new APIError("Missing required fields", 400, "VALIDATION_ERROR");
      }

      // Validate ticket cost for chain
      const validCosts = VALID_TICKET_COSTS[chain];
      if (!validCosts.includes(parseFloat(ticketCost.toString()))) {
        throw new APIError(`Invalid ticket cost for ${chain}`, 400, "VALIDATION_ERROR");
      }

      const isDemoMode = playerWallet.toLowerCase().startsWith("demo");

      // Verify transaction if not demo
      if (!isDemoMode) {
        const poolAddress = chain === 'solana'
          ? solanaService.getPoolWalletAddress()
          : baseService.getPoolAddress();

        const verification = await gameService.verifyPurchase({
          chain,
          txHash: purchaseSignature,
          expectedAmount: parseFloat(ticketCost.toString()),
          expectedRecipient: poolAddress,
        });

        if (!verification.valid) {
          throw new APIError(verification.error || "Transaction verification failed", 400, "TRANSACTION_INVALID");
        }

        // Check for duplicate
        const existingGame = await storage.getGameByPurchaseSignature(purchaseSignature);
        if (existingGame) {
          throw new APIError("Transaction already used", 409, "DUPLICATE_TRANSACTION");
        }
      }

      // Create game
      const game = await gameService.createGame({
        chain,
        playerWallet,
        ticketCost: parseFloat(ticketCost.toString()),
        purchaseTxHash: purchaseSignature,
        isDemoMode,
      });

      res.status(201).json(game);
    })
  );

  // Process payout
  app.post(
    "/api/games/payout",
    rateLimiters.critical,
    quotaMiddleware,
    idempotencyMiddleware,
    validateWalletAddress,
    asyncHandler(async (req, res) => {
      const { 
        playerWallet, 
        winAmount, 
        gameId, 
        chain = 'solana' 
      } = req.body as {
        playerWallet: string;
        winAmount: string;
        gameId: string;
        chain: ChainType;
      };

      if (!playerWallet || !winAmount || !gameId) {
        throw new APIError("Missing required fields", 400, "VALIDATION_ERROR");
      }

      // Verify game exists
      const game = await storage.getGameById(gameId);
      if (!game) {
        throw new APIError("Game not found", 404, "NOT_FOUND");
      }

      if (game.playerWallet !== playerWallet) {
        throw new APIError("Game does not belong to this wallet", 403, "FORBIDDEN");
      }

      if (!game.isWin) {
        throw new APIError("This game is not a winning game", 400, "NOT_A_WIN");
      }

      if (game.payoutSignature) {
        throw new APIError("Payout already processed", 409, "ALREADY_PAID");
      }

      // Verify win amount
      const expectedWin = parseFloat(game.winAmount || "0");
      const requestedWin = parseFloat(winAmount);
      if (Math.abs(expectedWin - requestedWin) > 0.001) {
        throw new APIError("Win amount mismatch", 400, "AMOUNT_MISMATCH");
      }

      // Check payout limits
      const SECURITY_LIMITS = { MAX_SINGLE_PAYOUT: 10, MAX_HOURLY_PAYOUT: 50, MAX_DAILY_PAYOUT: 200 };
      const maxPayout = chain === 'solana' ? SECURITY_LIMITS.MAX_SINGLE_PAYOUT : 0.1; // 0.1 ETH max
      if (requestedWin > maxPayout) {
        throw new APIError(
          `Payout exceeds maximum of ${maxPayout} ${chain === 'solana' ? 'SOL' : 'ETH'}`,
          429,
          "PAYOUT_LIMIT_EXCEEDED"
        );
      }

      // Process payout
      const result = await gameService.processPayout({
        gameId,
        playerWallet,
        winAmount: requestedWin,
        chain,
      });

      if (!result.success) {
        throw new APIError(result.error || "Payout failed", 500, "PAYOUT_FAILED");
      }

      res.json({ success: true, signature: result.signature });
    })
  );

  // Pool balance endpoint
  app.get("/api/pool/balance/:chain", asyncHandler(async (req, res) => {
    const { chain } = req.params as { chain: ChainType };
    
    if (chain !== 'solana' && chain !== 'base') {
      throw new APIError("Invalid chain", 400, "VALIDATION_ERROR");
    }

    const balance = chain === 'solana'
      ? await solanaService.getPoolBalance()
      : await baseService.getPoolBalance();

    res.json({
      chain,
      balance,
      poolWallet: chain === 'solana'
        ? solanaService.getPoolWalletAddress()
        : baseService.getPoolAddress(),
    });
  }));

  // Pool check endpoint (can play?)
  app.post("/api/pool/check", rateLimiters.general, asyncHandler(async (req, res) => {
    const { ticketCost, chain = 'solana' } = req.body as { ticketCost: number; chain: ChainType };

    if (!ticketCost || ticketCost <= 0) {
      throw new APIError("Invalid ticket cost", 400, "VALIDATION_ERROR");
    }

    const poolBalance = await gameService.getPoolBalance(chain);
    const gameResult = casinoEngine.calculateWin(ticketCost, poolBalance);
    const isHealthy = casinoEngine.isPoolHealthy(poolBalance);

    res.json({
      canPlay: poolBalance > casinoEngine.getMinPoolReserve() + ticketCost,
      poolBalance,
      maxPayout: gameResult.maxPayout,
      currentWinRate: gameResult.adjustedWinRate,
      isPoolHealthy: isHealthy,
      reason: gameResult.reason || null,
      chain,
    });
  }));

  // Get player's game history
  app.get("/api/games/:wallet", rateLimiters.general, validateWalletAddress, asyncHandler(async (req, res) => {
    const { wallet } = req.params;
    const { chain } = req.query as { chain?: ChainType };
    
    const games = chain
      ? await storage.getGamesByWalletAndChain(wallet, chain)
      : await storage.getGamesByWallet(wallet);
      
    res.json(games);
  }));

  // RPC Proxy (existing - for Solana)
  app.post("/api/rpc-proxy", rateLimiters.general, asyncHandler(async (req, res) => {
    const heliusKey = process.env.HELIUS_API_KEY;
    const endpoints = [
      heliusKey ? `https://rpc.helius.xyz/?api-key=${heliusKey}` : null,
      "https://api.mainnet-beta.solana.com",
      "https://ssc-dao.genesysgo.net/",
      "https://rpc.ankr.com/solana",
    ].filter(Boolean) as string[];

    let lastError;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req.body),
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const data = await response.json();
          return res.json(data);
        }
        lastError = await response.text();
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
        continue;
      }
    }

    throw new APIError("All RPC endpoints unavailable", 503, "RPC_UNAVAILABLE");
  }));

  // Jackpot endpoints (unchanged - Solana only for now)
  app.get("/api/jackpot/status", rateLimiters.jackpot, asyncHandler(async (_req, res) => {
    const status = await jackpotService.getStatus();
    res.json(status);
  }));

  app.get("/api/jackpot/tickets/:wallet", rateLimiters.jackpot, validateWalletAddress, asyncHandler(async (req, res) => {
    const tickets = await jackpotService.getUserTickets(req.params.wallet);
    res.json({ tickets });
  }));

  app.post(
    "/api/jackpot/purchase",
    rateLimiters.standard,
    idempotencyMiddleware,
    validateWalletAddress,
    asyncHandler(async (req, res) => {
      const { wallet, signature } = req.body;
      if (!wallet || !signature) {
        throw new APIError("Wallet and signature required", 400, "VALIDATION_ERROR");
      }

      const result = await jackpotService.verifyAndRecordPurchase({ wallet, signature });
      res.json({ success: true, ...result });
    })
  );

  // Bags.fm quote proxy
  app.get("/api/bags/quote", rateLimiters.general, asyncHandler(async (req, res) => {
    const apiKey = process.env.BAGS_API_KEY;
    if (!apiKey) {
      throw new APIError("BAGS_API_KEY not configured", 501, "NOT_CONFIGURED");
    }

    const { inputMint, outputMint, amount } = req.query;
    if (!inputMint || !outputMint || !amount) {
      throw new APIError("inputMint, outputMint, amount required", 400, "VALIDATION_ERROR");
    }

    const url = new URL("https://public-api-v2.bags.fm/api/v1/trade/quote");
    url.searchParams.set("inputMint", String(inputMint));
    url.searchParams.set("outputMint", String(outputMint));
    url.searchParams.set("amount", String(amount));

    const response = await fetch(url.toString(), {
      headers: { "x-api-key": apiKey },
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json();
    if (!response.ok || !data?.success) {
      throw new APIError("Bags quote failed", 400, "QUOTE_FAILED");
    }

    const out = data.response.outAmount;
    const outDecimals = data.response.routePlan?.[0]?.outputMintDecimals ?? 0;
    const outTokens = Number(out) / 10 ** outDecimals;
    const sol = Number(amount) / 1e9;

    res.json({
      solPerToken: outTokens > 0 ? sol / outTokens : null,
      raw: data.response,
    });
  }));

  const httpServer = createServer(app);
  return httpServer;
}

// Helper for Solana transactions with retry
async function solanaTransactionWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  return withRetry(operation, {
    maxRetries: 3,
    baseDelayMs: 2000,
    retryableErrors: ["TIMEOUT", "BLOCKHASH", "CONFIRMATION"],
    onRetry: (err, att, delay) => {
      console.warn(`Solana retry ${att}/3 after ${delay}ms: ${err.message}`);
    },
  });
}
