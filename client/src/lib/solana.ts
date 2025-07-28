import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

export const connection = new Connection(
  import.meta.env.VITE_SOLANA_RPC_URL || 
  (import.meta.env.VITE_SOLANA_NETWORK === 'mainnet' 
    ? 'https://api.mainnet-beta.solana.com' 
    : 'https://api.devnet.solana.com'),
  'confirmed'
);

export const TEAM_WALLET = new PublicKey(
  import.meta.env.VITE_TEAM_WALLET || 'GJRSoWzLp2YXvn7JYKq5wMpZGNCPgUb7WuFNhW9F4BrL'
);

export const POOL_WALLET = new PublicKey(
  import.meta.env.VITE_POOL_WALLET || 'PoolWa11etAddressHereForScratchNSo1Game123456789'
);

export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export async function createPurchaseTransaction(
  fromPubkey: PublicKey,
  amount: number
): Promise<Transaction> {
  const transaction = new Transaction();
  
  const teamAmount = Math.round(amount * 0.1 * LAMPORTS_PER_SOL);
  const poolAmount = Math.round(amount * 0.9 * LAMPORTS_PER_SOL);

  // Transfer 10% to team wallet
  transaction.add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey: TEAM_WALLET,
      lamports: teamAmount,
    })
  );

  // Transfer 90% to pool wallet
  transaction.add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey: POOL_WALLET,
      lamports: poolAmount,
    })
  );

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  return transaction;
}

export async function getWalletBalance(publicKey: PublicKey): Promise<number> {
  try {
    const balance = await connection.getBalance(publicKey);
    return lamportsToSol(balance);
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return 0;
  }
}

export async function confirmTransaction(signature: string): Promise<boolean> {
  try {
    const result = await connection.confirmTransaction(signature, 'confirmed');
    return !result.value.err;
  } catch (error) {
    console.error('Error confirming transaction:', error);
    return false;
  }
}
