import { type Game, type InsertGame, type GameStats, type InsertGameStats } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Game operations
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: string): Promise<Game | undefined>;
  getGamesByWallet(wallet: string): Promise<Game[]>;
  getRecentWins(limit?: number): Promise<Game[]>;
  updateGamePayout(id: string, payoutSignature: string): Promise<void>;
  
  // Stats operations
  getStats(): Promise<GameStats | undefined>;
  updateStats(stats: Partial<InsertGameStats>): Promise<void>;
}

export class MemStorage implements IStorage {
  private games: Map<string, Game>;
  private stats: GameStats | undefined;

  constructor() {
    this.games = new Map();
    this.stats = {
      id: randomUUID(),
      totalPool: "0",
      totalWins: 0,
      lastWinAmount: "0",
      updatedAt: new Date(),
    };
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = randomUUID();
    const game: Game = { 
      ...insertGame,
      id,
      createdAt: new Date(),
      isWin: insertGame.isWin || false,
      multiplier: insertGame.multiplier || 0,
      winAmount: insertGame.winAmount || "0",
      payoutSignature: insertGame.payoutSignature || null,
    };
    this.games.set(id, game);
    
    // Update pool if it's a purchase
    if (insertGame.purchaseSignature) {
      const poolIncrease = parseFloat(insertGame.ticketType) * 0.9; // 90% goes to pool
      const currentPool = parseFloat(this.stats?.totalPool || "0");
      await this.updateStats({ 
        totalPool: (currentPool + poolIncrease).toString(),
      });
    }
    
    return game;
  }

  async getGame(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async getGamesByWallet(wallet: string): Promise<Game[]> {
    return Array.from(this.games.values()).filter(
      (game) => game.playerWallet === wallet,
    );
  }

  async getRecentWins(limit = 10): Promise<Game[]> {
    return Array.from(this.games.values())
      .filter(game => game.isWin)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async updateGamePayout(id: string, payoutSignature: string): Promise<void> {
    const game = this.games.get(id);
    if (game) {
      game.payoutSignature = payoutSignature;
      this.games.set(id, game);
    }
  }

  async getStats(): Promise<GameStats | undefined> {
    return this.stats;
  }

  async updateStats(updates: Partial<InsertGameStats>): Promise<void> {
    if (this.stats) {
      this.stats = {
        ...this.stats,
        ...updates,
        updatedAt: new Date(),
      };
      
      if (updates.totalWins !== undefined) {
        this.stats.totalWins = updates.totalWins;
      }
    }
  }
}

export const storage = new MemStorage();
