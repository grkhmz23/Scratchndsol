import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useState, useEffect } from 'react';
import { formatSOL } from '@/lib/utils';
import { testWalletConnection } from '@/lib/wallet-diagnostics';
import { ProfileDropdown } from '@/components/profile-dropdown';

export function WalletButton() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch wallet balance when connected with retry logic and debugging
  useEffect(() => {
    const fetchBalance = async (retryCount = 0) => {
      if (connected && publicKey) {
        console.log(`Fetching balance for wallet: ${publicKey.toString()}`);
        console.log(`Using RPC endpoint: ${connection.rpcEndpoint}`);
        
        setLoading(true);
        try {
          // Use confirmed commitment for reliable balance fetching
          const balanceLamports = await connection.getBalance(publicKey, 'confirmed');
          const solBalance = balanceLamports / LAMPORTS_PER_SOL;
          console.log(`Balance fetched successfully: ${solBalance} SOL (${balanceLamports} lamports)`);
          setBalance(solBalance);
        } catch (error) {
          console.error(`Failed to fetch wallet balance (attempt ${retryCount + 1}):`, error);
          console.error('Error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
            publicKey: publicKey.toString(),
            endpoint: connection.rpcEndpoint
          });
          
          // Run diagnostics on first failure
          if (retryCount === 0) {
            console.log('Running wallet connection diagnostics...');
            testWalletConnection(publicKey).catch(diagError => {
              console.error('Diagnostics failed:', diagError);
            });
          }
          
          // Retry up to 3 times with exponential backoff
          if (retryCount < 2) {
            console.log(`Retrying balance fetch in ${Math.pow(2, retryCount)} seconds...`);
            setTimeout(() => {
              fetchBalance(retryCount + 1);
            }, Math.pow(2, retryCount) * 1000);
          } else {
            console.error('All balance fetch attempts failed');
            setBalance(null);
          }
        } finally {
          if (retryCount === 0) {
            setLoading(false);
          }
        }
      } else {
        console.log('Wallet not connected or no public key available');
        setBalance(null);
        setLoading(false);
      }
    };

    fetchBalance();
  }, [connected, publicKey, connection]);

  if (!connected) {
    return (
      <WalletMultiButton className="!bg-neon-cyan !text-black !font-bold !px-4 !py-2 !rounded-lg hover:!bg-neon-cyan/80 !transition-colors" />
    );
  }

  return <ProfileDropdown balance={balance} loading={loading} />;
}