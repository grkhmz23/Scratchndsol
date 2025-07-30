import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  LAMPORTS_PER_SOL,
  SendTransactionError 
} from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { proxyRPC } from '@/lib/rpc-service';

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
    console.log('🔍 INVESTIGATION: purchaseTicket called');
    console.log('🔍 Wallet publicKey:', wallet.publicKey?.toString());
    console.log('🔍 Connection RPC endpoint:', connection.rpcEndpoint);
    console.log('🔍 VITE_SOLANA_RPC_URL:', import.meta.env.VITE_SOLANA_RPC_URL);
    
    // Manual test of connection.getLatestBlockhash()
    console.log('🔍 INVESTIGATION: Testing manual connection.getLatestBlockhash()...');
    try {
      const testBlockhash = await connection.getLatestBlockhash('finalized');
      console.log('✅ Manual blockhash test successful:', testBlockhash);
    } catch (error) {
      console.error('❌ Manual getLatestBlockhash() failed:', error);
      console.error('❌ This confirms the connection object is problematic');
    }
    
    if (!wallet.publicKey || !wallet.sendTransaction) {
      return { success: false, error: 'Wallet not connected or does not support transactions' };
    }

    // Convert SOL to lamports - user pays exactly the ticket cost
    const ticketLamports = Math.floor(ticketCost * LAMPORTS_PER_SOL);
    const poolAmount = Math.floor(ticketLamports * 0.9); // 90% of ticket cost to pool
    const teamAmount = Math.floor(ticketLamports * 0.1); // 10% of ticket cost to team
    
    console.log('💰 PAYMENT BREAKDOWN:');
    console.log(`💰 Ticket cost: ${ticketCost} SOL (${ticketLamports} lamports)`);
    console.log(`💰 Pool gets: ${poolAmount / LAMPORTS_PER_SOL} SOL (${poolAmount} lamports)`);
    console.log(`💰 Team gets: ${teamAmount / LAMPORTS_PER_SOL} SOL (${teamAmount} lamports)`);

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

    // Check user balance before proceeding using proxy RPC
    const userBalanceSOL = await proxyRPC.getBalance(wallet.publicKey);
    const userBalance = Math.floor(userBalanceSOL * LAMPORTS_PER_SOL);
    
    console.log('💰 BALANCE CHECK:');
    console.log(`💰 User balance: ${userBalanceSOL} SOL (${userBalance} lamports)`);
    
    // Get current fee estimate using proxy RPC
    console.log('🔍 INVESTIGATION: Fetching blockhash via proxy RPC...');
    let blockhashInfo;
    try {
      blockhashInfo = await proxyRPC.getRecentBlockhash();
      console.log('✅ Blockhash fetched via proxy:', blockhashInfo);
    } catch (error) {
      console.error('❌ Proxy RPC getRecentBlockhash() failed:', error);
      throw new Error(`Failed to get recent blockhash via proxy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    const estimatedFee = 10000; // Conservative estimate for 2 transfers
    const requiredLamports = ticketLamports + estimatedFee; // User only needs ticket cost + fees
    
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

    // Get recent blockhash using proxy RPC
    console.log('🔍 INVESTIGATION: Setting transaction blockhash...');
    console.log('🔍 Raw blockhash info:', blockhashInfo);
    
    // Extract blockhash from the correct structure (result.value.blockhash)
    const blockhash = blockhashInfo?.value?.blockhash;
    if (!blockhash) {
      throw new Error(`No blockhash received from proxy RPC. Received: ${JSON.stringify(blockhashInfo)}`);
    }
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;
    console.log('✅ Transaction blockhash set:', blockhash);

    // Send transaction using wallet adapter with proper error handling
    console.log('🔍 INVESTIGATION: Sending transaction via wallet.sendTransaction...');
    let signature;
    try {
      signature = await wallet.sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      });
      console.log('✅ Transaction sent, signature:', signature);
    } catch (error) {
      console.error('❌ wallet.sendTransaction() failed:', error);
      throw error;
    }
    
    // Wait for confirmation - use proxy RPC for consistent confirmation
    console.log('🔍 INVESTIGATION: Confirming transaction via proxy RPC...');
    console.log('🔍 Transaction signature:', signature);
    
    try {
      // Use a simpler confirmation approach - just check transaction status
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds maximum wait
      
      while (!confirmed && attempts < maxAttempts) {
        try {
          // Check transaction status via proxy
          const status = await proxyRPC.makeRPCCall('getSignatureStatus', [signature]);
          console.log(`🔍 Confirmation attempt ${attempts + 1}, status:`, status);
          
          if (status?.value) {
            if (status.value.err) {
              throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
            }
            if (status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized') {
              confirmed = true;
              console.log('✅ Transaction confirmed via proxy RPC');
              break;
            }
          }
        } catch (statusError) {
          console.log(`⚠️ Status check failed, attempt ${attempts + 1}:`, statusError);
        }
        
        attempts++;
        if (!confirmed && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        }
      }
      
      if (!confirmed) {
        console.log('⚠️ Transaction confirmation timeout, but may still succeed');
        // Don't throw error - transaction might still be processing
      }
    } catch (confirmError) {
      console.error('❌ Transaction confirmation failed:', confirmError);
      // Don't throw error here - transaction was sent and may still succeed
      console.log('⚠️ Proceeding despite confirmation error - transaction was submitted');
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