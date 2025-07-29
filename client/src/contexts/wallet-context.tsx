import { ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';

// Solana wallet CSS (required for modal)
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextProviderProps {
  children: ReactNode;
}

export function WalletContextProvider({ children }: WalletContextProviderProps) {
  // Use environment variable for network selection with proper fallback
  const networkSetting = import.meta.env.VITE_SOLANA_NETWORK;
  const network = (networkSetting === 'mainnet' || networkSetting === 'mainnet-beta')
    ? WalletAdapterNetwork.Mainnet 
    : WalletAdapterNetwork.Devnet;
  
  // Use environment RPC URL with fallback options and debugging
  const endpoint = useMemo(() => {
    const customRPC = import.meta.env.VITE_SOLANA_RPC_URL;
    const networkSetting = import.meta.env.VITE_SOLANA_NETWORK;
    
    console.log('Wallet Context Configuration:', {
      customRPC,
      networkSetting,
      computedNetwork: network,
      finalEndpoint: customRPC || clusterApiUrl(network)
    });
    
    if (customRPC) {
      return customRPC;
    }
    // Fallback to appropriate cluster API
    return clusterApiUrl(network);
  }, [network]);
  
  // Configure supported wallets - empty array will auto-detect wallets
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}