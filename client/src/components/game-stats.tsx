import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { useChain, useChainConfig } from '@/contexts/chain-context';

// Base pool offset for display purposes
const BASE_POOL_DISPLAY_OFFSET = 150;

export function GameStats() {
  const { selectedChain } = useChain();
  const { formatAmount } = useChainConfig();

  const { data: stats = {} } = useQuery({
    queryKey: ['/api/stats', selectedChain],
    queryFn: async () => {
      const res = await fetch(`/api/stats/${selectedChain}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const actualPool = parseFloat((stats as any)?.totalPool || '0');
  const displayPool = actualPool + BASE_POOL_DISPLAY_OFFSET;

  return (
    <section className="mb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-dark-purple/30 border border-neon-cyan/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-neon-cyan font-bold mb-2">TOTAL POOL</h3>
            <div className="text-3xl font-black text-neon-gold">
              {formatAmount(displayPool)}
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Real Mode only
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-dark-purple/30 border border-neon-orange/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-neon-orange font-bold mb-2">TOTAL WINS</h3>
            <div className="text-2xl font-bold text-success-green">
              {(stats as any)?.totalWins || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-dark-purple/30 border border-electric-blue/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-electric-blue font-bold mb-2">LAST WINNER</h3>
            <div className="text-lg font-bold text-neon-gold">
              {formatAmount(parseFloat((stats as any)?.lastWinAmount || '0'))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
