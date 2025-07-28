import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { formatSOL, formatWalletAddress } from '@/lib/game-logic';

export function RecentWinners() {
  const { data: recentWins = [] } = useQuery({
    queryKey: ['/api/games/recent-wins'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (!recentWins || (recentWins as any[]).length === 0) {
    return (
      <section className="mb-12">
        <h3 className="text-2xl font-black text-center mb-8 text-neon-orange">RECENT WINNERS</h3>
        <div className="max-w-4xl mx-auto">
          <Card className="bg-dark-purple/30 border border-neon-cyan/30 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <p className="text-gray-400">No recent winners yet. Be the first!</p>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <h3 className="text-2xl font-black text-center mb-8 text-neon-orange">RECENT WINNERS</h3>
      <div className="max-w-4xl mx-auto">
        <Card className="bg-dark-purple/30 border border-neon-cyan/30 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              {(recentWins as any[]).map((win: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-deep-space/50 rounded-lg border border-neon-cyan/20">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-success-green rounded-full animate-pulse"></div>
                    <div>
                      <div className="text-neon-cyan font-bold">
                        {formatWalletAddress(win.playerWallet)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(win.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-success-green font-black">
                      {formatSOL(parseFloat(win.winAmount))}
                    </div>
                    <div className="text-xs text-neon-gold">
                      {win.multiplier}x multiplier
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
