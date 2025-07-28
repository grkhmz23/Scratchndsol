import { 
  Connection, 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import bs58 from 'bs58';

export class SolanaService {
  private connection: Connection;
  private poolWallet: Keypair;

  constructor() {
    // Initialize connection
    const rpcUrl = process.env.SOLANA_RPC_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com');
    
    this.connection = new Connection(rpcUrl, 'confirmed');

    // Initialize pool wallet from private key
    const poolPrivateKey = process.env.POOL_WALLET_PRIVATE_KEY;
    if (!poolPrivateKey) {
      throw new Error('POOL_WALLET_PRIVATE_KEY environment variable is required');
    }

    try {
      // Try parsing as base58 first, then as JSON array
      let secretKey: Uint8Array;
      if (poolPrivateKey.startsWith('[')) {
        secretKey = new Uint8Array(JSON.parse(poolPrivateKey));
      } else {
        secretKey = bs58.decode(poolPrivateKey);
      }
      
      this.poolWallet = Keypair.fromSecretKey(secretKey);
    } catch (error) {
      throw new Error('Invalid POOL_WALLET_PRIVATE_KEY format');
    }
  }

  async sendPayout(playerWallet: string, amountSol: number): Promise<string | null> {
    try {
      // Check if this is a demo wallet (starts with "Demo")
      if (playerWallet.startsWith('Demo')) {
        // Simulate successful payout for demo mode
        const demoSignature = `demo_payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`Demo payout simulated: ${amountSol} SOL to ${playerWallet}, signature: ${demoSignature}`);
        return demoSignature;
      }

      const playerPublicKey = new PublicKey(playerWallet);
      const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

      // Check pool wallet balance
      const poolBalance = await this.connection.getBalance(this.poolWallet.publicKey);
      if (poolBalance < lamports + 5000) { // 5000 lamports for transaction fee
        console.error('Insufficient pool balance for payout');
        return null;
      }

      // Create transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.poolWallet.publicKey,
          toPubkey: playerPublicKey,
          lamports,
        })
      );

      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.poolWallet],
        { commitment: 'confirmed' }
      );

      console.log(`Payout sent: ${amountSol} SOL to ${playerWallet}, signature: ${signature}`);
      return signature;
    } catch (error) {
      console.error('Error sending payout:', error);
      return null;
    }
  }

  async getPoolBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.poolWallet.publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error fetching pool balance:', error);
      return 0;
    }
  }

  getPoolWalletAddress(): string {
    return this.poolWallet.publicKey.toString();
  }
}
