import { useRef, useEffect, useState, useCallback } from 'react';

interface ScratchZoneProps {
  width: number;
  height: number;
  scratchRadius: number;
  symbol: string;
  onComplete: () => void;
  isRevealed: boolean;
  zoneIndex: number;
  autoReveal?: boolean;
}

export function ScratchZone({ 
  width, 
  height, 
  scratchRadius, 
  symbol, 
  onComplete, 
  isRevealed,
  zoneIndex,
  autoReveal = false
}: ScratchZoneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchedPercentage, setScratchedPercentage] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);

  // Initialize canvas with scratch overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // If auto-reveal is enabled, make transparent immediately
    if (autoReveal) {
      ctx.clearRect(0, 0, width, height);
      if (!hasCompleted) {
        setHasCompleted(true);
        onComplete();
      }
      return;
    }

    // Create gradient overlay
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#6A0DAD');
    gradient.addColorStop(0.5, '#8A2BE2');
    gradient.addColorStop(1, '#9932CC');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add scratch-off text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText(`ZONE ${zoneIndex + 1}`, width / 2, height / 2 - 5);
    ctx.font = '10px Orbitron';
    ctx.fillText('SCRATCH', width / 2, height / 2 + 10);
  }, [width, height, zoneIndex, autoReveal, hasCompleted, onComplete]);

  // Calculate scratched percentage
  const calculateScratchedPercentage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;

    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    let transparentPixels = 0;
    const totalPixels = pixels.length / 4;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) {
        transparentPixels++;
      }
    }

    return (transparentPixels / totalPixels) * 100;
  }, [width, height]);

  // Scratch function
  const scratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || hasCompleted) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, scratchRadius, 0, 2 * Math.PI);
    ctx.fill();

    const percentage = calculateScratchedPercentage();
    setScratchedPercentage(percentage);

    if (percentage >= 60 && !hasCompleted) {
      setHasCompleted(true);
      onComplete();
    }
  }, [scratchRadius, calculateScratchedPercentage, onComplete, hasCompleted]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isRevealed || hasCompleted) return;
    setIsScratching(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      scratch(e.clientX - rect.left, e.clientY - rect.top);
    }
  }, [scratch, isRevealed, hasCompleted]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isScratching || isRevealed || hasCompleted) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      scratch(e.clientX - rect.left, e.clientY - rect.top);
    }
  }, [isScratching, scratch, isRevealed, hasCompleted]);

  const handleMouseUp = useCallback(() => {
    setIsScratching(false);
  }, []);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRevealed || hasCompleted) return;
    e.preventDefault();
    setIsScratching(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    const touch = e.touches[0];
    if (rect && touch) {
      scratch(touch.clientX - rect.left, touch.clientY - rect.top);
    }
  }, [scratch, isRevealed, hasCompleted]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isScratching || isRevealed || hasCompleted) return;
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    const touch = e.touches[0];
    if (rect && touch) {
      scratch(touch.clientX - rect.left, touch.clientY - rect.top);
    }
  }, [isScratching, scratch, isRevealed, hasCompleted]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsScratching(false);
  }, []);

  return (
    <div className="relative scratch-zone">
      {/* Background symbol */}
      <div 
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-dark-purple to-deep-space rounded-lg border-2 border-neon-gold"
        style={{ width, height }}
      >
        <div className="text-3xl font-bold text-neon-gold animate-pulse">
          {symbol}
        </div>
      </div>

      {/* Scratch canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-pointer rounded-lg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          width, 
          height,
          opacity: isRevealed || hasCompleted ? 0 : 1,
          transition: 'opacity 0.5s ease-in-out'
        }}
      />

      {/* Progress indicator */}
      {scratchedPercentage > 0 && scratchedPercentage < 60 && !hasCompleted && (
        <div className="absolute bottom-1 left-1 right-1">
          <div className="bg-black/70 rounded px-2 py-1 text-xs text-neon-cyan text-center">
            {Math.round(scratchedPercentage)}%
          </div>
        </div>
      )}

      {/* Completed indicator */}
      {hasCompleted && (
        <div className="absolute top-1 right-1">
          <div className="bg-neon-gold/20 border border-neon-gold rounded-full w-6 h-6 flex items-center justify-center">
            <div className="text-xs text-neon-gold">✓</div>
          </div>
        </div>
      )}
    </div>
  );
}