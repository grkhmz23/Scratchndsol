import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WalletButton } from '@/components/wallet-button';
import { ModeToggle } from '@/components/mode-toggle';
import { useGameMode } from '@/contexts/game-mode-context';
import logoPath from '@assets/ChatGPT Image 28 juil. 2025, 10_17_36_1753690663892.png';

export default function Casino() {
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
              <span className="text-neon-cyan font-bold cursor-pointer">
                Casino
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
            CASINO
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Premium casino games with real SOL wagering and authentic payouts
          </p>
        </div>

        {/* Game Categories */}
        <div className="grid gap-8 max-w-6xl mx-auto">
          {/* Scratch & SOL Section */}
          <section>
            <h2 className="text-3xl font-bold text-neon-orange mb-6">Scratch & SOL</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-dark-purple/50 border-neon-cyan/30 hover:border-neon-cyan/60 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-neon-cyan">Scratch Cards</CardTitle>
                  <CardDescription className="text-gray-400">
                    Classic scratch-off tickets with instant wins
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Link href="/">
                      <Button 
                        variant="outline" 
                        className="border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10"
                        data-testid="button-play-demo-scratch"
                      >
                        Play Demo
                      </Button>
                    </Link>
                    <Link href="/">
                      <Button 
                        className="bg-neon-orange hover:bg-neon-orange/80"
                        data-testid="button-play-real-scratch"
                      >
                        Play Real
                      </Button>
                    </Link>
                  </div>
                  <Badge variant="secondary" className="bg-green-900/50 text-green-400">
                    Available
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Slots Section */}
          <section>
            <h2 className="text-3xl font-bold text-neon-orange mb-6">Slots</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-dark-purple/50 border-neon-cyan/30 hover:border-neon-cyan/60 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-neon-cyan">Classic 3×3</CardTitle>
                  <CardDescription className="text-gray-400">
                    Traditional 3-reel slot with 5 paylines • 88-90% RTP
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Link href="/casino/slots/classic">
                      <Button 
                        variant="outline" 
                        className="border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10"
                        data-testid="button-play-demo-slots"
                      >
                        Play Demo
                      </Button>
                    </Link>
                    <Link href="/casino/slots/classic">
                      <Button 
                        className="bg-neon-orange hover:bg-neon-orange/80"
                        data-testid="button-play-real-slots"
                      >
                        Play Real
                      </Button>
                    </Link>
                  </div>
                  <Badge variant="secondary" className="bg-green-900/50 text-green-400">
                    Available
                  </Badge>
                </CardContent>
              </Card>

              {/* Future Slots */}
              <Card className="bg-gray-800/30 border-gray-600/30">
                <CardHeader>
                  <CardTitle className="text-gray-500">Progressive Jackpot</CardTitle>
                  <CardDescription className="text-gray-600">
                    Multi-line progressive with growing jackpot
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="bg-gray-700/50 text-gray-500">
                    Coming Soon
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/30 border-gray-600/30">
                <CardHeader>
                  <CardTitle className="text-gray-500">VIP Token Slots</CardTitle>
                  <CardDescription className="text-gray-600">
                    Exclusive $CRYNO token-only themed reels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="bg-gray-700/50 text-gray-500">
                    Coming Soon
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Other Games Section */}
          <section>
            <h2 className="text-3xl font-bold text-neon-orange mb-6">Other Games</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-gray-800/30 border-gray-600/30">
                <CardHeader>
                  <CardTitle className="text-gray-500">Roulette</CardTitle>
                  <CardDescription className="text-gray-600">
                    European roulette with live betting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="bg-gray-700/50 text-gray-500">
                    Coming Soon
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/30 border-gray-600/30">
                <CardHeader>
                  <CardTitle className="text-gray-500">Blackjack</CardTitle>
                  <CardDescription className="text-gray-600">
                    Classic 21 with side bets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="bg-gray-700/50 text-gray-500">
                    Coming Soon
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/30 border-gray-600/30">
                <CardHeader>
                  <CardTitle className="text-gray-500">Dice Games</CardTitle>
                  <CardDescription className="text-gray-600">
                    Craps and custom dice variations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="bg-gray-700/50 text-gray-500">
                    Coming Soon
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-16 p-6 bg-dark-purple/30 rounded-lg border border-neon-cyan/20">
          <p className="text-gray-400 text-sm">
            All games use provably fair algorithms. Real mode requires SOL wallet connection.
            Demo mode available for risk-free practice.
          </p>
        </div>
      </main>
    </div>
  );
}