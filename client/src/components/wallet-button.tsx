import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useState, useEffect } from 'react';
import { formatSOL } from '@/lib/utils';

export function WalletButton() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch wallet balance when connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (connected && publicKey) {
        setLoading(true);
        try {
          // Use confirmed commitment for reliable balance fetching
          const balanceLamports = await connection.getBalance(publicKey, 'confirmed');
          const solBalance = balanceLamports / LAMPORTS_PER_SOL;
          setBalance(solBalance);
        } catch (error) {
          console.error('Failed to fetch wallet balance:', error);
          setBalance(null);
        } finally {
          setLoading(false);
        }
      } else {
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

  return (
    <div className="flex items-center space-x-3">
      {/* Balance Display */}
      <div className="text-right">
        <div className="text-xs text-gray-400">Balance</div>
        <div className="text-sm font-bold text-neon-cyan">
          {loading ? '...' : balance !== null ? `${formatSOL(balance)} SOL` : 'Error'}
        </div>
      </div>
      
      {/* Wallet Button */}
      <WalletMultiButton className="!bg-neon-orange !text-black !font-bold !px-4 !py-2 !rounded-lg hover:!bg-neon-orange/80 !transition-colors" />
    </div>
  );
}