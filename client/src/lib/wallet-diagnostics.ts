import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

export async function testWalletConnection(publicKey: PublicKey) {
  const results = {
    heliusEndpoint: null as any,
    genesysEndpoint: null as any,
    ankerEndpoint: null as any,
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

  // Test Helius endpoint if available
  const heliusKey = import.meta.env.HELIUS_API_KEY;
  if (heliusKey) {
    const heliusEndpoint = `https://rpc.helius.xyz/?api-key=${heliusKey}`;
    console.log(`Testing Helius endpoint: https://rpc.helius.xyz/?api-key=***`);
    try {
      const connection = new Connection(heliusEndpoint, 'confirmed');
      const balance = await connection.getBalance(publicKey, 'confirmed');
      results.heliusEndpoint = {
        endpoint: 'https://rpc.helius.xyz/',
        success: true,
        balance: balance / LAMPORTS_PER_SOL,
        latency: Date.now()
      };
      console.log(`Helius Success: ${balance / LAMPORTS_PER_SOL} SOL`);
    } catch (error) {
      results.heliusEndpoint = {
        endpoint: 'https://rpc.helius.xyz/',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      console.error(`Helius failed:`, error);
    }
  }

  // Test GenesysGo endpoint (reliable alternative)
  const genesysEndpoint = 'https://ssc-dao.genesysgo.net/';
  console.log(`Testing GenesysGo endpoint: ${genesysEndpoint}`);
  try {
    const connection = new Connection(genesysEndpoint, 'confirmed');
    const balance = await connection.getBalance(publicKey, 'confirmed');
    results.genesysEndpoint = {
      endpoint: genesysEndpoint,
      success: true,
      balance: balance / LAMPORTS_PER_SOL,
      latency: Date.now()
    };
    console.log(`GenesysGo Success: ${balance / LAMPORTS_PER_SOL} SOL`);
  } catch (error) {
    results.genesysEndpoint = {
      endpoint: genesysEndpoint,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    console.error(`GenesysGo failed:`, error);
  }

  // Test Ankr endpoint
  const ankerEndpoint = 'https://rpc.ankr.com/solana';
  console.log(`Testing Ankr endpoint: ${ankerEndpoint}`);
  try {
    const connection = new Connection(ankerEndpoint, 'confirmed');
    const balance = await connection.getBalance(publicKey, 'confirmed');
    results.ankerEndpoint = {
      endpoint: ankerEndpoint,
      success: true,
      balance: balance / LAMPORTS_PER_SOL,
      latency: Date.now()
    };
    console.log(`Ankr Success: ${balance / LAMPORTS_PER_SOL} SOL`);
  } catch (error) {
    results.ankerEndpoint = {
      endpoint: ankerEndpoint,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    console.error(`Ankr failed:`, error);
  }

  // All endpoints tested above - no additional fallback needed

  // Generate recommendations
  const workingEndpoints = [
    results.heliusEndpoint?.success,
    results.genesysEndpoint?.success,
    results.ankerEndpoint?.success,
    results.customEndpoint?.success
  ].filter(Boolean).length;

  if (workingEndpoints === 0) {
    results.recommendations.push('All RPC endpoints failed. Check internet connection and wallet address validity.');
  } else if (results.heliusEndpoint?.success) {
    results.recommendations.push('Helius RPC is working perfectly - best option for production.');
  } else if (results.genesysEndpoint?.success) {
    results.recommendations.push('GenesysGo RPC is working - good reliable alternative.');
  } else if (results.ankerEndpoint?.success) {
    results.recommendations.push('Ankr RPC is working - decent fallback option.');
  }

  console.log('Wallet Connection Diagnostic Results:', results);
  return results;
}

export function getBestWorkingEndpoint(): string {
  const heliusKey = import.meta.env.HELIUS_API_KEY;
  const customRPC = import.meta.env.VITE_SOLANA_RPC_URL;
  const networkSetting = import.meta.env.VITE_SOLANA_NETWORK;
  const network = (networkSetting === 'mainnet' || networkSetting === 'mainnet-beta')
    ? WalletAdapterNetwork.Mainnet 
    : WalletAdapterNetwork.Devnet;

  // Priority order: Helius (best), custom RPC, GenesysGo, Ankr, then cluster API
  const endpoints = [
    heliusKey && network === WalletAdapterNetwork.Mainnet ? `https://rpc.helius.xyz/?api-key=${heliusKey}` : null,
    customRPC,
    network === WalletAdapterNetwork.Mainnet ? 'https://ssc-dao.genesysgo.net/' : null,
    network === WalletAdapterNetwork.Mainnet ? 'https://rpc.ankr.com/solana' : null,
    clusterApiUrl(network)
  ].filter(Boolean);

  return endpoints[0] || clusterApiUrl(network);
}