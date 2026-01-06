import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSchema } from "@shared/schema";
import { SolanaService } from "./services/solana";
import { casinoEngine } from "./services/casino-engine";
import { jackpotService } from "./services/jackpot";
import rateLimit from "express-rate-limit";

// Rate limiting configuration (H3 fix)
const createGameLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 games per minute per IP
  message: { error: 'Too many game creation requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const payoutLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 payout requests per minute per IP
  message: { error: 'Too many payout requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Pool wallet security limits (C3 fix)
const SECURITY_LIMITS = {
  MAX_SINGLE_PAYOUT: 10, // Maximum 10 SOL per single payout
  MAX_HOURLY_PAYOUT: 50, // Maximum 50 SOL per hour total
  MAX_DAILY_PAYOUT: 200, // Maximum 200 SOL per day total
};

// Track payouts for rate limiting (in-memory for now, should use Redis in production)
const payoutTracking = {
  hourly: [] as { timestamp: number; amount: number }[],
  daily: [] as { timestamp: number; amount: number }[],
};

function checkPayoutLimits(amount: number): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const oneHourAgo = now - 3600 * 1000;
  const oneDayAgo = now - 24 * 3600 * 1000;

  // Single payout limit
  if (amount > SECURITY_LIMITS.MAX_SINGLE_PAYOUT) {
    return { 
      allowed: false, 
      reason: `Single payout cannot exceed ${SECURITY_LIMITS.MAX_SINGLE_PAYOUT} SOL` 
    };
  }

  // Clean old entries
  payoutTracking.hourly = payoutTracking.hourly.filter(p => p.timestamp > oneHourAgo);
  payoutTracking.daily = payoutTracking.daily.filter(p => p.timestamp > oneDayAgo);

  // Check hourly limit
  const hourlyTotal = payoutTracking.hourly.reduce((sum, p) => sum + p.amount, 0);
  if (hourlyTotal + amount > SECURITY_LIMITS.MAX_HOURLY_PAYOUT) {
    return { 
      allowed: false, 
      reason: `Hourly payout limit of ${SECURITY_LIMITS.MAX_HOURLY_PAYOUT} SOL exceeded` 
    };
  }

  // Check daily limit
  const dailyTotal = payoutTracking.daily.reduce((sum, p) => sum + p.amount, 0);
  if (dailyTotal + amount > SECURITY_LIMITS.MAX_DAILY_PAYOUT) {
    return { 
      allowed: false, 
      reason: `Daily payout limit of ${SECURITY_LIMITS.MAX_DAILY_PAYOUT} SOL exceeded` 
    };
  }

  return { allowed: true };
}

function recordPayout(amount: number) {
  const now = Date.now();
  payoutTracking.hourly.push({ timestamp: now, amount });
  payoutTracking.daily.push({ timestamp: now, amount });
}

const solanaService = new SolanaService();

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply general rate limiting to all routes
  app.use(generalLimiter);

  // Get game statistics with real blockchain pool balance
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();

      // Get real pool balance from blockchain wallet
      const poolBalance = await solanaService.getPoolBalance();

      res.json({
        totalPool: poolBalance.toString(),
        totalWins: stats?.totalWins || 0,
        lastWinAmount: stats?.lastWinAmount || "0",
        poolWallet: solanaService.getPoolWalletAddress(),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  /**
   * NEW SECURE GAME CREATION ENDPOINT (C1 + C2 fix)
   * This endpoint:
   * 1. Verifies the purchase transaction exists on-chain
   * 2. Validates transaction details (amount, recipient)
   * 3. Generates game outcome SERVER-SIDE with cryptographic RNG
   * 4. Stores the outcome in database
   * 5. Returns pre-determined result to client
   */
  app.post("/api/games/create-and-play", createGameLimiter, async (req, res) => {
    try {
      const { purchaseSignature, playerWallet, ticketCost } = req.body;

      // Validate required fields
      if (!purchaseSignature || !playerWallet || !ticketCost) {
        return res.status(400).json({ 
          error: "Missing required fields: purchaseSignature, playerWallet, ticketCost" 
        });
      }

      // Check if this is demo mode
      const isDemoMode = playerWallet.startsWith('Demo') || playerWallet.startsWith('demo');

      if (!isDemoMode) {
        // VERIFY TRANSACTION ON-CHAIN (C2 fix)
        console.log(`Verifying transaction: ${purchaseSignature}`);
        const txVerification = await solanaService.verifyTransaction(purchaseSignature);

        if (!txVerification.valid) {
          return res.status(400).json({ 
            error: "Invalid or not found transaction signature" 
          });
        }

        // Verify transaction details
        const expectedRecipient = solanaService.getPoolWalletAddress();
        if (txVerification.to !== expectedRecipient) {
          return res.status(400).json({ 
            error: "Transaction recipient does not match pool wallet" 
          });
        }

        // Verify amount matches ticket cost (allow 1% variance for fees)
        if (!txVerification.amount || 
            Math.abs(txVerification.amount - ticketCost) > ticketCost * 0.01) {
          return res.status(400).json({ 
            error: `Transaction amount (${txVerification.amount} SOL) does not match ticket cost (${ticketCost} SOL)` 
          });
        }

        console.log(`✅ Transaction verified: ${txVerification.amount} SOL from ${txVerification.from}`);
      }

      // Get current pool balance
      const poolBalance = await solanaService.getPoolBalance();

      // GENERATE GAME OUTCOME SERVER-SIDE (C1 + H5 fix)
      const gameResult = casinoEngine.calculateWin(ticketCost, poolBalance);

      // Create game record in database
      const gameData = {
        playerWallet,
        ticketType: ticketCost.toString(),
        maxWin: gameResult.maxPayout.toString(),
        symbols: gameResult.symbols,
        isWin: gameResult.canWin && gameResult.winAmount > 0,
        multiplier: gameResult.multiplier,
        winAmount: gameResult.winAmount.toString(),
        purchaseSignature: isDemoMode ? `demo_purchase_${Date.now()}` : purchaseSignature,
        payoutSignature: null,
      };

      const game = await storage.createGame(gameData);

      // Return pre-determined game outcome to client
      res.status(201).json({
        gameId: game.id,
        symbols: gameResult.symbols,
        isWin: gameResult.canWin && gameResult.winAmount > 0,
        multiplier: gameResult.multiplier,
        winAmount: gameResult.winAmount,
        maxPayout: gameResult.maxPayout,
      });

    } catch (error) {
      console.error("Error creating game:", error);
      res.status(500).json({ error: "Failed to create game" });
    }
  });

  // Get recent wins
  app.get("/api/games/recent-wins", async (req, res) => {
    try {
      const recentWins = await storage.getRecentWins(10);
      res.json(recentWins);
    } catch (error) {
      console.error("Error fetching recent wins:", error);
      res.status(500).json({ message: "Failed to fetch recent wins" });
    }
  });

  // Create a new game
  app.post("/api/games", async (req, res) => {
    try {
      const gameData = insertGameSchema.parse(req.body);
      const game = await storage.createGame(gameData);
      res.status(201).json(game);
    } catch (error) {
      console.error("Error creating game:", error);
      res.status(400).json({ message: "Invalid game data" });
    }
  });

  // RPC Proxy endpoint to avoid CORS and rate limiting issues
  app.post('/api/rpc-proxy', async (req, res) => {
    try {
      const heliusKey = process.env.HELIUS_API_KEY;

      // Priority order for RPC endpoints
      const endpoints = [
        heliusKey ? `https://rpc.helius.xyz/?api-key=${heliusKey}` : null,
        'https://api.mainnet-beta.solana.com',
        'https://ssc-dao.genesysgo.net/',
        'https://rpc.ankr.com/solana',
      ].filter(Boolean);

      let lastError;

      // Try each endpoint until one works
      for (const endpoint of endpoints) {
        if (!endpoint) continue;

        try {
          console.log(`Trying RPC endpoint: ${endpoint.includes('api-key') ? 'https://rpc.helius.xyz/?api-key=***' : endpoint}`);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body),
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`RPC request successful via ${endpoint.includes('api-key') ? 'Helius' : endpoint}`);
            return res.json(data);
          } else {
            const errorText = await response.text();
            lastError = `HTTP ${response.status}: ${errorText}`;
            console.log(`RPC endpoint failed: ${lastError}`);
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error';
          console.log(`RPC endpoint ${endpoint} failed: ${lastError}`);
          continue;
        }
      }

      // All endpoints failed
      console.error('All RPC endpoints failed:', lastError);
      res.status(503).json({
        error: 'RPC_UNAVAILABLE',
        message: 'All Solana RPC endpoints are currently unavailable',
        lastError
      });

    } catch (error) {
      console.error('RPC proxy error:', error);
      res.status(500).json({
        error: 'PROXY_ERROR',
        message: 'Internal server error in RPC proxy'
      });
    }
  });

  // Process payout for winning game (C2 + C3 fixes applied)
  app.post("/api/games/payout", payoutLimiter, async (req, res) => {
    try {
      const { playerWallet, winAmount, gameId } = req.body;

      if (!playerWallet || !winAmount || !gameId) {
        return res.status(400).json({ message: "Missing required fields: playerWallet, winAmount, gameId" });
      }

      // Verify this is not a demo wallet
      const isDemoMode = playerWallet.startsWith('demo') || playerWallet.startsWith('Demo');

      if (isDemoMode) {
        // Demo mode - simulate payout
        const demoSignature = `demo_payout_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        return res.json({ success: true, signature: demoSignature, demo: true });
      }

      // VERIFY GAME EXISTS AND BELONGS TO PLAYER (C2 fix)
      const game = await storage.getGameById(gameId);

      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      if (game.playerWallet !== playerWallet) {
        return res.status(403).json({ message: "Game does not belong to this wallet" });
      }

      if (!game.isWin) {
        return res.status(400).json({ message: "This game is not a winning game" });
      }

      if (game.payoutSignature) {
        return res.status(400).json({ message: "Payout already processed for this game" });
      }

      // Verify winAmount matches what was calculated server-side
      const expectedWinAmount = parseFloat(game.winAmount);
      const requestedWinAmount = parseFloat(winAmount);

      if (Math.abs(expectedWinAmount - requestedWinAmount) > 0.001) {
        return res.status(400).json({ 
          message: `Win amount mismatch. Expected: ${expectedWinAmount}, Requested: ${requestedWinAmount}` 
        });
      }

      // CHECK PAYOUT LIMITS (C3 fix)
      const payoutCheck = checkPayoutLimits(requestedWinAmount);
      if (!payoutCheck.allowed) {
        return res.status(429).json({ 
          message: payoutCheck.reason,
          error: 'PAYOUT_LIMIT_EXCEEDED'
        });
      }

      // Send payout using pool wallet
      const payoutSignature = await solanaService.sendPayout(
        playerWallet,
        requestedWinAmount
      );

      if (payoutSignature) {
        // Record payout for limit tracking
        recordPayout(requestedWinAmount);

        // Update win statistics only (pool balance is on blockchain)
        const currentStats = await storage.getStats();
        const currentWins = currentStats?.totalWins || 0;

        await storage.updateStats({
          totalWins: currentWins + 1,
          lastWinAmount: winAmount,
        });

        // Save payout signature to game record
        await storage.updateGamePayout(gameId, payoutSignature);

        res.json({ success: true, signature: payoutSignature });
      } else {
        res.status(500).json({ message: "Payout transaction failed" });
      }
    } catch (error) {
      console.error("Error processing payout:", error);
      res.status(500).json({ message: "Failed to process payout" });
    }
  });

  // Check if pool can support a game - uses real blockchain balance
  app.post("/api/pool/check", async (req, res) => {
    try {
      const { ticketCost } = req.body;

      if (!ticketCost || ticketCost <= 0) {
        return res.status(400).json({ 
          error: 'Invalid ticket cost',
          canPlay: false 
        });
      }

      // Get real pool balance from blockchain wallet
      const poolBalance = await solanaService.getPoolBalance();

      // Check if game can be played
      const gameResult = casinoEngine.calculateWin(ticketCost, poolBalance);
      const isHealthy = casinoEngine.isPoolHealthy(poolBalance);

      res.json({
        canPlay: poolBalance > casinoEngine.getMinPoolReserve() + ticketCost,
        poolBalance: poolBalance,
        maxPayout: gameResult.maxPayout,
        currentWinRate: gameResult.adjustedWinRate,
        isPoolHealthy: isHealthy,
        reason: gameResult.reason || null
      });

    } catch (error) {
      console.error('Pool check failed:', error);
      res.status(500).json({ 
        error: 'Failed to check pool status',
        canPlay: false
      });
    }
  });

  // Get player's game history
  app.get("/api/games/:wallet", async (req, res) => {
    try {
      const { wallet } = req.params;
      const games = await storage.getGamesByWallet(wallet);
      res.json(games);
    } catch (error) {
      console.error("Error fetching player games:", error);
      res.status(500).json({ message: "Failed to fetch player games" });
    }
  });

  // Pool balance endpoint
  app.get("/api/pool/balance", async (req, res) => {
    try {
      const payoutService = await import('./services/solana-payout');
      const service = payoutService.getPayoutService();
      const balance = await service.getPoolBalance();

      res.json({
        balance,
        poolWallet: service.getPoolPublicKey()
      });
    } catch (error) {
      console.error("Pool balance error:", error);
      res.status(500).json({ message: "Failed to get pool balance" });
    }
  });

  // Jackpot status endpoint
  app.get("/api/jackpot/status", async (_req, res) => {
    try {
      const status = await jackpotService.getStatus();
      res.json(status);
    } catch (e: any) {
      console.error("jackpot status error:", e);
      res.status(500).json({ message: e?.message || "Failed to load jackpot status" });
    }
  });

  // Get user's jackpot tickets
  app.get("/api/jackpot/tickets/:wallet", async (req, res) => {
    try {
      const wallet = req.params.wallet;
      const tickets = await jackpotService.getUserTickets(wallet);
      res.json({ tickets });
    } catch (e: any) {
      console.error("jackpot tickets error:", e);
      res.status(500).json({ message: e?.message || "Failed to load tickets" });
    }
  });

  // Record jackpot ticket purchase
  app.post("/api/jackpot/purchase", async (req, res) => {
    try {
      const { wallet, signature } = req.body || {};
      if (!wallet || !signature) return res.status(400).json({ message: "wallet and signature are required" });

      const result = await jackpotService.verifyAndRecordPurchase({ wallet, signature });
      res.json({ success: true, ...result });
    } catch (e: any) {
      console.error("jackpot purchase error:", e);
      res.status(400).json({ message: e?.message || "Failed to record purchase" });
    }
  });

  // Bags.fm quote proxy (optional - requires BAGS_API_KEY)
  app.get("/api/bags/quote", async (req, res) => {
    try {
      const apiKey = process.env.BAGS_API_KEY;
      if (!apiKey) return res.status(501).json({ message: "BAGS_API_KEY not configured" });

      const { inputMint, outputMint, amount } = req.query as any;
      if (!inputMint || !outputMint || !amount) {
        return res.status(400).json({ message: "inputMint, outputMint, amount required" });
      }

      const url = new URL("https://public-api-v2.bags.fm/api/v1/trade/quote");
      url.searchParams.set("inputMint", String(inputMint));
      url.searchParams.set("outputMint", String(outputMint));
      url.searchParams.set("amount", String(amount));

      const r = await fetch(url.toString(), {
        headers: { "x-api-key": apiKey },
      });

      const data = await r.json();
      if (!r.ok || !data?.success || !data?.response?.outAmount) {
        return res.status(400).json({ message: "Bags quote failed", raw: data });
      }

      // We compute an indicative SOL/token:
      // 1 SOL in lamports is amount, output outAmount is in base units with outputMintDecimals
      const out = data.response.outAmount as string;
      const outDecimals = data.response.routePlan?.[0]?.outputMintDecimals ?? 0;

      const inLamports = BigInt(String(amount));
      const outRaw = BigInt(out);
      if (outRaw === BigInt(0)) return res.json({ solPerToken: null });

      const outTokens = Number(outRaw) / 10 ** Number(outDecimals);
      const sol = Number(inLamports) / 1e9;
      const solPerToken = outTokens > 0 ? sol / outTokens : null;

      res.json({ solPerToken, raw: data.response });
    } catch (e: any) {
      console.error("bags quote error:", e);
      res.status(500).json({ message: e?.message || "Bags quote error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}