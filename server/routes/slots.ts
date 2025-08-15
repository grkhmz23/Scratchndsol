import { Router } from 'express';
import { z } from 'zod';
import { Connection, PublicKey, Keypair, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

const router = Router();

// Validation schemas
const quoteSchema = z.object({
  wallet: z.string(),
  betLamports: z.number().min(100000000), // Minimum 0.1 SOL
  expectedMaxWin: z.number().min(0)
});

const payoutSchema = z.object({
  wallet: z.string(),
  payoutLamports: z.number().min(0),
  spinHash: z.string(),
  timestamp: z.number()
});

// Game configuration
const GAME_CONFIG = {
  RESERVE_SOL: 0.2,
  MAX_BET_SOL: 0.5,
  MIN_BET_SOL: 0.1,
  TEAM_FEE_PERCENTAGE: 0.1,
  POOL_FEE_PERCENTAGE: 0.9
};

// Initialize Solana connection
const getConnection = () => {
  const rpcUrl = process.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  return new Connection(rpcUrl, 'confirmed');
};

// Get wallet keypairs from environment
const getPoolWallet = (): Keypair => {
  const privateKeyString = process.env.POOL_WALLET_PRIVATE_KEY;
  if (!privateKeyString) {
    throw new Error('POOL_WALLET_PRIVATE_KEY not configured');
  }
  
  try {
    const privateKeyBytes = bs58.decode(privateKeyString);
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    throw new Error('Invalid POOL_WALLET_PRIVATE_KEY format');
  }
};

const getTeamWallet = (): PublicKey => {
  const teamWalletString = process.env.VITE_TEAM_WALLET;
  if (!teamWalletString) {
    throw new Error('VITE_TEAM_WALLET not configured');
  }
  
  try {
    return new PublicKey(teamWalletString);
  } catch (error) {
    throw new Error('Invalid VITE_TEAM_WALLET format');
  }
};

// Get current pool balance
router.get('/balance', async (req, res) => {
  try {
    const connection = getConnection();
    const poolWallet = getPoolWallet();
    
    const balance = await connection.getBalance(poolWallet.publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    
    res.json({
      balance: balanceSOL,
      balanceLamports: balance,
      reserveSOL: GAME_CONFIG.RESERVE_SOL,
      availableForPayouts: Math.max(0, balanceSOL - GAME_CONFIG.RESERVE_SOL)
    });
  } catch (error) {
    console.error('Error fetching pool balance:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pool balance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Quote endpoint - check if bet is allowed
router.post('/quote', async (req, res) => {
  try {
    const { wallet, betLamports, expectedMaxWin } = quoteSchema.parse(req.body);
    
    // Validate wallet address
    try {
      new PublicKey(wallet);
    } catch {
      return res.status(400).json({
        status: 'INVALID_WALLET',
        message: 'Invalid wallet address'
      });
    }
    
    // Check bet limits
    const betSOL = betLamports / LAMPORTS_PER_SOL;
    if (betSOL < GAME_CONFIG.MIN_BET_SOL || betSOL > GAME_CONFIG.MAX_BET_SOL) {
      return res.status(400).json({
        status: 'INVALID_BET',
        message: `Bet must be between ${GAME_CONFIG.MIN_BET_SOL} and ${GAME_CONFIG.MAX_BET_SOL} SOL`
      });
    }
    
    // Get current pool balance
    const connection = getConnection();
    const poolWallet = getPoolWallet();
    const poolBalance = await connection.getBalance(poolWallet.publicKey);
    const poolBalanceSOL = poolBalance / LAMPORTS_PER_SOL;
    
    // Check if pool can cover maximum potential win
    const maxWinSOL = expectedMaxWin / LAMPORTS_PER_SOL;
    const availableBalance = poolBalanceSOL - GAME_CONFIG.RESERVE_SOL;
    
    if (maxWinSOL > availableBalance) {
      return res.json({
        status: 'LOW_POOL',
        message: `Pool balance too low for this bet. Maximum win (${maxWinSOL.toFixed(2)} SOL) exceeds available balance (${availableBalance.toFixed(2)} SOL)`,
        suggestedMaxBet: Math.floor(availableBalance / 20 * 10) / 10 // Conservative suggestion
      });
    }
    
    res.json({
      status: 'OK',
      message: 'Bet approved',
      poolBalance: poolBalanceSOL,
      maxWin: maxWinSOL,
      availableBalance
    });
    
  } catch (error) {
    console.error('Error in slots quote:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        errors: error.errors
      });
    }
    
    res.status(500).json({
      status: 'ERROR',
      message: 'Internal server error'
    });
  }
});

// Payout endpoint - send winnings to player
router.post('/payout', async (req, res) => {
  try {
    const { wallet, payoutLamports, spinHash, timestamp } = payoutSchema.parse(req.body);
    
    if (payoutLamports === 0) {
      return res.json({
        status: 'NO_PAYOUT',
        message: 'No payout required'
      });
    }
    
    // Validate wallet address
    let playerWallet: PublicKey;
    try {
      playerWallet = new PublicKey(wallet);
    } catch {
      return res.status(400).json({
        status: 'INVALID_WALLET',
        message: 'Invalid wallet address'
      });
    }
    
    // Get wallets and connection
    const connection = getConnection();
    const poolWallet = getPoolWallet();
    
    // Final solvency check
    const poolBalance = await connection.getBalance(poolWallet.publicKey);
    const requiredBalance = payoutLamports + (GAME_CONFIG.RESERVE_SOL * LAMPORTS_PER_SOL);
    
    if (poolBalance < requiredBalance) {
      return res.status(400).json({
        status: 'INSUFFICIENT_FUNDS',
        message: 'Pool balance insufficient for payout',
        poolBalance: poolBalance / LAMPORTS_PER_SOL,
        requiredBalance: requiredBalance / LAMPORTS_PER_SOL
      });
    }
    
    // Create payout transaction
    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: poolWallet.publicKey,
        toPubkey: playerWallet,
        lamports: payoutLamports
      })
    );
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = poolWallet.publicKey;
    
    // Sign and send transaction
    transaction.sign(poolWallet);
    const signature = await connection.sendRawTransaction(transaction.serialize());
    
    // Confirm transaction
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }
    
    // Log the successful payout
    console.log(`Slots payout: ${payoutLamports / LAMPORTS_PER_SOL} SOL to ${wallet}, tx: ${signature}`);
    
    res.json({
      status: 'SUCCESS',
      message: 'Payout sent successfully',
      signature,
      amount: payoutLamports / LAMPORTS_PER_SOL,
      recipient: wallet
    });
    
  } catch (error) {
    console.error('Error in slots payout:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        errors: error.errors
      });
    }
    
    res.status(500).json({
      status: 'ERROR',
      message: 'Payout failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Process bet transaction (handles the 90/10 split)
router.post('/process-bet', async (req, res) => {
  try {
    const { wallet, betLamports, signature } = z.object({
      wallet: z.string(),
      betLamports: z.number(),
      signature: z.string()
    }).parse(req.body);
    
    // Verify the transaction signature and amounts
    const connection = getConnection();
    const txInfo = await connection.getTransaction(signature, {
      commitment: 'confirmed'
    });
    
    if (!txInfo) {
      return res.status(400).json({
        status: 'INVALID_TRANSACTION',
        message: 'Transaction not found or not confirmed'
      });
    }
    
    // Validate that the transaction has the correct 90/10 split
    const poolWallet = getPoolWallet().publicKey;
    const teamWallet = getTeamWallet();
    
    const expectedPoolAmount = Math.floor(betLamports * GAME_CONFIG.POOL_FEE_PERCENTAGE);
    const expectedTeamAmount = Math.floor(betLamports * GAME_CONFIG.TEAM_FEE_PERCENTAGE);
    
    // Check transaction transfers
    let poolTransferFound = false;
    let teamTransferFound = false;
    
    // Parse transaction for transfers to pool and team wallets
    if (txInfo.meta?.postBalances && txInfo.meta?.preBalances) {
      const accountKeys = txInfo.transaction.message.accountKeys;
      
      accountKeys.forEach((key, index) => {
        const preBalance = txInfo.meta!.preBalances![index];
        const postBalance = txInfo.meta!.postBalances![index];
        const balanceChange = postBalance - preBalance;
        
        if (key.equals(poolWallet) && balanceChange >= expectedPoolAmount) {
          poolTransferFound = true;
        }
        if (key.equals(teamWallet) && balanceChange >= expectedTeamAmount) {
          teamTransferFound = true;
        }
      });
    }
    
    if (!poolTransferFound || !teamTransferFound) {
      return res.status(400).json({
        status: 'INVALID_SPLIT',
        message: 'Transaction does not contain correct 90/10 split',
        expectedPool: expectedPoolAmount,
        expectedTeam: expectedTeamAmount
      });
    }
    
    // Log the successful bet processing
    console.log(`Slots bet processed: ${betLamports / LAMPORTS_PER_SOL} SOL from ${wallet}, tx: ${signature}`);
    
    res.json({
      status: 'SUCCESS',
      message: 'Bet processed successfully',
      betAmount: betLamports / LAMPORTS_PER_SOL,
      poolAmount: expectedPoolAmount / LAMPORTS_PER_SOL,
      teamAmount: expectedTeamAmount / LAMPORTS_PER_SOL
    });
    
  } catch (error) {
    console.error('Error processing bet:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        errors: error.errors
      });
    }
    
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to process bet',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;