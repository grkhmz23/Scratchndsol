import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatSOL } from '@/lib/game-logic';
import scratchNSolLogo from '@assets/ChatGPT Image 28 juil. 2025, 10_17_36_1753690663892.png';

interface ScratchCardGridProps {
  onCardSelect: (ticketCost: number) => void;
  isDemoMode: boolean;
}

const ticketTypes = [0.1, 0.2, 0.5, 0.7, 1.0];

const cardDesigns = [
  {
    cost: 0.1,
    name: "BRONZE",
    gradient: "from-amber-600 via-yellow-700 to-amber-800",
    borderColor: "border-amber-500",
    accentColor: "text-amber-300",
    bgPattern: "bg-gradient-to-br from-amber-900/20 to-orange-900/30",
    shadowColor: "shadow-amber-500/20",
  },
  {
    cost: 0.2,
    name: "SILVER", 
    gradient: "from-slate-400 via-gray-500 to-slate-600",
    borderColor: "border-slate-400",
    accentColor: "text-slate-300",
    bgPattern: "bg-gradient-to-br from-slate-800/20 to-gray-800/30",
    shadowColor: "shadow-slate-400/20",
  },
  {
    cost: 0.5,
    name: "GOLD",
    gradient: "from-yellow-400 via-amber-500 to-yellow-600",
    borderColor: "border-yellow-400",
    accentColor: "text-yellow-200",
    bgPattern: "bg-gradient-to-br from-yellow-900/20 to-amber-900/30",
    shadowColor: "shadow-yellow-400/30",
  },
  {
    cost: 0.7,
    name: "PLATINUM",
    gradient: "from-indigo-400 via-purple-500 to-pink-500",
    borderColor: "border-purple-400",
    accentColor: "text-purple-200",
    bgPattern: "bg-gradient-to-br from-purple-900/20 to-pink-900/30",
    shadowColor: "shadow-purple-400/30",
  },
  {
    cost: 1.0,
    name: "DIAMOND",
    gradient: "from-cyan-400 via-blue-500 to-indigo-600",
    borderColor: "border-cyan-400",
    accentColor: "text-cyan-200",
    bgPattern: "bg-gradient-to-br from-cyan-900/20 to-blue-900/30",
    shadowColor: "shadow-cyan-400/40",
  },
];

export function ScratchCardGrid({ onCardSelect, isDemoMode }: ScratchCardGridProps) {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const handleCardClick = (ticketCost: number) => {
    onCardSelect(ticketCost);
  };

  return (
    <section className="mb-12">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black text-neon-cyan mb-4">
          Choose Your Card
        </h2>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Select a scratch card to play. Higher value cards offer bigger potential winnings with multipliers up to 10x!
        </p>
        <div className={`inline-flex items-center px-4 py-2 rounded-full mt-4 ${
          isDemoMode 
            ? 'bg-neon-orange/20 text-neon-orange border border-neon-orange/50' 
            : 'bg-electric-blue/20 text-electric-blue border border-electric-blue/50'
        }`}>
          {isDemoMode ? '🟢 DEMO MODE ACTIVE' : '🟣 REAL MODE ACTIVE'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
        {cardDesigns.map((design) => (
          <Card
            key={design.cost}
            className={`
              relative overflow-hidden cursor-pointer transition-all duration-300 transform
              ${design.borderColor} ${design.shadowColor} ${design.bgPattern}
              ${hoveredCard === design.cost ? 'scale-105 shadow-2xl' : 'hover:scale-102'}
              bg-gradient-to-br from-dark-purple/80 to-deep-space/90 backdrop-blur-sm
              border-2 hover:shadow-xl
            `}
            onMouseEnter={() => setHoveredCard(design.cost)}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => handleCardClick(design.cost)}
          >
            <CardContent className="p-0 h-80 flex flex-col">
              {/* Card Header */}
              <div className="p-4 text-center">
                <div className={`text-xs font-bold ${design.accentColor} mb-2`}>
                  {design.name} TIER
                </div>
                <img 
                  src={scratchNSolLogo} 
                  alt="Scratch 'n SOL" 
                  className="w-16 h-16 mx-auto mb-2 rounded-lg"
                />
                <div className="text-lg font-black text-white">
                  SCRATCH 'N SOL
                </div>
              </div>

              {/* Card Body - Decorative Pattern */}
              <div className="flex-1 relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${design.gradient} opacity-10`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                
                {/* Decorative Elements */}
                <div className="absolute top-4 left-4 w-8 h-8 border-2 border-white/20 rounded-full" />
                <div className="absolute top-4 right-4 w-8 h-8 border-2 border-white/20 rounded-full" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-2 border-white/20 rounded-full" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-2 border-white/20 rounded-full" />
                
                {/* Center Symbol */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`text-6xl font-black ${design.accentColor} opacity-30`}>
                    ◊
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 bg-black/40 backdrop-blur-sm">
                <div className="text-center mb-3">
                  <div className={`text-2xl font-black ${design.accentColor}`}>
                    {formatSOL(design.cost)} SOL
                  </div>
                  <div className="text-xs text-gray-400">
                    Max Win: {formatSOL(design.cost * 10)} SOL
                  </div>
                </div>
                
                <Button
                  className={`
                    w-full bg-gradient-to-r ${design.gradient} text-black font-black 
                    py-2 rounded-lg transition-all duration-300 hover:shadow-lg
                    ${hoveredCard === design.cost ? 'shadow-lg transform scale-105' : ''}
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick(design.cost);
                  }}
                >
                  PLAY
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Info */}
      <div className="text-center mt-8">
        <p className="text-gray-400 text-sm">
          {isDemoMode 
            ? "Demo mode: Play without spending real SOL. No actual winnings." 
            : "Real mode: Spend SOL from your wallet. Win real prizes!"}
        </p>
        <div className="flex justify-center space-x-6 mt-4 text-xs text-gray-500">
          <span>• Instant results</span>
          <span>• Fair & transparent</span>
          <span>• Multipliers: 1x, 2x, 5x, 10x</span>
        </div>
      </div>
    </section>
  );
}