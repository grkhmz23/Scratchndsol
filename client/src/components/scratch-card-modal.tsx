import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateGameSymbols, checkWin, calculateWinAmount, formatSOL } from '@/lib/game-logic';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ScratchZone } from '@/components/scratch-zone';
import { X } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { purchaseTicket } from '@/lib/solana-transactions';
import { getUserStatsManager } from '@/lib/user-stats';
import scratchNSolLogo from '@assets/ChatGPT Image 28 juil. 2025, 10_17_36_1753690663892.png';

interface ScratchCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketCost: number;
  walletAddress: string;
  isDemoMode: boolean;
  onGameComplete: (result: { isWin: boolean; multiplier: number; winAmount: number }) => void;
}

interface GameResult {
  isWin: boolean;
  multiplier: number;
  winAmount: number;
}

const getCardDesign = (ticketCost: number) => {
  const designs = {
    0.1: {
      name: "BRONZE",
      gradient: "from-amber-600 via-yellow-700 to-amber-800",
      borderColor: "border-amber-500",
      accentColor: "text-amber-300",
      bgPattern: "bg-gradient-to-br from-amber-900/20 to-orange-900/30",
    },
    0.2: {
      name: "SILVER", 
      gradient: "from-slate-400 via-gray-500 to-slate-600",
      borderColor: "border-slate-400",
      accentColor: "text-slate-300",
      bgPattern: "bg-gradient-to-br from-slate-800/20 to-gray-800/30",
    },
    0.5: {
      name: "GOLD",
      gradient: "from-yellow-400 via-amber-500 to-yellow-600",
      borderColor: "border-yellow-400",
      accentColor: "text-yellow-200",
      bgPattern: "bg-gradient-to-br from-yellow-900/20 to-amber-900/30",
    },
    0.7: {
      name: "PLATINUM",
      gradient: "from-indigo-400 via-purple-500 to-pink-500",
      borderColor: "border-purple-400",
      accentColor: "text-purple-200",
      bgPattern: "bg-gradient-to-br from-purple-900/20 to-pink-900/30",
    },
    1.0: {
      name: "DIAMOND",
      gradient: "from-cyan-400 via-blue-500 to-indigo-600",
      borderColor: "border-cyan-400",
      accentColor: "text-cyan-200",
      bgPattern: "bg-gradient-to-br from-cyan-900/20 to-blue-900/30",
    }
  };
  return designs[ticketCost as keyof typeof designs] || designs[0.1];
};

export function ScratchCardModal({ 
  isOpen, 
  onClose, 
  ticketCost, 
  walletAddress, 
  isDemoMode,
  onGameComplete 
}: ScratchCardModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [gameSymbols, setGameSymbols] = useState<string[]>([]);
  const [revealedZones, setRevealedZones] = useState<boolean[]>([false, false, false]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactionPending, setTransactionPending] = useState(false);
  const [autoRevealAll, setAutoRevealAll] = useState(false);
  
  // Solana wallet hooks for real mode
  const wallet = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const createGameMutation = useMutation({
    mutationFn: async (gameData: any) => {
      const response = await apiRequest('POST', '/api/games', gameData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
  });

  const payoutMutation = useMutation({
    mutationFn: async (payoutData: any) => {
      const response = await apiRequest('POST', '/api/games/payout', payoutData);
      return response.json();
    },
  });

  // Initialize game when modal opens
  useEffect(() => {
    if (isOpen && gameSymbols.length === 0) {
      initializeGame();
    }
  }, [isOpen]);

  // Check for game completion when all zones are revealed
  useEffect(() => {
    if (revealedZones.every(revealed => revealed) && gameSymbols.length > 0 && !showResult) {
      handleGameComplete();
    }
  }, [revealedZones, gameSymbols, showResult]);

  const initializeGame = async () => {
    try {
      setLoading(true);
      
      let purchaseSignature = '';
      
      if (!isDemoMode) {
        // Handle real mode - require wallet connection and process payment
        if (!wallet.connected || !wallet.publicKey || !wallet.sendTransaction) {
          setVisible(true); // Open wallet modal
          toast({
            title: "Wallet Required",
            description: "Please connect your wallet to play in Real Mode",
            variant: "destructive",
          });
          onClose();
          return;
        }
        
        // Process real Solana transaction
        setTransactionPending(true);
        try {
          const poolWallet = import.meta.env.VITE_POOL_WALLET;
          const teamWallet = import.meta.env.VITE_TEAM_WALLET;
          
          // Validate environment variables
          if (!poolWallet || !teamWallet) {
            throw new Error('Wallet addresses not configured. Please contact support.');
          }
          
          const transactionResult = await purchaseTicket({
            wallet,
            connection,
            ticketCost,
            poolWallet,
            teamWallet
          });
          
          if (!transactionResult.success) {
            throw new Error(transactionResult.error || 'Transaction failed');
          }
          
          purchaseSignature = transactionResult.signature || '';
          
          toast({
            title: "🎉 Payment Confirmed!",
            description: `Successfully paid ${formatSOL(ticketCost)} SOL. Game starting...`,
            className: "bg-green-600/20 border-green-600/50",
          });
        } catch (error) {
          console.error('Transaction failed:', error);
          const errorMsg = error instanceof Error ? error.message : "Transaction failed";
          
          let userFriendlyMsg = errorMsg;
          if (errorMsg.includes('insufficient')) {
            userFriendlyMsg = "Insufficient SOL balance. Please add funds to your wallet.";
          } else if (errorMsg.includes('User rejected')) {
            userFriendlyMsg = "Transaction was cancelled. Please try again.";
          } else if (errorMsg.includes('Network')) {
            userFriendlyMsg = "Network connection issue. Please check your internet and try again.";
          } else if (errorMsg.includes('Invalid')) {
            userFriendlyMsg = "Wallet configuration error. Please contact support.";
          }
          
          toast({
            title: "Payment Failed",
            description: userFriendlyMsg,
            variant: "destructive",
          });
          onClose();
          return;
        } finally {
          setTransactionPending(false);
        }
      } else {
        // Demo mode signature
        purchaseSignature = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Generate game symbols
      const symbols = generateGameSymbols();
      setGameSymbols(symbols);
      setRevealedZones([false, false, false]);
      setShowResult(false);
      setGameResult(null);
      
      // Only save to database for real games, not demo games
      if (!isDemoMode) {
        await createGameMutation.mutateAsync({
          playerWallet: wallet.publicKey!.toString(),
          ticketType: ticketCost.toString(),
          maxWin: (ticketCost * 10).toString(),
          symbols,
          isWin: false,
          multiplier: 0,
          winAmount: '0',
          purchaseSignature,
        });
      }

      const modeText = isDemoMode ? "Demo Game Started" : "Game Started";
      const description = isDemoMode 
        ? "Scratch each zone to reveal symbols! Demo mode active."
        : `Spent ${formatSOL(ticketCost)} SOL. Scratch each zone to reveal!`;

      toast({
        title: modeText,
        description,
        className: isDemoMode ? "bg-neon-orange/20 border-neon-orange/50" : "bg-electric-blue/20 border-electric-blue/50",
      });
    } catch (error) {
      console.error('Game initialization failed:', error);
      toast({
        title: "Game failed to start",
        description: "Please try again.",
        variant: "destructive",
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleZoneComplete = (zoneIndex: number) => {
    setRevealedZones(prev => {
      const newRevealed = [...prev];
      newRevealed[zoneIndex] = true;
      return newRevealed;
    });
  };

  const handleScratchAll = () => {
    setAutoRevealAll(true);
    setRevealedZones([true, true, true]);
  };

  const handleGameComplete = async () => {
    // Check for win
    const result = checkWin(gameSymbols);
    const winAmount = result.isWin ? calculateWinAmount(ticketCost, result.multiplier) : 0;
    
    const gameResult = {
      isWin: result.isWin,
      multiplier: result.multiplier,
      winAmount,
    };

    setGameResult(gameResult);
    
    // Track user stats for Real Mode only
    if (!isDemoMode && wallet.publicKey) {
      const statsManager = getUserStatsManager(wallet.publicKey);
      if (statsManager) {
        // Map ticket cost to card type
        const cardTypeMap: Record<number, string> = {
          0.1: 'starter',
          0.25: 'bronze', 
          0.5: 'silver',
          0.75: 'gold',
          1.0: 'platinum'
        };
        
        statsManager.recordGamePlay({
          cardType: cardTypeMap[ticketCost] || 'starter',
          solAmount: ticketCost,
          isWin: result.isWin,
          prizeAmount: winAmount,
          symbols: gameSymbols,
          multiplier: result.multiplier
        });
      }
    }
    
    // Update the game with final results
    const currentWalletAddress = isDemoMode ? walletAddress : (wallet.publicKey?.toString() || walletAddress);
    
    // Handle payout if won
    if (result.isWin && !isDemoMode && wallet.publicKey) {
      console.log('🏆 WINNER! Attempting payout...');
      console.log(`🏆 Win amount: ${winAmount} SOL`);
      console.log(`🏆 Player wallet: ${wallet.publicKey.toString()}`);
      console.log(`🏆 Ticket cost: ${ticketCost} SOL`);
      console.log(`🏆 Multiplier: ${result.multiplier}x`);
      
      try {
        const payoutResult = await payoutMutation.mutateAsync({
          playerWallet: wallet.publicKey.toString(),
          winAmount: winAmount.toString(),
          ticketCost: ticketCost.toString()
        });
        
        console.log('✅ Payout successful:', payoutResult);
        
        toast({
          title: "🎉 You Won!",
          description: `${formatSOL(winAmount)} SOL has been sent to your wallet!`,
          className: "bg-green-600/20 border-green-600/50",
        });
      } catch (error) {
        console.error('❌ Payout failed:', error);
        
        let errorMsg = "Win recorded but payout failed.";
        if (error instanceof Error) {
          if (error.message.includes('Insufficient pool balance')) {
            errorMsg = "Pool wallet has insufficient funds for payout. Please contact support.";
          } else if (error.message.includes('Payout transaction failed')) {
            errorMsg = "Blockchain transaction failed. Your win is recorded - contact support.";
          }
        }
        
        toast({
          title: "Payout Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } else if (result.isWin && isDemoMode) {
      toast({
        title: "🎉 Demo Win!",
        description: `You would have won ${formatSOL(winAmount)} SOL in Real Mode!`,
        className: "bg-neon-orange/20 border-neon-orange/50",
      });
    }

    // Show result with delay for dramatic effect
    setTimeout(() => {
      setShowResult(true);
      onGameComplete(gameResult);
    }, 1000);
  };

  const handlePlayAgain = () => {
    setGameSymbols([]);
    setRevealedZones([false, false, false]);
    setShowResult(false);
    setGameResult(null);
    setAutoRevealAll(false);
    initializeGame();
  };

  const handleCloseModal = () => {
    setGameSymbols([]);
    setRevealedZones([false, false, false]);
    setShowResult(false);
    setGameResult(null);
    setAutoRevealAll(false);
    onClose();
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const cardDesign = getCardDesign(ticketCost);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-deep-space via-dark-purple/50 to-deep-space flex items-center justify-center z-50 overflow-hidden">
      {/* Floating scratch card - centered and responsive */}
      <div className={`
        relative w-full max-w-md sm:max-w-lg lg:max-w-xl
        mx-auto my-8 rounded-3xl transform transition-all duration-300
        bg-gradient-to-br from-dark-purple/98 to-deep-space/98 backdrop-blur-lg
        border-2 ${cardDesign.borderColor} ${cardDesign.bgPattern}
        shadow-2xl shadow-black/50 hover:shadow-neon-cyan/20
        scale-95 sm:scale-100
      `}>
        {/* Close Button - Top Right */}
        <button
          onClick={handleCloseModal}
          className="absolute -top-3 -right-3 z-20 w-10 h-10 bg-red-600/90 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg border-2 border-red-500/30 backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Card Header */}
        <div className="relative p-6 text-center border-b border-white/10">
          
          <div className={`text-xs font-bold ${cardDesign.accentColor} mb-2`}>
            {cardDesign.name} TIER
          </div>
          <img 
            src={scratchNSolLogo} 
            alt="Scratch 'n SOL" 
            className="w-16 h-16 mx-auto mb-2 rounded-lg"
          />
          <div className="text-lg font-black text-white mb-2">
            SCRATCH 'N SOL
          </div>
          <div className={`text-2xl font-black ${cardDesign.accentColor} mb-2`}>
            {formatSOL(ticketCost)} SOL
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
            isDemoMode 
              ? 'bg-neon-orange/20 text-neon-orange border border-neon-orange/50' 
              : 'bg-electric-blue/20 text-electric-blue border border-electric-blue/50'
          }`}>
            {isDemoMode ? '🟢 DEMO' : '🟣 REAL'}
          </div>
        </div>

        {/* Game Content */}
        <div className="p-4 sm:p-6 relative">
          {/* Background Pattern */}
          <div className={`absolute inset-0 bg-gradient-to-br ${cardDesign.gradient} opacity-5 rounded-b-3xl`} />
          <div className="relative z-10">
          {(loading || transactionPending) ? (
            <div className="text-center py-12">
              <div className={`${cardDesign.accentColor} text-lg font-bold mb-4`}>
                {transactionPending ? "Processing Payment..." : "Initializing Game..."}
              </div>
              <div className={`animate-spin w-8 h-8 border-2 border-current border-t-transparent rounded-full mx-auto mb-4`}></div>
              <div className="text-sm text-gray-400">
                {transactionPending ? 
                  "Please confirm the transaction in your wallet" :
                  "Setting up your scratch card..."
                }
              </div>
            </div>
          ) : showResult && gameResult ? (
            /* Result Screen */
            <div className="text-center py-8">
              <div className="text-6xl mb-6 animate-bounce">
                {gameResult.isWin ? '🏆' : '❌'}
              </div>
              <h3 className={`text-3xl font-black mb-4 ${
                gameResult.isWin ? 'text-neon-gold' : 'text-red-400'
              }`}>
                {gameResult.isWin ? 'WINNER!' : 'Better Luck Next Time!'}
              </h3>
              {gameResult.isWin && (
                <>
                  <div className="text-4xl font-black text-electric-blue mb-2">
                    {formatSOL(gameResult.winAmount)} SOL
                  </div>
                  <p className="text-neon-cyan mb-2">Multiplier: {gameResult.multiplier}x</p>
                  <p className="text-gray-300 mb-6">
                    {isDemoMode ? "Demo win! No actual payout." : "Prize sent to your wallet!"}
                  </p>
                </>
              )}
              {!gameResult.isWin && (
                <p className="text-gray-300 mb-6">
                  Symbols: {gameSymbols.join(' ')} - No match this time!
                </p>
              )}
              <div className="flex justify-center space-x-4">
                <Button 
                  onClick={handlePlayAgain}
                  className={`bg-gradient-to-r ${cardDesign.gradient} text-black font-black px-8 py-3 rounded-lg hover:shadow-lg transition-all duration-300`}
                >
                  PLAY AGAIN
                </Button>
                <Button 
                  onClick={handleCloseModal}
                  className={`bg-gradient-to-r from-gray-600/20 to-gray-700/20 border-2 ${cardDesign.borderColor} ${cardDesign.accentColor} font-bold px-8 py-3 rounded-lg hover:bg-gray-600/30 transition-all duration-300`}
                >
                  EXIT
                </Button>
              </div>
            </div>
          ) : gameSymbols.length > 0 ? (
            /* Scratch Zones */
            <div>
              <div className="text-center mb-6">
                <h3 className={`text-lg sm:text-xl font-bold ${cardDesign.accentColor} mb-2`}>Scratch Each Zone</h3>
                <p className="text-gray-300 text-sm">
                  Scratch all 3 zones to reveal symbols. Match all 3 to win!
                </p>
                <div className={`${cardDesign.accentColor} text-xs mt-2`}>
                  Max Win: {formatSOL(ticketCost * 10)} SOL • Multipliers: 1x-10x
                </div>
              </div>

              {/* Scratch All Button */}
              <div className="text-center mb-4">
                <Button 
                  onClick={handleScratchAll}
                  disabled={revealedZones.some(r => r)}
                  className={`bg-gradient-to-r ${cardDesign.gradient} text-black font-black px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  ⚡ SCRATCH ALL
                </Button>
                <p className="text-xs text-gray-400 mt-1">
                  Reveal all zones instantly
                </p>
              </div>

              {/* Scratch Zones Grid - Responsive */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 max-w-sm mx-auto">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex flex-col items-center">
                    <ScratchZone
                      width={100}
                      height={90}
                      scratchRadius={18}
                      symbol={gameSymbols[index] || ''}
                      onComplete={() => handleZoneComplete(index)}
                      isRevealed={revealedZones[index]}
                      zoneIndex={index}
                      autoReveal={autoRevealAll}
                    />
                  </div>
                ))}
              </div>

              {/* Progress Indicator */}
              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  Zones completed: {revealedZones.filter(r => r).length}/3
                </p>
                {revealedZones.filter(r => r).length === 3 && (
                  <p className={`${cardDesign.accentColor} text-sm animate-pulse mt-2`}>
                    Checking results...
                  </p>
                )}
              </div>
            </div>
          ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}