import { useState } from 'react';
import { Link } from 'wouter';
import { ModeToggle } from '@/components/mode-toggle';
import { useGameMode } from '@/contexts/game-mode-context';
import { useChain } from '@/contexts/chain-context';
import { ChainSelector } from '@/components/chain-selector';
import { DynamicWalletButton } from '@/components/dynamic-wallet-button';
import { ScratchCardGrid } from '@/components/scratch-card-grid';
import { ScratchCardModal } from '@/components/scratch-card-modal';
import { GameStats } from '@/components/game-stats';
import { RecentWinners } from '@/components/recent-winners';
import logoPath from '@assets/revealx-logo.png';
import { SiX } from 'react-icons/si';

export default function Home() {
  const { isDemoMode } = useGameMode();
  const { chainName, nativeCurrency } = useChain();
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
                <img src={logoPath} alt="RevealX" className="w-12 h-12 object-contain" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-black text-neon-cyan">REVEALX</h1>
                <h2 className="text-xl font-bold text-neon-orange">Multi-Chain</h2>
              </div>
            </div>
          </Link>

          {/* Navigation */}
          <div className="hidden lg:flex items-center space-x-4 flex-1 justify-center">
            <Link href="/pool">
              <a className="px-4 py-2 bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 hover:from-neon-purple/30 hover:to-neon-cyan/30 border border-neon-purple/50 hover:border-neon-purple rounded-lg font-bold text-neon-purple hover:text-white transition-all duration-200">
                Pool
              </a>
            </Link>
            <Link href="/creator">
              <a className="px-4 py-2 bg-gradient-to-r from-neon-cyan/20 to-neon-orange/20 hover:from-neon-cyan/30 hover:to-neon-orange/30 border border-neon-cyan/50 hover:border-neon-cyan rounded-lg font-bold text-neon-cyan hover:text-white transition-all duration-200">
                Creator
              </a>
            </Link>
            <Link href="/how-it-works">
              <a className="px-4 py-2 bg-gradient-to-r from-gray-800/50 to-gray-700/50 hover:from-gray-700/50 hover:to-gray-600/50 border border-gray-600/50 hover:border-gray-500 rounded-lg font-bold text-gray-300 hover:text-white transition-all duration-200">
                How It Works
              </a>
            </Link>
          </div>

          {/* Social Media, Chain Selector, Mode Toggle and Wallet Connection */}
          <div className="flex items-center space-x-3 lg:ml-auto">
            <a 
              href="https://x.com/revealxfun" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/30 hover:border-neon-cyan/50 transition-all duration-200 hover:shadow-neon-cyan group"
              data-testid="link-social-twitter"
            >
              <SiX className="w-5 h-5 text-neon-cyan group-hover:text-white transition-colors" />
            </a>
            <ChainSelector />
            <ModeToggle />
            {!isDemoMode && <DynamicWalletButton />}
          </div>
        </div>
      </header>

      {/* v2 Banner */}
      <div className="bg-gradient-to-r from-neon-cyan/10 via-neon-purple/10 to-neon-orange/10 border-b border-neon-cyan/20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="px-4 py-2 bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg">
              <span className="text-base font-bold text-neon-cyan animate-pulse">
                🚀 RevealX v2 is live on Base!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/pool">
                <a className="px-4 py-2 bg-neon-purple/10 border border-neon-purple/30 hover:bg-neon-purple/20 rounded-lg text-sm font-bold text-neon-purple transition-colors">
                  LP Pool
                </a>
              </Link>
              <Link href="/creator">
                <a className="px-4 py-2 bg-neon-orange/10 border border-neon-orange/30 hover:bg-neon-orange/20 rounded-lg text-sm font-bold text-neon-orange transition-colors">
                  Creator Dashboard
                </a>
              </Link>
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
          <div className="flex items-center justify-center gap-4 text-sm mb-4">
            <Link href="/how-it-works">
              <a className="text-neon-cyan hover:text-white transition-colors">How It Works</a>
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/pool">
              <a className="text-neon-purple hover:text-white transition-colors">LP Pool</a>
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/creator">
              <a className="text-neon-orange hover:text-white transition-colors">Creator</a>
            </Link>
          </div>
          <div className="text-gray-400 text-sm mb-4">
            Powered by {chainName} Blockchain • Built with ❤️ for the crypto community
          </div>
          <div className="text-xs text-gray-500">
            Play responsibly • Must be 18+ • Gambling can be addictive
          </div>
        </div>
      </footer>
    </div>
  );
}
