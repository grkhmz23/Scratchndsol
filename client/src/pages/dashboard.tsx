import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Trophy, 
  Target, 
  TrendingUp, 
  Coins, 
  Calendar,
  Flame,
  BarChart3
} from 'lucide-react';
import { getUserStatsManager, formatGameDate, getCardTypeDisplay, type GamePlay } from '@/lib/user-stats';

export default function Dashboard() {
  const { publicKey, connected } = useWallet();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected || !publicKey) {
      setLocation('/');
      return;
    }

    const statsManager = getUserStatsManager(publicKey);
    if (statsManager) {
      const userStats = statsManager.getFormattedStats();
      setStats(userStats);
    }
    setLoading(false);
  }, [connected, publicKey, setLocation]);

  if (!connected) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-neon-cyan text-xl">Loading dashboard...</div>
      </div>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    suffix = '', 
    highlight = false 
  }: { 
    title: string; 
    value: string; 
    icon: any; 
    suffix?: string;
    highlight?: boolean;
  }) => (
    <Card className={`bg-gray-800/50 border-neon-cyan/30 ${highlight ? 'ring-2 ring-neon-cyan/50' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? 'text-neon-cyan' : 'text-gray-400'}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? 'text-neon-cyan' : 'text-white'} flex items-center gap-1`}>
          {value}{suffix}
          {highlight && parseFloat(value) > 0 && <Flame className="w-5 h-5 text-orange-500" />}
        </div>
      </CardContent>
    </Card>
  );

  const GameHistoryItem = ({ game }: { game: GamePlay }) => (
    <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${game.isWin ? 'bg-green-500' : 'bg-red-500'}`} />
        <div>
          <div className="text-sm font-medium text-white">
            {getCardTypeDisplay(game.cardType)}
          </div>
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatGameDate(game.timestamp)}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-mono text-white">
          -{game.solAmount.toFixed(3)} SOL
        </div>
        {game.isWin && (
          <div className="text-sm font-mono text-green-400">
            +{game.prizeAmount.toFixed(3)} SOL
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/')}
              className="text-neon-cyan hover:bg-neon-cyan/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Game
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="text-neon-cyan" />
                My Dashboard
              </h1>
              <p className="text-gray-400 font-mono text-sm mt-1">
                {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Cards Played"
            value={stats?.totalCards || '0'}
            icon={Target}
          />
          <StatCard
            title="Total SOL Invested"
            value={stats?.totalSOLInvested || '0.000'}
            icon={Coins}
            suffix=" SOL"
          />
          <StatCard
            title="Biggest Win"
            value={stats?.biggestWin || '0.000'}
            icon={Trophy}
            suffix=" SOL"
            highlight={parseFloat(stats?.biggestWin || '0') > 0}
          />
          <StatCard
            title="Total Wins"
            value={stats?.wins || '0'}
            icon={TrendingUp}
          />
          <StatCard
            title="Total Losses"
            value={stats?.losses || '0'}
            icon={Target}
          />
          <StatCard
            title="Win Rate"
            value={stats?.winRate || '0.0'}
            icon={BarChart3}
            suffix="%"
            highlight={parseFloat(stats?.winRate || '0') > 50}
          />
        </div>

        {/* Game History */}
        <Card className="bg-gray-800/50 border-neon-cyan/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="text-neon-cyan" />
              Recent Games
              {stats?.recentGames?.length > 0 && (
                <Badge variant="secondary" className="bg-neon-cyan/20 text-neon-cyan">
                  {stats.recentGames.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentGames?.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No games played yet</p>
                <p className="text-sm">
                  Start playing scratch cards in <span className="text-purple-400">Real Mode</span> to see your statistics here!
                </p>
                <Button 
                  onClick={() => setLocation('/')}
                  className="mt-4 bg-neon-cyan text-black hover:bg-neon-cyan/80"
                >
                  Play Your First Card
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {stats?.recentGames?.map((game: GamePlay) => (
                    <GameHistoryItem key={game.id} game={game} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 flex justify-center">
          <Button 
            onClick={() => setLocation('/')}
            size="lg"
            className="bg-gradient-to-r from-neon-cyan to-neon-purple text-black font-bold px-8 py-3"
          >
            Continue Playing
          </Button>
        </div>
      </div>
    </div>
  );
}