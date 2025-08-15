import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WalletButton } from '@/components/wallet-button';
import { ModeToggle } from '@/components/mode-toggle';
import { useGameMode } from '@/contexts/game-mode-context';
import logoPath from '@assets/ChatGPT Image 28 juil. 2025, 10_17_36_1753690663892.png';

export default function Slots() {
  const { isDemoMode } = useGameMode();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-neon-cyan/30 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between lg:justify-start lg:space-x-8">
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer hover:opacity-80 transition-opacity duration-200">
              <div className="w-16 h-16 bg-gradient-to-br from-neon-cyan to-neon-orange rounded-lg flex items-center justify-center border-2 border-neon-cyan shadow-neon-cyan">
                <img src={logoPath} alt="Scratch 'n SOL" className="w-12 h-12 object-contain" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-black text-neon-cyan">SCRATCH</h1>
                <h2 className="text-xl font-bold text-neon-orange">'n SOL</h2>
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/">
              <span className="text-gray-300 hover:text-neon-cyan transition-colors cursor-pointer font-medium">
                Scratch Cards
              </span>
            </Link>
            <Link href="/casino">
              <span className="text-gray-300 hover:text-neon-cyan transition-colors cursor-pointer font-medium">
                Casino
              </span>
            </Link>
            <Link href="/casino/slots">
              <span className="text-neon-cyan font-bold cursor-pointer">
                Slots
              </span>
            </Link>
          </nav>

          <div className="flex items-center space-x-4 lg:ml-auto">
            <ModeToggle />
            {!isDemoMode && <WalletButton />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-neon-cyan mb-4">
            SLOT MACHINES
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Classic and modern slot machines with authentic casino payouts
          </p>
        </div>

        {/* Available Machines */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Classic 3x3 Slot */}
          <Card className="bg-dark-purple/50 border-neon-cyan/30 hover:border-neon-cyan/60 transition-all duration-300 hover:shadow-lg hover:shadow-neon-cyan/20">
            <CardHeader>
              <CardTitle className="text-neon-cyan text-2xl">Classic 3×3</CardTitle>
              <CardDescription className="text-gray-400">
                Traditional 3-reel slot machine with 5 paylines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">RTP:</span>
                  <span className="text-neon-cyan font-bold">88-90%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Paylines:</span>
                  <span className="text-neon-cyan font-bold">5</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Max Win:</span>
                  <span className="text-neon-orange font-bold">20x</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Bet Range:</span>
                  <span className="text-gray-300">0.1 - 0.5 SOL</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Link href="/casino/slots/classic" className="flex-1">
                  <Button 
                    variant="outline" 
                    className="w-full border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10"
                    data-testid="button-play-demo-classic"
                  >
                    Play Demo
                  </Button>
                </Link>
                <Link href="/casino/slots/classic" className="flex-1">
                  <Button 
                    className="w-full bg-neon-orange hover:bg-neon-orange/80"
                    data-testid="button-play-real-classic"
                  >
                    Play Real
                  </Button>
                </Link>
              </div>
              
              <Badge variant="secondary" className="w-full justify-center bg-green-900/50 text-green-400">
                Available Now
              </Badge>
            </CardContent>
          </Card>

          {/* Progressive Jackpot - Coming Soon */}
          <Card className="bg-gray-800/30 border-gray-600/30">
            <CardHeader>
              <CardTitle className="text-gray-500 text-2xl">Progressive Jackpot</CardTitle>
              <CardDescription className="text-gray-600">
                Multi-line progressive with growing jackpot pool
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">RTP:</span>
                  <span className="text-gray-500">92-95%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Paylines:</span>
                  <span className="text-gray-500">25</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Jackpot:</span>
                  <span className="text-orange-400">Progressive</span>
                </div>
              </div>
              
              <Badge variant="secondary" className="w-full justify-center bg-gray-700/50 text-gray-500">
                Coming Soon
              </Badge>
            </CardContent>
          </Card>

          {/* VIP Token Slots - Coming Soon */}
          <Card className="bg-gray-800/30 border-gray-600/30">
            <CardHeader>
              <CardTitle className="text-gray-500 text-2xl">VIP Token Slots</CardTitle>
              <CardDescription className="text-gray-600">
                Exclusive $CRYNO token-only themed reels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Currency:</span>
                  <span className="text-gray-500">$CRYNO</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Features:</span>
                  <span className="text-gray-500">Themed</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Access:</span>
                  <span className="text-purple-400">VIP Only</span>
                </div>
              </div>
              
              <Badge variant="secondary" className="w-full justify-center bg-gray-700/50 text-gray-500">
                Coming Soon
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Back to Casino */}
        <div className="text-center mt-12">
          <Link href="/casino">
            <Button 
              variant="outline" 
              className="border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10"
              data-testid="button-back-casino"
            >
              ← Back to Casino
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}