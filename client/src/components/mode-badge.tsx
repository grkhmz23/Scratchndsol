import { Badge } from '@/components/ui/badge';
import { useGameMode } from '@/contexts/game-mode-context';

interface ModeBadgeProps {
  className?: string;
}

export function ModeBadge({ className = "" }: ModeBadgeProps) {
  const { isDemoMode } = useGameMode();

  return (
    <Badge 
      variant={isDemoMode ? "secondary" : "default"}
      className={`
        ${isDemoMode 
          ? "bg-green-900/50 text-green-400 border-green-400/30" 
          : "bg-purple-900/50 text-purple-400 border-purple-400/30"
        } 
        ${className}
      `}
      data-testid="badge-game-mode"
    >
      {isDemoMode ? (
        <span className="flex items-center space-x-1">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          <span>Demo Mode — no real payouts</span>
        </span>
      ) : (
        <span className="flex items-center space-x-1">
          <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
          <span>Real Mode — SOL wagers & payouts</span>
        </span>
      )}
    </Badge>
  );
}