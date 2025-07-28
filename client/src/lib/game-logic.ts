import { gameSymbols, multipliers } from '@shared/schema';

export function generateGameSymbols(): string[] {
  return Array.from({ length: 3 }, () => 
    gameSymbols[Math.floor(Math.random() * gameSymbols.length)]
  );
}

export function checkWin(symbols: string[]): { isWin: boolean; multiplier: number } {
  const allMatch = symbols.every(symbol => symbol === symbols[0]);
  
  if (!allMatch) {
    return { isWin: false, multiplier: 0 };
  }

  // Random multiplier for wins
  const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
  return { isWin: true, multiplier };
}

export function calculateWinAmount(ticketCost: number, multiplier: number): number {
  return ticketCost * multiplier;
}

export function formatSOL(amount: number): string {
  return `${amount.toFixed(2)} SOL`;
}

export function formatWalletAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
