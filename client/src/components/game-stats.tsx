import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { formatSOL } from '@/lib/game-logic';

export function GameStats() {
  const { data: stats = {} } = useQuery({
    queryKey: ['/api/stats'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return (
    <section className="mb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-dark-purple/30 border border-neon-cyan/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-neon-cyan font-bold mb-2">TOTAL POOL</h3>
            <div className="text-3xl font-black text-neon-gold">
              {formatSOL(parseFloat((stats as any)?.totalPool || '0'))}
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
              {formatSOL(parseFloat((stats as any)?.lastWinAmount || '0'))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
