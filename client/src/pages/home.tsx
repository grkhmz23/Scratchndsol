import { useState } from 'react';
import { Link } from 'wouter';
import { WalletButton } from '@/components/wallet-button';
import { ModeToggle } from '@/components/mode-toggle';
import { useGameMode } from '@/contexts/game-mode-context';
import { ScratchCardGrid } from '@/components/scratch-card-grid';
import { ScratchCardModal } from '@/components/scratch-card-modal';
import { GameStats } from '@/components/game-stats';
import { RecentWinners } from '@/components/recent-winners';
import logoPath from '@assets/ChatGPT Image 28 juil. 2025, 10_17_36_1753690663892.png';
import { SiX } from 'react-icons/si';

export default function Home() {
  const { isDemoMode } = useGameMode();
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleCardSelect = (ticketCost: number) => {
    setSelectedTicket(ticketCost);
    setShowModal(true);
  };

  const handleGameComplete = (result: { isWin: boolean; multiplier: number; winAmount: number }) => {
    // Game completed, modal will handle the result display
  };

  // Wallet connection is now handled by WalletButton component

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTicket(null);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-neon-cyan/30 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between lg:justify-start lg:space-x-8">
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
          <div className="hidden lg:flex items-center space-x-4 flex-1 justify-center">
            <Link href="/bags-jackpot">
              <a className="px-6 py-2 bg-gradient-to-r from-neon-gold/20 to-neon-orange/20 hover:from-neon-gold/30 hover:to-neon-orange/30 border-2 border-neon-gold/50 hover:border-neon-gold rounded-lg font-bold text-neon-gold hover:text-white transition-all duration-200 hover:shadow-neon-gold">
                🎰 Bags Jackpot
              </a>
            </Link>
          </div>

          {/* Social Media, Mode Toggle and Wallet Connection */}
          <div className="flex items-center space-x-4 lg:ml-auto">
            <a 
              href="https://x.com/scratchnsol" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/30 hover:border-neon-cyan/50 transition-all duration-200 hover:shadow-neon-cyan group"
              data-testid="link-social-twitter"
            >
              <SiX className="w-5 h-5 text-neon-cyan group-hover:text-white transition-colors" />
            </a>
            <ModeToggle />
            {!isDemoMode && <WalletButton />}
          </div>
        </div>
      </header>

      {/* Token Launch Banner */}
      <div className="bg-gradient-to-r from-neon-cyan/10 via-neon-purple/10 to-neon-orange/10 border-b border-neon-cyan/20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center">
            <div className="px-6 py-2 bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg">
              <span className="text-lg font-bold text-neon-cyan animate-pulse" data-testid="text-launching-soon">
                🚀 Launching Soon
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Game Stats */}
        <GameStats />

        {/* Scratch Card Grid - Always Show */}
        <ScratchCardGrid 
          onCardSelect={handleCardSelect}
          isDemoMode={isDemoMode}
        />

        {/* Recent Winners */}
        <RecentWinners />
      </main>

      {/* Scratch Card Modal */}
      {showModal && selectedTicket && (
        <ScratchCardModal
          isOpen={showModal}
          onClose={handleCloseModal}
          ticketCost={selectedTicket}
          walletAddress={isDemoMode ? "demo-wallet" : (walletAddress || "")}
          isDemoMode={isDemoMode}
          onGameComplete={handleGameComplete}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-neon-cyan/30 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="text-gray-400 text-sm mb-4">
            Powered by Solana Blockchain • Built with ❤️ for the crypto community
          </div>
          <div className="text-xs text-gray-500">
            Play responsibly • Must be 18+ • Gambling can be addictive
          </div>
        </div>
      </footer>
    </div>
  );
}