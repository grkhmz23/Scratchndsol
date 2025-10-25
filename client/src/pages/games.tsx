import { Link } from 'wouter';
import { DemoBanner } from '@/components/demo-banner';
import { GameModeBadge } from '@/components/game-mode-badge';
import { Button } from '@/components/ui/button';
import { WalletButton } from '@/components/wallet-button';
import { ModeToggle } from '@/components/mode-toggle';
import { useGameMode } from '@/contexts/game-mode-context';
import logoPath from '@assets/ChatGPT Image 28 juil. 2025, 10_17_36_1753690663892.png';

export default function Games() {
  const { isDemoMode } = useGameMode();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-neon-cyan/30 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo - Clickable to navigate home */}
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

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/">
              <span className="text-gray-300 hover:text-neon-cyan transition-colors cursor-pointer font-medium">
                Scratch Cards
              </span>
            </Link>
            <Link href="/games">
              <span className="text-neon-cyan font-bold cursor-pointer">
                Games
              </span>
            </Link>
          </nav>

          {/* Mode Toggle and Wallet Connection */}
          <div className="flex items-center space-x-4">
            <ModeToggle />
            {!isDemoMode && <WalletButton />}
          </div>
        </div>
      </header>

      {/* Demo Banner */}
      <DemoBanner />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-neon-cyan mb-4">
            ARCADE GAMES
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Test your skills with our collection of blockchain games. More games coming soon with real SOL prizes!
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* NoCrying Escape Game Card */}
          <div className="group relative">
            <div className="bg-gradient-to-br from-dark-purple/40 to-deep-space/60 border border-neon-cyan/30 rounded-xl p-6 hover:border-neon-cyan/60 transition-all duration-300 hover:shadow-neon-cyan/20 hover:shadow-lg">
              
              {/* Game Preview Image */}
              <div className="aspect-video bg-gradient-to-br from-purple-900/50 to-teal-900/50 rounded-lg mb-4 flex items-center justify-center border border-neon-cyan/20 relative overflow-hidden">
                <img 
                  src="/assets/nocrying-escape/character.svg" 
                  alt="NoCrying Escape Character" 
                  className="w-20 h-20 opacity-80 group-hover:scale-110 transition-transform duration-300"
                />
                
                {/* Animated background particles */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(0,255,255,0.1)_0%,transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(255,107,53,0.1)_0%,transparent_50%)]" />
              </div>

              {/* Game Info */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-bold text-neon-cyan">NoCrying Escape</h3>
                  <GameModeBadge isRealMode={!isDemoMode} />
                </div>
                
                <p className="text-gray-300 text-sm">
                  An infinite runner where you dodge RUG pulls, tears, and broken coins. 
                  How long can you survive the crypto chaos?
                </p>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-neon-orange font-semibold text-sm">
                    Demo only — SOL prizes coming soon
                  </span>
                  
                  <Link href="/games/nocrying-escape">
                    <Button 
                      className="bg-gradient-to-r from-neon-cyan to-electric-blue text-black font-bold px-6 py-2 rounded-lg hover:shadow-lg hover:shadow-neon-cyan/30 transition-all duration-300"
                      data-testid="button-play-nocrying-escape"
                    >
                      Play Demo
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon Card 1 */}
          <div className="group relative opacity-60">
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 border border-gray-600/30 rounded-xl p-6">
              
              {/* Placeholder Image */}
              <div className="aspect-video bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-lg mb-4 flex items-center justify-center border border-gray-600/20">
                <span className="text-4xl">🎲</span>
              </div>

              {/* Game Info */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-bold text-gray-400">Crypto Dice</h3>
                  <span className="text-xs bg-gray-600/50 px-2 py-1 rounded-full text-gray-300">
                    Coming Soon
                  </span>
                </div>
                
                <p className="text-gray-500 text-sm">
                  Roll the dice and win big with SOL stakes. Multiple betting options and multipliers.
                </p>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-500 font-semibold text-sm">
                    Real SOL prizes
                  </span>
                  
                  <Button 
                    disabled 
                    className="bg-gray-600/50 text-gray-400 font-bold px-6 py-2 rounded-lg cursor-not-allowed"
                  >
                    Coming Soon
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon Card 2 */}
          <div className="group relative opacity-60">
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 border border-gray-600/30 rounded-xl p-6">
              
              {/* Placeholder Image */}
              <div className="aspect-video bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-lg mb-4 flex items-center justify-center border border-gray-600/20">
                <span className="text-4xl">🃏</span>
              </div>

              {/* Game Info */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-bold text-gray-400">SOL Poker</h3>
                  <span className="text-xs bg-gray-600/50 px-2 py-1 rounded-full text-gray-300">
                    Coming Soon
                  </span>
                </div>
                
                <p className="text-gray-500 text-sm">
                  Classic poker with cryptocurrency stakes. Play against the house or other players.
                </p>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-500 font-semibold text-sm">
                    Real SOL prizes  
                  </span>
                  
                  <Button 
                    disabled 
                    className="bg-gray-600/50 text-gray-400 font-bold px-6 py-2 rounded-lg cursor-not-allowed"
                  >
                    Coming Soon
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Scratch Cards */}
        <div className="text-center mt-12">
          <Link href="/">
            <Button 
              variant="outline"
              className="border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10 font-bold px-8 py-3"
              data-testid="button-back-scratch-cards"
            >
              ← Back to Scratch Cards
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}