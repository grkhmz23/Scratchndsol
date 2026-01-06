import { gameSymbols, multipliers } from '@shared/schema';
import { randomBytes } from 'crypto';

// Cryptographically secure random number generator
function secureRandom(): number {
  const bytes = randomBytes(8);
  const num = bytes.readBigUInt64BE();
  return Number(num) / Number(2n ** 64n);
}

interface CasinoConfig {
  houseEdge: number; // Percentage (e.g., 0.05 = 5%)
  minPoolReserve: number; // Minimum SOL to keep in pool
  maxPayoutRatio: number; // Max payout as ratio of pool balance
}

interface WinCalculation {
  canWin: boolean;
  baseWinRate: number;
  adjustedWinRate: number;
  maxPayout: number;
  symbols: string[];
  multiplier: number;
  winAmount: number;
  reason?: string;
}

export class CasinoEngine {
  private config: CasinoConfig = {
    houseEdge: 0.10, // 10% house edge
    minPoolReserve: 0.5, // Keep 0.5 SOL minimum
    maxPayoutRatio: 0.25, // Max payout = 25% of pool
  };

  // Base win rates by ticket tier (lower tiers = higher win rates)
  private baseWinRates: Record<number, number> = {
    0.1: 0.25, // 25% - Bronze
    0.2: 0.22, // 22% - Silver  
    0.5: 0.20, // 20% - Gold
    0.75: 0.18, // 18% - Platinum
    1.0: 0.15, // 15% - Diamond
  };

  calculateWin(ticketCost: number, poolBalance: number): WinCalculation {
    const baseWinRate = this.baseWinRates[ticketCost] || 0.15;
    const symbols = this.generateSymbols();
    const baseMultiplier = this.selectMultiplier();
    const baseWinAmount = ticketCost * baseMultiplier;

    // Check pool constraints
    const maxAllowedPayout = Math.max(
      (poolBalance - this.config.minPoolReserve) * this.config.maxPayoutRatio,
      0
    );

    // Can't win if pool is too low
    if (poolBalance < this.config.minPoolReserve + ticketCost) {
      return {
        canWin: false,
        baseWinRate,
        adjustedWinRate: 0,
        maxPayout: 0,
        symbols: ['❌', '❌', '❌'],
        multiplier: 0,
        winAmount: 0,
        reason: 'Insufficient pool balance'
      };
    }

    // Adjust win rate based on pool health
    const poolHealthRatio = poolBalance / (poolBalance + 10); // Normalize pool health
    const adjustedWinRate = baseWinRate * poolHealthRatio * (1 - this.config.houseEdge);

    // Cap payout to pool limits
    const cappedWinAmount = Math.min(baseWinAmount, maxAllowedPayout);
    const cappedMultiplier = Math.floor(cappedWinAmount / ticketCost);

    // Determine if this game wins
    const randomRoll = secureRandom();
    const shouldWin = randomRoll < adjustedWinRate;

    if (shouldWin && cappedWinAmount > 0) {
      return {
        canWin: true,
        baseWinRate,
        adjustedWinRate,
        maxPayout: maxAllowedPayout,
        symbols: this.generateWinningSymbols(),
        multiplier: Math.max(cappedMultiplier, 1),
        winAmount: cappedWinAmount,
      };
    }

    return {
      canWin: false,
      baseWinRate,
      adjustedWinRate,
      maxPayout: maxAllowedPayout,
      symbols: this.generateLosingSymbols(),
      multiplier: 0,
      winAmount: 0,
    };
  }

  private generateSymbols(): string[] {
    return Array.from({ length: 3 }, () => 
      gameSymbols[Math.floor(secureRandom() * gameSymbols.length)]
    );
  }

  private generateWinningSymbols(): string[] {
    const symbol = gameSymbols[Math.floor(secureRandom() * (gameSymbols.length - 1))]; // Exclude ❌ for wins
    return [symbol, symbol, symbol];
  }

  private generateLosingSymbols(): string[] {
    const symbols = this.generateSymbols();
    // Ensure they don't all match
    while (symbols.every(s => s === symbols[0])) {
      symbols[2] = gameSymbols[Math.floor(secureRandom() * gameSymbols.length)];
    }
    return symbols;
  }

  private selectMultiplier(): number {
    // Weighted selection favoring lower multipliers
    const weights = [50, 30, 15, 5]; // 1x=50%, 2x=30%, 5x=15%, 10x=5%
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const random = secureRandom() * totalWeight;

    let weightSum = 0;
    for (let i = 0; i < weights.length; i++) {
      weightSum += weights[i];
      if (random <= weightSum) {
        return multipliers[i];
      }
    }
    return multipliers[0]; // Fallback to 1x
  }

  // Utility methods for frontend display
  getHouseEdge(): number {
    return this.config.houseEdge;
  }

  getMinPoolReserve(): number {
    return this.config.minPoolReserve;
  }

  getWinRateInfo(ticketCost: number, poolBalance: number): {
    baseRate: number;
    currentRate: number;
    maxPayout: number;
  } {
    const calculation = this.calculateWin(ticketCost, poolBalance);
    return {
      baseRate: calculation.baseWinRate,
      currentRate: calculation.adjustedWinRate,
      maxPayout: calculation.maxPayout,
    };
  }

  isPoolHealthy(poolBalance: number): boolean {
    return poolBalance > this.config.minPoolReserve * 2;
  }
}

// Singleton instance
export const casinoEngine = new CasinoEngine();