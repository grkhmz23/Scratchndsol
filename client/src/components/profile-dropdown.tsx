import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, BarChart3, LogOut, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface ProfileDropdownProps {
  balance: number | null;
  loading: boolean;
}

export function ProfileDropdown({ balance, loading }: ProfileDropdownProps) {
  const { publicKey, disconnect } = useWallet();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  if (!publicKey) return null;

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(publicKey.toString());
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy address:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy address to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDashboard = () => {
    setLocation('/dashboard');
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected successfully",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-neon-cyan/10 border-neon-cyan text-neon-cyan hover:bg-neon-cyan/20 flex items-center gap-2"
        >
          <User className="w-4 h-4" />
          <div className="flex flex-col items-start">
            <span className="font-mono text-xs">
              {shortenAddress(publicKey.toString())}
            </span>
            {loading ? (
              <span className="text-xs opacity-70">Loading...</span>
            ) : balance !== null ? (
              <span className="text-xs font-bold">
                {balance.toFixed(3)} SOL
              </span>
            ) : (
              <span className="text-xs opacity-70">Balance unavailable</span>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        className="w-56 bg-gray-900/95 border-neon-cyan/30 backdrop-blur"
      >
        <div className="px-3 py-2 border-b border-neon-cyan/20">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-neon-cyan">
              {shortenAddress(publicKey.toString())}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAddress}
              className="h-6 w-6 p-0 hover:bg-neon-cyan/10"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          {balance !== null && (
            <div className="text-sm font-bold text-white mt-1">
              {balance.toFixed(3)} SOL
            </div>
          )}
        </div>

        <DropdownMenuItem 
          onClick={handleDashboard}
          className="flex items-center gap-2 cursor-pointer hover:bg-neon-cyan/10 focus:bg-neon-cyan/10"
        >
          <BarChart3 className="w-4 h-4" />
          My Dashboard
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-neon-cyan/20" />

        <DropdownMenuItem 
          onClick={handleDisconnect}
          className="flex items-center gap-2 cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 text-red-400"
        >
          <LogOut className="w-4 h-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}