import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SimpleWalletButtonProps {
  onConnect?: (publicKey: string) => void;
}

export function SimpleWalletButton({ onConnect }: SimpleWalletButtonProps) {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      // Check if wallet is available
      if ((window as any).solana && (window as any).solana.isPhantom) {
        const response = await (window as any).solana.connect();
        const walletAddress = response.publicKey.toString();
        setPublicKey(walletAddress);
        setConnected(true);
        onConnect?.(walletAddress);
      } else {
        alert('Please install Phantom wallet or another Solana wallet to play');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    setPublicKey(null);
    if ((window as any).solana) {
      (window as any).solana.disconnect();
    }
  };

  if (connected && publicKey) {
    return (
      <div className="flex items-center space-x-4">
        <Card className="bg-dark-purple/50 border-neon-cyan/50">
          <CardContent className="p-3">
            <div className="text-sm text-neon-cyan">Connected</div>
            <div className="text-xs text-gray-300">
              {publicKey.slice(0, 4)}...{publicKey.slice(-4)}
            </div>
          </CardContent>
        </Card>
        <Button
          onClick={handleDisconnect}
          className="!bg-gradient-to-r !from-neon-cyan/20 !to-electric-blue/20 !border-2 !border-neon-cyan hover:!border-neon-orange !text-neon-cyan hover:!text-neon-orange !px-6 !py-2 !rounded-lg !font-bold !transition-all !duration-300 hover:!shadow-neon-orange"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      className="!bg-gradient-to-r !from-neon-cyan/20 !to-electric-blue/20 !border-2 !border-neon-cyan hover:!border-neon-orange !text-neon-cyan hover:!text-neon-orange !px-6 !py-2 !rounded-lg !font-bold !transition-all !duration-300 hover:!shadow-neon-orange"
    >
      Connect Wallet
    </Button>
  );
}