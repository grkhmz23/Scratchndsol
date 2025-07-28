import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateGameSymbols, checkWin, calculateWinAmount, formatSOL } from '@/lib/game-logic';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ScratchCardProps {
  ticketCost: number;
  onGameComplete: (result: { isWin: boolean; multiplier: number; winAmount: number }) => void;
  onNewGame: () => void;
  walletAddress: string;
}

interface ScratchSlotProps {
  symbol: string;
  isRevealed: boolean;
  onReveal: () => void;
  disabled: boolean;
}

function ScratchSlot({ symbol, isRevealed, onReveal, disabled }: ScratchSlotProps) {
  return (
    <div 
      className="scratch-slot relative bg-deep-space border-2 border-neon-cyan rounded-lg h-24 flex items-center justify-center cursor-pointer transition-all duration-300 hover:border-neon-orange"
      onClick={!disabled && !isRevealed ? onReveal : undefined}
      style={{ 
        pointerEvents: disabled || isRevealed ? 'none' : 'auto',
        opacity: disabled ? 0.5 : 1 
      }}
    >
      {!isRevealed ? (
        <div className="scratch-overlay absolute inset-0 bg-gradient-to-br from-neon-cyan/30 to-electric-blue/30 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold">SCRATCH</span>
        </div>
      ) : (
        <div className="symbol text-4xl animate-scratch-reveal">{symbol}</div>
      )}
    </div>
  );
}

export function ScratchCard({ ticketCost, onGameComplete, onNewGame, walletAddress }: ScratchCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [gameSymbols, setGameSymbols] = useState<string[]>([]);
  const [revealedSlots, setRevealedSlots] = useState<boolean[]>([false, false, false]);
  const [gameStarted, setGameStarted] = useState(false);
  const [loading, setLoading] = useState(false);

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



  const handleBuyCard = async () => {
    if (!walletAddress) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to buy a card.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // For now, simulate transaction for demo purposes
      // In production, this would use actual Solana wallet signing
      const mockSignature = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate game symbols
      const symbols = generateGameSymbols();
      setGameSymbols(symbols);
      setGameStarted(true);
      
      // Create game record
      await createGameMutation.mutateAsync({
        playerWallet: walletAddress,
        ticketType: ticketCost.toString(),
        maxWin: (ticketCost * 10).toString(),
        symbols,
        isWin: false,
        multiplier: 0,
        winAmount: '0',
        purchaseSignature: mockSignature,
      });

      toast({
        title: "Card purchased!",
        description: "Start scratching to reveal your symbols!",
      });
    } catch (error) {
      console.error('Purchase failed:', error);
      toast({
        title: "Purchase failed",
        description: "Failed to start game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevealSlot = (index: number) => {
    setRevealedSlots(prev => {
      const newRevealed = [...prev];
      newRevealed[index] = true;
      return newRevealed;
    });
  };

  useEffect(() => {
    if (revealedSlots.every(revealed => revealed) && gameSymbols.length > 0) {
      // All slots revealed, check for win
      const gameResult = checkWin(gameSymbols);
      const winAmount = gameResult.isWin ? calculateWinAmount(ticketCost, gameResult.multiplier) : 0;
      

      
      // Handle payout if won
      if (gameResult.isWin && walletAddress) {
        payoutMutation.mutate({
          playerWallet: walletAddress,
          winAmount: winAmount.toString(),
          ticketCost: ticketCost.toString(),
        });
      }
      
      setTimeout(() => {
        onGameComplete({
          isWin: gameResult.isWin,
          multiplier: gameResult.multiplier,
          winAmount,
        });
      }, 1000);
    }
  }, [revealedSlots, gameSymbols, ticketCost, onGameComplete, walletAddress, payoutMutation]);

  return (
    <section className="mb-12">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gradient-to-br from-dark-purple/50 to-deep-space/50 border-2 border-neon-cyan backdrop-blur-sm">
          <CardContent className="p-8">
            <h3 className="text-2xl font-black text-center mb-6 text-neon-cyan">
              SCRATCH TO REVEAL
            </h3>
            
            {/* Selected Card Info */}
            <div className="text-center mb-8">
              <div className="inline-block bg-dark-purple/50 border border-neon-orange rounded-lg px-6 py-2">
                <span className="text-neon-orange font-bold">Card Cost: </span>
                <span className="text-neon-gold font-black">{formatSOL(ticketCost)}</span>
              </div>
            </div>

            {/* Scratch Card */}
            <div className="relative bg-gradient-to-br from-neon-gold/20 to-neon-orange/20 border-2 border-neon-gold rounded-xl p-8 mb-6">
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }, (_, index) => (
                  <ScratchSlot
                    key={index}
                    symbol={gameSymbols[index] || ''}
                    isRevealed={revealedSlots[index]}
                    onReveal={() => handleRevealSlot(index)}
                    disabled={!gameStarted}
                  />
                ))}
              </div>

              {/* Game Instructions */}
              <div className="text-center mt-6">
                <p className="text-gray-300 text-sm">Match all 3 symbols to win!</p>
                <p className="text-neon-gold text-xs mt-1">Possible multipliers: 1x, 2x, 5x, 10x</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              {!gameStarted ? (
                <Button 
                  onClick={handleBuyCard}
                  disabled={loading || !walletAddress}
                  className="bg-gradient-to-r from-neon-orange to-neon-gold text-black font-black px-8 py-3 rounded-lg hover:shadow-neon-gold transition-all duration-300 hover:transform hover:scale-105"
                >
                  {loading ? 'PROCESSING...' : 'BUY CARD'}
                </Button>
              ) : (
                <Button 
                  onClick={onNewGame}
                  className="bg-gradient-to-r from-neon-cyan/20 to-electric-blue/20 border-2 border-neon-cyan text-neon-cyan font-bold px-8 py-3 rounded-lg hover:border-neon-orange hover:text-neon-orange transition-all duration-300"
                >
                  NEW GAME
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
