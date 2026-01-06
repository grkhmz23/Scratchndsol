import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatSOL } from '@/lib/game-logic';

interface ScratchCardGridProps {
  // Support all possible callback names for compatibility
  onCardSelect?: (cost: number) => void;
  onSelectTicket?: (cost: number) => void;
  onSelect?: (cost: number) => void;
  isDemoMode?: boolean;
  disabled?: boolean;
}

interface CardDesign {
  id: string;
  name: string;
  cost: number;
  description: string;
  maxWin: string;
  gradient: string;
  border: string;
  glow: string;
}

const cardDesigns: CardDesign[] = [
  {
    id: 'bronze',
    name: 'BRONZE',
    cost: 0.1,
    description: 'Perfect for beginners',
    maxWin: `${formatSOL(0.1 * 10)}`,
    gradient: 'from-amber-700/20 to-orange-600/20',
    border: 'border-amber-500/50',
    glow: 'shadow-amber-500/20',
  },
  {
    id: 'silver',
    name: 'SILVER',
    cost: 0.2,
    description: 'Better odds, bigger wins',
    maxWin: `${formatSOL(0.2 * 10)}`,
    gradient: 'from-slate-400/20 to-gray-300/20',
    border: 'border-slate-300/50',
    glow: 'shadow-slate-300/20',
  },
  {
    id: 'gold',
    name: 'GOLD',
    cost: 0.5,
    description: 'Premium experience',
    maxWin: `${formatSOL(0.5 * 10)}`,
    gradient: 'from-yellow-500/20 to-amber-400/20',
    border: 'border-yellow-400/50',
    glow: 'shadow-yellow-400/20',
  },
  {
    id: 'platinum',
    name: 'PLATINUM',
    cost: 0.75,
    description: 'High stakes, high rewards',
    maxWin: `${formatSOL(0.75 * 10)}`,
    gradient: 'from-purple-500/20 to-indigo-400/20',
    border: 'border-purple-400/50',
    glow: 'shadow-purple-400/20',
  },
  {
    id: 'diamond',
    name: 'DIAMOND',
    cost: 1.0,
    description: 'Ultimate jackpot potential',
    maxWin: `${formatSOL(1.0 * 10)}`,
    gradient: 'from-cyan-500/20 to-blue-400/20',
    border: 'border-cyan-400/50',
    glow: 'shadow-cyan-400/20',
  },
];

export function ScratchCardGrid({ 
  onCardSelect, 
  onSelectTicket, 
  onSelect, 
  isDemoMode,
  disabled = false 
}: ScratchCardGridProps) {
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);

  const emitSelect = (cost: number) => {
    // Try all possible callback names
    const cb = onCardSelect ?? onSelectTicket ?? onSelect;
    if (typeof cb !== 'function') {
      console.error('ScratchCardGrid: missing selection callback. Pass onCardSelect, onSelectTicket, or onSelect.');
      return;
    }
    cb(cost);
  };

  const handleSelectTicket = (cost: number) => {
    if (disabled) return;
    setSelectedTicket(cost);
    emitSelect(cost);
  };

  return (
    <section className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black mb-4 bg-gradient-to-r from-neon-cyan to-neon-orange bg-clip-text text-transparent">
          CHOOSE YOUR CARD
        </h2>
        <p className="text-gray-300 text-lg">
          Select a scratch card tier and test your luck
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-6xl mx-auto">
        {cardDesigns.map((card) => (
          <div
            key={card.id}
            className={`
              relative bg-gradient-to-br ${card.gradient}
              border-2 ${card.border}
              rounded-2xl p-6 cursor-pointer
              transition-all duration-300 hover:scale-105
              ${card.glow} hover:shadow-lg
              ${selectedTicket === card.cost ? 'ring-2 ring-neon-cyan shadow-neon-cyan/30' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onClick={() => handleSelectTicket(card.cost)}
          >
            <div className="text-center">
              <h3 className="text-2xl font-black mb-2 text-white">{card.name}</h3>
              <div className="text-3xl font-black mb-3 text-neon-gold">
                {formatSOL(card.cost)}
              </div>
              <p className="text-gray-300 text-sm mb-4">{card.description}</p>

              <div className="bg-dark-purple/30 rounded-lg p-3 mb-4">
                <div className="text-xs text-gray-400 mb-1">MAX WIN</div>
                <div className="text-lg font-bold text-neon-orange">{card.maxWin}</div>
              </div>

              <Button
                className={`
                  w-full font-bold
                  ${selectedTicket === card.cost
                    ? 'bg-gradient-to-r from-neon-cyan to-electric-blue text-black'
                    : 'bg-dark-purple/50 border border-white/20 text-white hover:bg-white/10'
                  }
                `}
                disabled={disabled}
              >
                {selectedTicket === card.cost ? 'SELECTED' : 'SELECT'}
              </Button>
            </div>

            {selectedTicket === card.cost && (
              <div className="absolute -top-2 -right-2 bg-neon-cyan text-black rounded-full w-8 h-8 flex items-center justify-center font-black">
                ✓
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}