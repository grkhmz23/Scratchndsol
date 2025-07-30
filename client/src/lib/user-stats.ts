import { PublicKey } from '@solana/web3.js';

export interface GamePlay {
  id: string;
  timestamp: number;
  walletAddress: string;
  cardType: string;
  solAmount: number;
  isWin: boolean;
  prizeAmount: number;
  symbols?: string[];
  multiplier?: number;
}

export interface UserStats {
  totalCards: number;
  totalSOLInvested: number;
  wins: number;
  losses: number;
  biggestWin: number;
  winRate: number;
  gameHistory: GamePlay[];
}

const STORAGE_KEY_PREFIX = 'scratch-sol-stats-';

export class UserStatsManager {
  private walletAddress: string;
  private storageKey: string;

  constructor(publicKey: PublicKey) {
    this.walletAddress = publicKey.toString();
    this.storageKey = `${STORAGE_KEY_PREFIX}${this.walletAddress}`;
  }

  // Get user stats from localStorage
  getStats(): UserStats {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }

    // Return default stats
    return {
      totalCards: 0,
      totalSOLInvested: 0,
      wins: 0,
      losses: 0,
      biggestWin: 0,
      winRate: 0,
      gameHistory: []
    };
  }

  // Save stats to localStorage
  private saveStats(stats: UserStats): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(stats));
    } catch (error) {
      console.error('Error saving user stats:', error);
    }
  }

  // Record a new game play
  recordGamePlay(gamePlay: Omit<GamePlay, 'id' | 'timestamp' | 'walletAddress'>): void {
    const stats = this.getStats();
    
    const newGamePlay: GamePlay = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      walletAddress: this.walletAddress,
      ...gamePlay
    };

    // Update stats
    stats.totalCards += 1;
    stats.totalSOLInvested += gamePlay.solAmount;
    
    if (gamePlay.isWin) {
      stats.wins += 1;
      if (gamePlay.prizeAmount > stats.biggestWin) {
        stats.biggestWin = gamePlay.prizeAmount;
      }
    } else {
      stats.losses += 1;
    }

    // Calculate win rate
    stats.winRate = stats.totalCards > 0 ? (stats.wins / stats.totalCards) * 100 : 0;

    // Add to history (keep last 50 games)
    stats.gameHistory.unshift(newGamePlay);
    if (stats.gameHistory.length > 50) {
      stats.gameHistory = stats.gameHistory.slice(0, 50);
    }

    this.saveStats(stats);
    
    console.log('Game play recorded:', newGamePlay);
    console.log('Updated stats:', stats);
  }

  // Get formatted stats for display
  getFormattedStats(): {
    totalCards: string;
    totalSOLInvested: string;
    wins: string;
    losses: string;
    biggestWin: string;
    winRate: string;
    recentGames: GamePlay[];
  } {
    const stats = this.getStats();
    
    return {
      totalCards: stats.totalCards.toString(),
      totalSOLInvested: stats.totalSOLInvested.toFixed(3),
      wins: stats.wins.toString(),
      losses: stats.losses.toString(),
      biggestWin: stats.biggestWin.toFixed(3),
      winRate: stats.winRate.toFixed(1),
      recentGames: stats.gameHistory.slice(0, 10)
    };
  }

  // Clear all stats (for testing or reset)
  clearStats(): void {
    localStorage.removeItem(this.storageKey);
  }
}

// Utility function to get stats manager for current wallet
export function getUserStatsManager(publicKey: PublicKey | null): UserStatsManager | null {
  if (!publicKey) return null;
  return new UserStatsManager(publicKey);
}

// Format date for display
export function formatGameDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Get card type display name
export function getCardTypeDisplay(cardType: string): string {
  const typeMap: Record<string, string> = {
    'starter': 'Starter (0.1 SOL)',
    'bronze': 'Bronze (0.25 SOL)',
    'silver': 'Silver (0.5 SOL)',
    'gold': 'Gold (0.75 SOL)',
    'platinum': 'Platinum (1.0 SOL)'
  };
  return typeMap[cardType] || cardType;
}