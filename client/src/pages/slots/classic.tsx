import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { WalletButton } from '@/components/wallet-button';
import { ModeToggle } from '@/components/mode-toggle';
import { ModeBadge } from '@/components/mode-badge';
import { useGameMode } from '@/contexts/game-mode-context';
import { useWallet } from '@solana/wallet-adapter-react';
import { SYMBOLS, PAYLINES, REAL_BET_AMOUNTS, DEMO_BET_AMOUNTS, GAME_CONFIG, generateRandomSymbol, getSymbolById } from '@/game/slots/classic/config';
import { useToast } from '@/hooks/use-toast';
import logoPath from '@assets/ChatGPT Image 28 juil. 2025, 10_17_36_1753690663892.png';

type SpinResult = {
  symbols: string[]; // 9 symbols for 3x3 grid
  winningLines: number[];
  totalPayout: number;
  isWin: boolean;
};

type GameState = 'idle' | 'spinning' | 'result' | 'autoplay';

export default function ClassicSlots() {
  const { isDemoMode } = useGameMode();
  const { connected, publicKey } = useWallet();
  const { toast } = useToast();

  // Game state
  const [gameState, setGameState] = useState<GameState>('idle');
  const [currentBet, setCurrentBet] = useState(0); // Index in bet amounts array
  const [demoBalance, setDemoBalance] = useState(100);
  const [lastSpinResult, setLastSpinResult] = useState<SpinResult | null>(null);
  const [spinHistory, setSpinHistory] = useState<SpinResult[]>([]);
  const [autoSpinsRemaining, setAutoSpinsRemaining] = useState(0);
  const [poolStatus, setPoolStatus] = useState<'good' | 'low' | 'critical'>('good');
  const [poolBalance, setPoolBalance] = useState(0);

  // Reel animation state
  const [reelSymbols, setReelSymbols] = useState<string[]>(Array(9).fill('coin'));
  const [isAnimating, setIsAnimating] = useState(false);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const betAmounts = isDemoMode ? DEMO_BET_AMOUNTS : REAL_BET_AMOUNTS;
  const currentBetAmount = betAmounts[currentBet];

  useEffect(() => {
    // Initialize with random symbols
    const initialSymbols = Array(9).fill(null).map(() => generateRandomSymbol().id);
    setReelSymbols(initialSymbols);
    
    // Fetch pool balance for real mode
    if (!isDemoMode) {
      fetchPoolBalance();
    }
  }, [isDemoMode]);

  const fetchPoolBalance = async () => {
    try {
      const response = await fetch('/api/pool/balance');
      const data = await response.json();
      setPoolBalance(data.balance);
      
      // Update pool status based on balance and max potential win
      const maxWin = currentBetAmount * Math.max(...SYMBOLS.map(s => s.payout3)) * PAYLINES.length;
      if (data.balance < maxWin + GAME_CONFIG.RESERVE_SOL) {
        setPoolStatus('critical');
      } else if (data.balance < maxWin * 2 + GAME_CONFIG.RESERVE_SOL) {
        setPoolStatus('low');
      } else {
        setPoolStatus('good');
      }
    } catch (error) {
      console.error('Failed to fetch pool balance:', error);
      setPoolStatus('critical');
    }
  };

  const generateSpinResult = (betAmount: number): SpinResult => {
    // Generate 9 symbols for 3x3 grid
    const symbols = Array(9).fill(null).map(() => generateRandomSymbol().id);
    
    // Check each payline for wins
    const winningLines: number[] = [];
    let totalPayout = 0;

    PAYLINES.forEach((line, lineIndex) => {
      const lineSymbols = line.map(pos => symbols[pos]);
      
      // Check if all 3 symbols match
      if (lineSymbols[0] === lineSymbols[1] && lineSymbols[1] === lineSymbols[2]) {
        const symbol = getSymbolById(lineSymbols[0]);
        if (symbol && symbol.payout3 > 0) {
          winningLines.push(lineIndex);
          totalPayout += symbol.payout3 * betAmount;
        }
      }
    });

    return {
      symbols,
      winningLines,
      totalPayout,
      isWin: totalPayout > 0
    };
  };

  const animateReels = (finalSymbols: string[]): Promise<void> => {
    return new Promise((resolve) => {
      setIsAnimating(true);
      let animationStep = 0;
      const totalSteps = 20; // Number of animation frames

      spinIntervalRef.current = setInterval(() => {
        if (animationStep < totalSteps) {
          // Show random symbols during animation
          const animSymbols = Array(9).fill(null).map(() => generateRandomSymbol().id);
          setReelSymbols(animSymbols);
          animationStep++;
        } else {
          // Stop animation and show final result
          if (spinIntervalRef.current) {
            clearInterval(spinIntervalRef.current);
            spinIntervalRef.current = null;
          }
          setReelSymbols(finalSymbols);
          setIsAnimating(false);
          resolve();
        }
      }, GAME_CONFIG.SPIN_DELAY);
    });
  };

  const handleSpin = async () => {
    if (gameState !== 'idle' || (poolStatus === 'critical' && !isDemoMode)) {
      return;
    }

    if (!isDemoMode && !connected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to play in Real mode",
        variant: "destructive"
      });
      return;
    }

    // Check demo balance
    if (isDemoMode && demoBalance < currentBetAmount) {
      toast({
        title: "Insufficient balance",
        description: "Not enough demo credits to place this bet",
        variant: "destructive"
      });
      return;
    }

    setGameState('spinning');

    try {
      // Generate spin result
      const spinResult = generateSpinResult(currentBetAmount);

      if (!isDemoMode) {
        // Real mode: Handle SOL transactions
        const quoteResponse = await fetch('/api/slots/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet: publicKey?.toString(),
            betLamports: currentBetAmount * 1e9, // Convert SOL to lamports
            expectedMaxWin: currentBetAmount * 20 * PAYLINES.length // Max theoretical win
          })
        });

        const quoteData = await quoteResponse.json();
        if (quoteData.status !== 'OK') {
          setGameState('idle');
          toast({
            title: "Bet not allowed",
            description: quoteData.message || "Pool balance too low for this bet",
            variant: "destructive"
          });
          return;
        }

        // Process payment transaction (90/10 split)
        // This would be implemented with Solana transactions
        console.log('Processing real SOL transaction...');
      } else {
        // Demo mode: Deduct from demo balance
        setDemoBalance(prev => prev - currentBetAmount);
      }

      // Animate reels
      await animateReels(spinResult.symbols);

      // Process win
      if (spinResult.isWin) {
        if (isDemoMode) {
          setDemoBalance(prev => prev + spinResult.totalPayout);
        } else {
          // Real mode payout would be handled by backend
          console.log('Processing real SOL payout...');
        }

        toast({
          title: "Big Win!",
          description: `You won ${spinResult.totalPayout.toFixed(2)} ${isDemoMode ? 'credits' : 'SOL'}!`,
          variant: "default"
        });
      }

      // Update game state
      setLastSpinResult(spinResult);
      setSpinHistory(prev => [spinResult, ...prev.slice(0, 9)]); // Keep last 10
      setGameState('result');

      // Auto-return to idle after showing result
      setTimeout(() => {
        setGameState('idle');
      }, 3000);

    } catch (error) {
      console.error('Spin error:', error);
      setGameState('idle');
      toast({
        title: "Spin failed",
        description: "There was an error processing your spin. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAutoPlay = () => {
    if (autoSpinsRemaining > 0) {
      setAutoSpinsRemaining(0);
      setGameState('idle');
    } else {
      setAutoSpinsRemaining(GAME_CONFIG.MAX_AUTO_SPINS);
      setGameState('autoplay');
    }
  };

  // Auto-spin effect
  useEffect(() => {
    if (gameState === 'autoplay' && autoSpinsRemaining > 0) {
      const timer = setTimeout(() => {
        handleSpin();
        setAutoSpinsRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (autoSpinsRemaining === 0 && gameState === 'autoplay') {
      setGameState('idle');
    }
  }, [gameState, autoSpinsRemaining]);

  const getSymbolDisplay = (symbolId: string) => {
    const symbol = getSymbolById(symbolId);
    if (!symbol) return '?';
    
    // Return symbol display based on type
    switch (symbolId) {
      case 'seven': return '7';
      case 'diamond': return '💎';
      case 'rocket': return '🚀';
      case 'coin': return '🪙';
      case 'tear': return '💧';
      case 'rug': return '🟥';
      default: return '?';
    }
  };

  const canSpin = gameState === 'idle' && (isDemoMode ? demoBalance >= currentBetAmount : connected);
  const isSpinDisabled = !canSpin || (poolStatus === 'critical' && !isDemoMode);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-neon-cyan/30 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between lg:justify-start lg:space-x-8">
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

          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/">
              <span className="text-gray-300 hover:text-neon-cyan transition-colors cursor-pointer font-medium">
                Scratch Cards
              </span>
            </Link>
            <Link href="/casino">
              <span className="text-gray-300 hover:text-neon-cyan transition-colors cursor-pointer font-medium">
                Casino
              </span>
            </Link>
            <Link href="/casino/slots">
              <span className="text-gray-300 hover:text-neon-cyan transition-colors cursor-pointer font-medium">
                Slots
              </span>
            </Link>
            <span className="text-neon-cyan font-bold">Classic 3×3</span>
          </nav>

          <div className="flex items-center space-x-4 lg:ml-auto">
            <ModeToggle />
            {!isDemoMode && <WalletButton />}
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-neon-cyan mb-2">Classic 3×3 Slots</h1>
          <p className="text-gray-400">5 paylines • 88-90% RTP • Maximum 20x payout</p>
          <ModeBadge className="mt-4" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Game Board */}
          <div className="lg:col-span-2">
            <Card className="bg-dark-purple/50 border-neon-cyan/30">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-neon-cyan">Slot Machine</CardTitle>
                  {!isDemoMode && (
                    <Badge 
                      variant="secondary" 
                      className={`
                        ${poolStatus === 'good' ? 'bg-green-900/50 text-green-400' : ''}
                        ${poolStatus === 'low' ? 'bg-yellow-900/50 text-yellow-400' : ''}
                        ${poolStatus === 'critical' ? 'bg-red-900/50 text-red-400' : ''}
                      `}
                    >
                      Pool: {poolStatus}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 3x3 Reel Grid */}
                <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
                  {reelSymbols.map((symbolId, index) => (
                    <div 
                      key={index}
                      className={`
                        aspect-square bg-gradient-to-br from-dark-purple to-deep-space 
                        border-2 border-neon-cyan/30 rounded-lg flex items-center justify-center
                        text-4xl font-bold transition-all duration-150
                        ${isAnimating ? 'animate-pulse border-neon-orange' : ''}
                        ${lastSpinResult?.winningLines.some(lineIndex => 
                          PAYLINES[lineIndex].includes(index)
                        ) ? 'border-neon-orange shadow-lg shadow-neon-orange/50' : ''}
                      `}
                      style={{ 
                        color: getSymbolById(symbolId)?.color || '#00FFFF',
                        textShadow: '0 0 10px currentColor'
                      }}
                    >
                      {getSymbolDisplay(symbolId)}
                    </div>
                  ))}
                </div>

                {/* Win Display */}
                {lastSpinResult?.isWin && (
                  <div className="text-center p-4 bg-neon-orange/20 rounded-lg border border-neon-orange/50">
                    <p className="text-2xl font-bold text-neon-orange">
                      BIG WIN! +{lastSpinResult.totalPayout.toFixed(2)} {isDemoMode ? 'credits' : 'SOL'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {lastSpinResult.winningLines.length} winning line{lastSpinResult.winningLines.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                {/* Controls */}
                <div className="flex flex-col space-y-4">
                  {/* Bet Selection */}
                  <div className="flex justify-center space-x-2">
                    {betAmounts.map((amount, index) => (
                      <Button
                        key={index}
                        variant={currentBet === index ? "default" : "outline"}
                        className={`
                          ${currentBet === index 
                            ? "bg-neon-cyan text-black" 
                            : "border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10"
                          }
                        `}
                        onClick={() => setCurrentBet(index)}
                        disabled={gameState !== 'idle'}
                        data-testid={`button-bet-${amount}`}
                      >
                        {amount} {isDemoMode ? 'credits' : 'SOL'}
                      </Button>
                    ))}
                  </div>

                  {/* Spin Controls */}
                  <div className="flex justify-center space-x-4">
                    <Button
                      className="px-8 py-3 text-lg bg-neon-orange hover:bg-neon-orange/80"
                      onClick={handleSpin}
                      disabled={isSpinDisabled}
                      data-testid="button-spin"
                    >
                      {isAnimating ? 'SPINNING...' : 'SPIN'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10"
                      onClick={handleAutoPlay}
                      disabled={isSpinDisabled}
                      data-testid="button-auto"
                    >
                      {autoSpinsRemaining > 0 ? `STOP (${autoSpinsRemaining})` : 'AUTO'}
                    </Button>
                  </div>

                  {/* Auto-spin progress */}
                  {autoSpinsRemaining > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Auto spins remaining:</span>
                        <span className="text-neon-cyan">{autoSpinsRemaining}</span>
                      </div>
                      <Progress 
                        value={((GAME_CONFIG.MAX_AUTO_SPINS - autoSpinsRemaining) / GAME_CONFIG.MAX_AUTO_SPINS) * 100}
                        className="h-2"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Balance Card */}
            <Card className="bg-dark-purple/50 border-neon-cyan/30">
              <CardHeader>
                <CardTitle className="text-neon-cyan">Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {isDemoMode 
                    ? `${demoBalance.toFixed(2)} credits`
                    : connected 
                      ? `${(0).toFixed(2)} SOL` // Would fetch real balance
                      : 'Connect Wallet'
                  }
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Current bet: {currentBetAmount} {isDemoMode ? 'credits' : 'SOL'}
                </p>
              </CardContent>
            </Card>

            {/* Paytable */}
            <Card className="bg-dark-purple/50 border-neon-cyan/30">
              <CardHeader>
                <CardTitle className="text-neon-cyan">Paytable</CardTitle>
                <CardDescription>
                  3 matching symbols on any payline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {SYMBOLS.filter(s => s.payout3 > 0).map(symbol => (
                    <div key={symbol.id} className="flex justify-between items-center">
                      <span className="flex items-center space-x-2">
                        <span style={{ color: symbol.color }}>
                          {getSymbolDisplay(symbol.id)}
                        </span>
                        <span className="text-sm">{symbol.name}</span>
                      </span>
                      <span className="text-neon-cyan font-bold">{symbol.payout3}x</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Spins */}
            <Card className="bg-dark-purple/50 border-neon-cyan/30">
              <CardHeader>
                <CardTitle className="text-neon-cyan">Recent Spins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {spinHistory.length === 0 ? (
                    <p className="text-gray-400 text-sm">No spins yet</p>
                  ) : (
                    spinHistory.map((spin, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className={spin.isWin ? "text-green-400" : "text-gray-400"}>
                          {spin.isWin ? 'WIN' : 'LOSS'}
                        </span>
                        <span className="text-neon-cyan">
                          {spin.isWin ? `+${spin.totalPayout.toFixed(2)}` : '-'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Back Navigation */}
        <div className="text-center mt-8">
          <Link href="/casino/slots">
            <Button 
              variant="outline" 
              className="border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10"
              data-testid="button-back-slots"
            >
              ← Back to Slots
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}