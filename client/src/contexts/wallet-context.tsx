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
  // Use mainnet for production with proper RPC endpoint
  const network = WalletAdapterNetwork.Mainnet;
  
  // Use mainnet RPC endpoint for reliable connection
  const endpoint = useMemo(() => 
    import.meta.env.VITE_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    [network]
  );
  
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