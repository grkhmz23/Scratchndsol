// Classic 3x3 Slots Configuration
// Target RTP: 88-90% with balanced symbol weights and payouts

export interface SlotSymbol {
  id: string;
  name: string;
  weight: number;    // Higher weight = more common
  payout3: number;   // Payout multiplier for 3 matching symbols
  color: string;     // Display color for UI
}

export const SYMBOLS: SlotSymbol[] = [
  { 
    id: "seven", 
    name: "Lucky Seven", 
    weight: 5, 
    payout3: 20, 
    color: "#FFD700" 
  }, // rare, big payout
  { 
    id: "diamond", 
    name: "Diamond", 
    weight: 8, 
    payout3: 10, 
    color: "#E0E7FF" 
  },
  { 
    id: "rocket", 
    name: "Rocket", 
    weight: 12, 
    payout3: 5, 
    color: "#FF6B35" 
  },
  { 
    id: "coin", 
    name: "Coin", 
    weight: 16, 
    payout3: 3, 
    color: "#00FFFF" 
  },
  { 
    id: "tear", 
    name: "Tear", 
    weight: 22, 
    payout3: 2, 
    color: "#0080FF" 
  },
  { 
    id: "rug", 
    name: "Rug", 
    weight: 30, 
    payout3: 0, 
    color: "#FF0000" 
  }  // most common, no payout (scatter)
];

// Paylines for 3x3 grid (positions 0-8)
// 0 1 2
// 3 4 5  
// 6 7 8
export const PAYLINES = [
  [0, 1, 2], // Top horizontal
  [3, 4, 5], // Middle horizontal  
  [6, 7, 8], // Bottom horizontal
  [0, 4, 8], // Diagonal top-left to bottom-right
  [2, 4, 6]  // Diagonal top-right to bottom-left
];

// Bet amounts in SOL (Real mode)
export const REAL_BET_AMOUNTS = [0.1, 0.3, 0.5];

// Demo bet units (no real value)
export const DEMO_BET_AMOUNTS = [1, 2, 5];

// Game configuration
export const GAME_CONFIG = {
  GRID_SIZE: 3,
  REEL_COUNT: 3,
  SYMBOLS_PER_REEL: 3,
  MIN_MATCH_LENGTH: 3,
  TARGET_RTP: 0.89, // 89% return to player
  RESERVE_SOL: 0.2, // Keep 0.2 SOL minimum in pool
  MAX_AUTO_SPINS: 25,
  ANIMATION_DURATION: 2000, // 2 seconds for reel animation
  SPIN_DELAY: 100 // Delay between reel stops
};

// Calculate total weight for symbol selection
export const TOTAL_SYMBOL_WEIGHT = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);

// Helper function to get symbol by ID
export const getSymbolById = (id: string): SlotSymbol | undefined => {
  return SYMBOLS.find(symbol => symbol.id === id);
};

// Helper function to calculate theoretical RTP
export const calculateTheoreticalRTP = (): number => {
  const totalWeight = TOTAL_SYMBOL_WEIGHT;
  let expectedReturn = 0;
  
  SYMBOLS.forEach(symbol => {
    const probability = Math.pow(symbol.weight / totalWeight, 3); // 3 matching symbols
    const payout = symbol.payout3;
    expectedReturn += probability * payout * PAYLINES.length;
  });
  
  return expectedReturn;
};

// Generate weighted random symbol
export const generateRandomSymbol = (): SlotSymbol => {
  const random = Math.random() * TOTAL_SYMBOL_WEIGHT;
  let currentWeight = 0;
  
  for (const symbol of SYMBOLS) {
    currentWeight += symbol.weight;
    if (random <= currentWeight) {
      return symbol;
    }
  }
  
  // Fallback to last symbol (should never reach here)
  return SYMBOLS[SYMBOLS.length - 1];
};