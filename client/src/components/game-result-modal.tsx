import { Button } from '@/components/ui/button';
import { formatSOL } from '@/lib/game-logic';

interface GameResultModalProps {
  result: {
    isWin: boolean;
    multiplier: number;
    winAmount: number;
  };
  onClose: () => void;
  onNewGame: () => void;
}

export function GameResultModal({ result, onClose, onNewGame }: GameResultModalProps) {
  const handlePlayAgain = () => {
    onClose();
    onNewGame();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gradient-to-br from-dark-purple to-deep-space border-2 border-neon-gold rounded-2xl p-8 max-w-md mx-4 text-center animate-scratch-reveal">
        {result.isWin ? (
          <div>
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-3xl font-black text-success-green mb-4">YOU WON!</h3>
            <div className="text-5xl font-black text-neon-gold mb-2">
              {formatSOL(result.winAmount)}
            </div>
            <div className="text-neon-cyan mb-6">
              {result.multiplier}x Multiplier!
            </div>
            <div className="text-sm text-gray-300 mb-6">Prize sent to your wallet</div>
          </div>
        ) : (
          <div>
            <div className="text-6xl mb-4">😔</div>
            <h3 className="text-3xl font-black text-error-red mb-4">YOU LOST!</h3>
            <div className="text-neon-cyan mb-6">Better luck next time!</div>
          </div>
        )}

        <Button 
          onClick={handlePlayAgain}
          className="bg-gradient-to-r from-neon-cyan to-electric-blue text-black font-bold px-8 py-3 rounded-lg hover:shadow-neon-cyan transition-all duration-300"
        >
          PLAY AGAIN
        </Button>
      </div>
    </div>
  );
}
