import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export class ProxyRPCService {
  private proxyUrl: string;

  constructor() {
    this.proxyUrl = '/api/rpc-proxy';
  }

  async makeRPCCall(method: string, params: any[] = []): Promise<any> {
    try {
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'RPC Error');
      }

      return data.result;
    } catch (error) {
      console.error(`RPC call failed for method ${method}:`, error);
      throw error;
    }
  }

  async getBalance(publicKey: PublicKey): Promise<number> {
    try {
      console.log('🔍 PROXY RPC: Getting balance for', publicKey.toString());
      const response = await this.makeRPCCall('getBalance', [
        publicKey.toString(),
        { commitment: 'confirmed' }
      ]);
      console.log('🔍 PROXY RPC: Raw balance response:', response);
      
      // Handle different response structures from getBalance
      let balanceLamports;
      if (typeof response === 'object' && response !== null) {
        if (response.value !== undefined) {
          balanceLamports = response.value; // Direct value response
        } else if (response.result && response.result.value !== undefined) {
          balanceLamports = response.result.value; // Nested result.value response
        } else {
          balanceLamports = response; // Fallback to raw response
        }
      } else {
        balanceLamports = response; // Raw number response
      }
      
      const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
      console.log('🔍 PROXY RPC: Converted balance:', balanceSOL, 'SOL');
      return balanceSOL;
    } catch (error) {
      console.error('Failed to get balance via proxy:', error);
      throw error;
    }
  }

  async getAccountInfo(publicKey: PublicKey): Promise<any> {
    return this.makeRPCCall('getAccountInfo', [
      publicKey.toString(),
      { encoding: 'base64', commitment: 'confirmed' }
    ]);
  }

  async getRecentBlockhash(): Promise<any> {
    return this.makeRPCCall('getLatestBlockhash', [{ commitment: 'confirmed' }]);
  }

  async sendTransaction(signedTransaction: string): Promise<string> {
    return this.makeRPCCall('sendTransaction', [
      signedTransaction,
      { skipPreflight: false, preflightCommitment: 'confirmed' }
    ]);
  }

  async confirmTransaction(signature: string): Promise<any> {
    return this.makeRPCCall('confirmTransaction', [
      signature,
      { commitment: 'confirmed' }
    ]);
  }
}

// Singleton instance
export const proxyRPC = new ProxyRPCService();