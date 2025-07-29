import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  LAMPORTS_PER_SOL,
  SendTransactionError 
} from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

interface PurchaseTicketParams {
  wallet: WalletContextState;
  connection: Connection;
  ticketCost: number; // SOL amount
  poolWallet: string;
  teamWallet: string;
}

interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export async function purchaseTicket({
  wallet,
  connection,
  ticketCost,
  poolWallet,
  teamWallet
}: PurchaseTicketParams): Promise<TransactionResult> {
  try {
    if (!wallet.publicKey || !wallet.sendTransaction) {
      return { success: false, error: 'Wallet not connected or does not support transactions' };
    }

    // Convert SOL to lamports
    const totalLamports = Math.floor(ticketCost * LAMPORTS_PER_SOL);
    const poolAmount = Math.floor(totalLamports * 0.9); // 90% to pool
    const teamAmount = totalLamports - poolAmount; // 10% to team

    // Create transaction
    const transaction = new Transaction();

    // Validate wallet addresses before creating PublicKey objects
    let poolPublicKey: PublicKey;
    let teamPublicKey: PublicKey;
    
    try {
      if (!poolWallet || poolWallet.trim() === '') {
        throw new Error('Pool wallet address is required');
      }
      poolPublicKey = new PublicKey(poolWallet);
    } catch (error) {
      return { success: false, error: 'Invalid pool wallet address' };
    }
    
    try {
      if (!teamWallet || teamWallet.trim() === '') {
        throw new Error('Team wallet address is required');
      }
      teamPublicKey = new PublicKey(teamWallet);
    } catch (error) {
      return { success: false, error: 'Invalid team wallet address' };
    }

    // Check user balance before proceeding with better fee estimation
    const userBalance = await connection.getBalance(wallet.publicKey);
    
    // Get current fee estimate (more accurate than hardcoded 5000)
    const { feeCalculator } = await connection.getRecentBlockhash();
    const estimatedFee = feeCalculator ? feeCalculator.lamportsPerSignature * 2 : 10000; // 2 transfers = 2 signatures
    const requiredLamports = totalLamports + estimatedFee;
    
    if (userBalance < requiredLamports) {
      return { 
        success: false, 
        error: `Insufficient balance. Need ${(requiredLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL, have ${(userBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL` 
      };
    }

    // Add transfer to pool wallet (90%)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: poolPublicKey,
        lamports: poolAmount,
      })
    );

    // Add transfer to team wallet (10%)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: teamPublicKey,
        lamports: teamAmount,
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Send transaction using wallet adapter with proper error handling
    const signature = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });
    
    // Wait for confirmation with timeout and proper error handling
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
    }, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
    }

    return { success: true, signature };

  } catch (error) {
    console.error('Purchase transaction failed:', error);
    
    let errorMessage = 'Transaction failed';
    if (error instanceof SendTransactionError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
}

export async function checkTransactionStatus(
  connection: Connection,
  signature: string
): Promise<{ confirmed: boolean; error?: string }> {
  try {
    const status = await connection.getSignatureStatus(signature);
    
    if (status.value?.err) {
      return { confirmed: false, error: 'Transaction failed' };
    }
    
    return { confirmed: status.value?.confirmationStatus === 'confirmed' };
  } catch (error) {
    return { confirmed: false, error: 'Failed to check transaction status' };
  }
}

export function formatTransactionUrl(signature: string, cluster: string = 'mainnet'): string {
  const clusterParam = cluster === 'mainnet' ? '' : `?cluster=${cluster}`;
  return `https://solscan.io/tx/${signature}${clusterParam}`;
}