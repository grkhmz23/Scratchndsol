// Slots API client functions
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

export interface QuoteRequest {
  wallet: string;
  betLamports: number;
  expectedMaxWin: number;
}

export interface QuoteResponse {
  status: 'OK' | 'LOW_POOL' | 'INVALID_WALLET' | 'INVALID_BET';
  message: string;
  poolBalance?: number;
  maxWin?: number;
  availableBalance?: number;
  suggestedMaxBet?: number;
}

export interface PayoutRequest {
  wallet: string;
  payoutLamports: number;
  spinHash: string;
  timestamp: number;
}

export interface PayoutResponse {
  status: 'SUCCESS' | 'NO_PAYOUT' | 'INSUFFICIENT_FUNDS' | 'INVALID_WALLET' | 'ERROR';
  message: string;
  signature?: string;
  amount?: number;
  recipient?: string;
}

export interface ProcessBetRequest {
  wallet: string;
  betLamports: number;
  signature: string;
}

export interface ProcessBetResponse {
  status: 'SUCCESS' | 'INVALID_TRANSACTION' | 'INVALID_SPLIT' | 'ERROR';
  message: string;
  betAmount?: number;
  poolAmount?: number;
  teamAmount?: number;
}

export interface PoolBalanceResponse {
  balance: number;
  balanceLamports: number;
  reserveSOL: number;
  availableForPayouts: number;
}

export class SlotsAPI {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const response = await fetch(`${this.baseUrl}/api/slots/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Quote request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async requestPayout(request: PayoutRequest): Promise<PayoutResponse> {
    const response = await fetch(`${this.baseUrl}/api/slots/payout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Payout request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async processBet(request: ProcessBetRequest): Promise<ProcessBetResponse> {
    const response = await fetch(`${this.baseUrl}/api/slots/process-bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Process bet failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getPoolBalance(): Promise<PoolBalanceResponse> {
    const response = await fetch(`${this.baseUrl}/api/pool/balance`);

    if (!response.ok) {
      throw new Error(`Pool balance request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Helper function to create bet transaction with 90/10 split
  static createBetTransaction(
    playerPublicKey: PublicKey,
    poolWallet: PublicKey,
    teamWallet: PublicKey,
    betLamports: number
  ): Transaction {
    const transaction = new Transaction();
    
    // 90% to pool
    const poolAmount = Math.floor(betLamports * 0.9);
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: playerPublicKey,
        toPubkey: poolWallet,
        lamports: poolAmount,
      })
    );

    // 10% to team
    const teamAmount = Math.floor(betLamports * 0.1);
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: playerPublicKey,
        toPubkey: teamWallet,
        lamports: teamAmount,
      })
    );

    return transaction;
  }

  // Helper function to generate spin hash for verification
  static generateSpinHash(
    wallet: string,
    betAmount: number,
    timestamp: number,
    symbols: string[]
  ): string {
    const data = `${wallet}-${betAmount}-${timestamp}-${symbols.join(',')}`;
    // Simple hash function (in production, use crypto.subtle or similar)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

export const slotsAPI = new SlotsAPI();