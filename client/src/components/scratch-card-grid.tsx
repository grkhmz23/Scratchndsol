import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useChainConfig } from '@/contexts/chain-context';

interface ScratchCardGridProps {
  onCardSelect?: (cost: number) => void;
  onSelectTicket?: (cost: number) => void;
  onSelect?: (cost: number) => void;
  isDemoMode?: boolean;
  disabled?: boolean;
}

interface CardStyle {
  gradient: string;
  border: string;
  glow: string;
}

const cardStyles: CardStyle[] = [
  {
    gradient: 'from-amber-700/20 to-orange-600/20',
    border: 'border-amber-500/50',
    glow: 'shadow-amber-500/20',
  },
  {
    gradient: 'from-slate-400/20 to-gray-300/20',
    border: 'border-slate-300/50',
    glow: 'shadow-slate-300/20',
  },
  {
    gradient: 'from-yellow-500/20 to-amber-400/20',
    border: 'border-yellow-400/50',
    glow: 'shadow-yellow-400/20',
  },
  {
    gradient: 'from-purple-500/20 to-indigo-400/20',
    border: 'border-purple-400/50',
    glow: 'shadow-purple-400/20',
  },
  {
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
  const { formatAmount, ticketTiers } = useChainConfig();

  const emitSelect = (cost: number) => {
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
        {ticketTiers.map((ticket, index) => {
          const styles = cardStyles[index] || cardStyles[0];
          return (
            <div
              key={ticket.cost}
              className={`
                relative bg-gradient-to-br ${styles.gradient}
                border-2 ${styles.border}
                rounded-2xl p-6 cursor-pointer
                transition-all duration-300 hover:scale-105
                ${styles.glow} hover:shadow-lg
                ${selectedTicket === ticket.cost ? 'ring-2 ring-neon-cyan shadow-neon-cyan/30' : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => handleSelectTicket(ticket.cost)}
            >
              <div className="text-center">
                <h3 className="text-2xl font-black mb-2 text-white">{ticket.label.toUpperCase()}</h3>
                <div className="text-3xl font-black mb-3 text-neon-gold">
                  {formatAmount(ticket.cost)}
                </div>
                <p className="text-gray-300 text-sm mb-4">
                  {index === 0 ? 'Perfect for beginners' :
                   index === 1 ? 'Better odds, bigger wins' :
                   index === 2 ? 'Premium experience' :
                   index === 3 ? 'High stakes, high rewards' :
                   'Maximum multiplier potential'}
                </p>

                <div className="bg-dark-purple/30 rounded-lg p-3 mb-4">
                  <div className="text-xs text-gray-400 mb-1">MAX WIN</div>
                  <div className="text-lg font-bold text-neon-orange">{formatAmount(ticket.maxWin)}</div>
                </div>

                <Button
                  className={`
                    w-full font-bold
                    ${selectedTicket === ticket.cost
                      ? 'bg-gradient-to-r from-neon-cyan to-electric-blue text-black'
                      : 'bg-dark-purple/50 border border-white/20 text-white hover:bg-white/10'
                    }
                  `}
                  disabled={disabled}
                >
                  {selectedTicket === ticket.cost ? 'SELECTED' : 'SELECT'}
                </Button>
              </div>

              {selectedTicket === ticket.cost && (
                <div className="absolute -top-2 -right-2 bg-neon-cyan text-black rounded-full w-8 h-8 flex items-center justify-center font-black">
                  ✓
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
