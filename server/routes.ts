import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGameSchema } from "@shared/schema";
import { SolanaService } from "./services/solana";

const solanaService = new SolanaService();

export async function registerRoutes(app: Express): Promise<Server> {
  // Get game statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats || { totalPool: "0", totalWins: 0, lastWinAmount: "0" });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
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

  // Process payout for winning game
  app.post("/api/games/payout", async (req, res) => {
    try {
      const { playerWallet, winAmount, ticketCost } = req.body;
      
      if (!playerWallet || !winAmount || !ticketCost) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Send payout using pool wallet
      const payoutSignature = await solanaService.sendPayout(
        playerWallet,
        parseFloat(winAmount)
      );

      if (payoutSignature) {
        // Update stats
        const currentStats = await storage.getStats();
        const currentPool = parseFloat(currentStats?.totalPool || "0");
        const currentWins = currentStats?.totalWins || 0;
        
        await storage.updateStats({
          totalPool: Math.max(0, currentPool - parseFloat(winAmount)).toString(),
          totalWins: currentWins + 1,
          lastWinAmount: winAmount,
        });

        res.json({ success: true, signature: payoutSignature });
      } else {
        res.status(500).json({ message: "Payout transaction failed" });
      }
    } catch (error) {
      console.error("Error processing payout:", error);
      res.status(500).json({ message: "Failed to process payout" });
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

  const httpServer = createServer(app);
  return httpServer;
}
