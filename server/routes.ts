import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSchema } from "@shared/schema";
import { SolanaService } from "./services/solana";
import { casinoEngine } from "./services/casino-engine";
import { jackpotService } from "./services/jackpot";
import { rateLimiters, quotaMiddleware } from "./middleware/rate-limiter";
import { idempotencyMiddleware } from "./middleware/idempotency";
import { validateWalletAddress } from "./middleware/security";
import { APIError, asyncHandler, handleSolanaError } from "./middleware/error-handler";
import { withRetry } from "./utils/retry";
import { randomUUID } from "crypto";

const solanaService = new SolanaService();

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply rate limiting to all API routes
  app.use("/api", rateLimiters.general);

  // Get game statistics with real blockchain pool balance
  app.get("/api/stats", asyncHandler(async (_req, res) => {
    const stats = await withRetry(() => storage.getStats(), { maxRetries: 3, baseDelayMs: 100 });
    const poolBalance = await solanaService.getPoolBalance();

    res.json({
      totalPool: poolBalance.toString(),
      totalWins: stats?.totalWins || 0,
      lastWinAmount: stats?.lastWinAmount || "0",
      poolWallet: solanaService.getPoolWalletAddress(),
    });
  }));

  // Get recent wins
  app.get("/api/games/recent-wins", asyncHandler(async (_req, res) => {
    const recentWins = await storage.getRecentWins(10);
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
      const { purchaseSignature, playerWallet, ticketCost } = req.body;

      // Validate required fields
      if (!purchaseSignature || !playerWallet || !ticketCost) {
        throw new APIError("Missing required fields", 400, "VALIDATION_ERROR");
      }

      // Validate ticket cost
      const validTicketCosts = [0.1, 0.2, 0.5, 0.75, 1.0];
      if (!validTicketCosts.includes(parseFloat(ticketCost))) {
        throw new APIError("Invalid ticket cost", 400, "VALIDATION_ERROR");
      }

      const isDemoMode = playerWallet.startsWith("Demo") || playerWallet.startsWith("demo");

      if (!isDemoMode) {
        // Verify transaction on-chain with retry
        const txVerification = await withRetry(
          () => solanaService.verifyTransaction(purchaseSignature),
          { maxRetries: 3, baseDelayMs: 1000 }
        );

        if (!txVerification.valid) {
          throw new APIError("Invalid transaction signature", 400, "TRANSACTION_INVALID");
        }

        // Verify recipient
        const expectedRecipient = solanaService.getPoolWalletAddress();
        if (txVerification.to !== expectedRecipient) {
          throw new APIError("Transaction recipient mismatch", 400, "TRANSACTION_INVALID");
        }

        // Verify amount (allow 1% variance for fees)
        if (!txVerification.amount || Math.abs(txVerification.amount - ticketCost) > ticketCost * 0.01) {
          throw new APIError(
            `Transaction amount mismatch. Expected ${ticketCost} SOL`,
            400,
            "TRANSACTION_AMOUNT_MISMATCH"
          );
        }

        // Check for duplicate transaction
        const existingGame = await storage.getGameByPurchaseSignature(purchaseSignature);
        if (existingGame) {
          throw new APIError("Transaction already used", 409, "DUPLICATE_TRANSACTION");
        }
      }

      // Get pool balance and generate outcome
      const poolBalance = await solanaService.getPoolBalance();
      const gameResult = casinoEngine.calculateWin(parseFloat(ticketCost), poolBalance);

      // Create game record
      const gameData = {
        playerWallet,
        ticketType: ticketCost.toString(),
        maxWin: gameResult.maxPayout.toString(),
        symbols: gameResult.symbols,
        isWin: gameResult.canWin && gameResult.winAmount > 0,
        multiplier: gameResult.multiplier,
        winAmount: gameResult.winAmount.toString(),
        purchaseSignature: isDemoMode ? `demo_${randomUUID()}` : purchaseSignature,
        payoutSignature: null,
      };

      const game = await storage.createGame(gameData);

      res.status(201).json({
        gameId: game.id,
        symbols: gameResult.symbols,
        isWin: gameResult.canWin && gameResult.winAmount > 0,
        multiplier: gameResult.multiplier,
        winAmount: gameResult.winAmount,
        maxPayout: gameResult.maxPayout,
      });
    })
  );

  // Process payout with critical rate limiting
  app.post(
    "/api/games/payout",
    rateLimiters.critical,
    quotaMiddleware,
    idempotencyMiddleware,
    validateWalletAddress,
    asyncHandler(async (req, res) => {
      const { playerWallet, winAmount, gameId } = req.body as { 
        playerWallet: string; 
        winAmount: string; 
        gameId: string 
      };

      if (!playerWallet || !winAmount || !gameId) {
        throw new APIError("Missing required fields", 400, "VALIDATION_ERROR");
      }

      // Demo mode check
      const isDemoMode = playerWallet.toLowerCase().startsWith("demo");
      if (isDemoMode) {
        return res.json({ 
          success: true, 
          signature: `demo_payout_${randomUUID()}`, 
          demo: true 
        });
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
      if (requestedWin > SECURITY_LIMITS.MAX_SINGLE_PAYOUT) {
        throw new APIError(
          `Payout exceeds maximum of ${SECURITY_LIMITS.MAX_SINGLE_PAYOUT} SOL`,
          429,
          "PAYOUT_LIMIT_EXCEEDED"
        );
      }

      // Send payout with retry
      const payoutResult = await solanaTransactionWithRetry(async () => {
        const result = await solanaService.sendPayout(playerWallet, requestedWin);
        if (!result) throw new Error("Payout transaction failed");
        return result;
      });
      
      if (!payoutResult) {
        throw new APIError("Payout transaction failed", 500, "PAYOUT_FAILED");
      }
      const payoutSignature = payoutResult;

      // Update stats and game record
      const currentStats = await storage.getStats();
      await storage.updateStats({
        totalWins: (currentStats?.totalWins || 0) + 1,
        lastWinAmount: winAmount,
      });
      await storage.updateGamePayout(gameId, payoutSignature);

      res.json({ success: true, signature: payoutSignature });
    })
  );

  // RPC Proxy with fallback
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
          signal: AbortSignal.timeout(10000), // 10 second timeout per endpoint
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

  // Pool check endpoint
  app.post("/api/pool/check", rateLimiters.general, asyncHandler(async (req, res) => {
    const { ticketCost } = req.body;

    if (!ticketCost || ticketCost <= 0) {
      throw new APIError("Invalid ticket cost", 400, "VALIDATION_ERROR");
    }

    const poolBalance = await solanaService.getPoolBalance();
    const gameResult = casinoEngine.calculateWin(ticketCost, poolBalance);

    res.json({
      canPlay: poolBalance > casinoEngine.getMinPoolReserve() + ticketCost,
      poolBalance,
      maxPayout: gameResult.maxPayout,
      currentWinRate: gameResult.adjustedWinRate,
      isPoolHealthy: casinoEngine.isPoolHealthy(poolBalance),
      reason: gameResult.reason || null,
    });
  }));

  // Get player's game history
  app.get("/api/games/:wallet", rateLimiters.general, validateWalletAddress, asyncHandler(async (req, res) => {
    const { wallet } = req.params;
    const games = await storage.getGamesByWallet(wallet);
    res.json(games);
  }));

  // Pool balance endpoint
  app.get("/api/pool/balance", rateLimiters.general, asyncHandler(async (_req, res) => {
    const balance = await solanaService.getPoolBalance();
    res.json({
      balance,
      poolWallet: solanaService.getPoolWalletAddress(),
    });
  }));

  // Jackpot endpoints
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
