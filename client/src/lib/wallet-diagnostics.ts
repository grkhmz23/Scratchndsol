import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

export async function testWalletConnection(publicKey: PublicKey) {
  const results = {
    mainEndpoint: null as any,
    fallbackEndpoint: null as any,
    customEndpoint: null as any,
    recommendations: [] as string[]
  };

  // Test custom RPC endpoint if available
  const customRPC = import.meta.env.VITE_SOLANA_RPC_URL;
  if (customRPC) {
    console.log(`Testing custom RPC endpoint: ${customRPC}`);
    try {
      const connection = new Connection(customRPC, 'confirmed');
      const balance = await connection.getBalance(publicKey, 'confirmed');
      results.customEndpoint = {
        endpoint: customRPC,
        success: true,
        balance: balance / LAMPORTS_PER_SOL,
        latency: Date.now()
      };
      console.log(`Custom RPC Success: ${balance / LAMPORTS_PER_SOL} SOL`);
    } catch (error) {
      results.customEndpoint = {
        endpoint: customRPC,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error(`Custom RPC failed:`, error);
      results.recommendations.push('Custom RPC endpoint is not working. Try using the public mainnet endpoint.');
    }
  }

  // Test mainnet-beta public endpoint
  const mainnetEndpoint = 'https://api.mainnet-beta.solana.com';
  console.log(`Testing mainnet-beta endpoint: ${mainnetEndpoint}`);
  try {
    const connection = new Connection(mainnetEndpoint, 'confirmed');
    const balance = await connection.getBalance(publicKey, 'confirmed');
    results.mainEndpoint = {
      endpoint: mainnetEndpoint,
      success: true,
      balance: balance / LAMPORTS_PER_SOL,
      latency: Date.now()
    };
    console.log(`Mainnet-beta Success: ${balance / LAMPORTS_PER_SOL} SOL`);
  } catch (error) {
    results.mainEndpoint = {
      endpoint: mainnetEndpoint,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    console.error(`Mainnet-beta failed:`, error);
  }

  // Test cluster API fallback
  const networkSetting = import.meta.env.VITE_SOLANA_NETWORK;
  const network = (networkSetting === 'mainnet' || networkSetting === 'mainnet-beta')
    ? WalletAdapterNetwork.Mainnet 
    : WalletAdapterNetwork.Devnet;
  const fallbackEndpoint = clusterApiUrl(network);
  
  if (fallbackEndpoint !== mainnetEndpoint && fallbackEndpoint !== customRPC) {
    console.log(`Testing fallback endpoint: ${fallbackEndpoint}`);
    try {
      const connection = new Connection(fallbackEndpoint, 'confirmed');
      const balance = await connection.getBalance(publicKey, 'confirmed');
      results.fallbackEndpoint = {
        endpoint: fallbackEndpoint,
        success: true,
        balance: balance / LAMPORTS_PER_SOL,
        latency: Date.now()
      };
      console.log(`Fallback Success: ${balance / LAMPORTS_PER_SOL} SOL`);
    } catch (error) {
      results.fallbackEndpoint = {
        endpoint: fallbackEndpoint,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error(`Fallback failed:`, error);
    }
  }

  // Generate recommendations
  if (!results.customEndpoint?.success && !results.mainEndpoint?.success && !results.fallbackEndpoint?.success) {
    results.recommendations.push('All RPC endpoints failed. Check internet connection and wallet address validity.');
  } else if (results.mainEndpoint?.success && !results.customEndpoint?.success) {
    results.recommendations.push('Public mainnet endpoint works. Consider using it as primary or check custom RPC configuration.');
  }

  console.log('Wallet Connection Diagnostic Results:', results);
  return results;
}

export function getBestWorkingEndpoint(): string {
  const customRPC = import.meta.env.VITE_SOLANA_RPC_URL;
  const networkSetting = import.meta.env.VITE_SOLANA_NETWORK;
  const network = (networkSetting === 'mainnet' || networkSetting === 'mainnet-beta')
    ? WalletAdapterNetwork.Mainnet 
    : WalletAdapterNetwork.Devnet;

  // Priority order: custom RPC, then mainnet-beta, then cluster API
  const endpoints = [
    customRPC,
    'https://api.mainnet-beta.solana.com',
    clusterApiUrl(network)
  ].filter(Boolean);

  return endpoints[0] || 'https://api.mainnet-beta.solana.com';
}