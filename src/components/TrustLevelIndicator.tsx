import { cn } from '@/lib/utils';

export type TrustLevel = 'low' | 'medium' | 'high';

const TRUST_LEVEL_CONFIG: Record<
  TrustLevel,
  { color: string; bgColor: string; label: string }
> = {
  low: {
    color: 'bg-destructive',
    bgColor: 'bg-destructive/20',
    label: 'Pouco confiável',
  },
  medium: {
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-500/20',
    label: 'Mais ou menos',
  },
  high: {
    color: 'bg-green-600',
    bgColor: 'bg-green-600/20',
    label: 'Muito confiável',
  },
};

interface TrustLevelIndicatorProps {
  level: TrustLevel | null | undefined;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function TrustLevelIndicator({
  level,
  size = 'md',
  showLabel = false,
  className,
}: TrustLevelIndicatorProps) {
  if (!level || !(level in TRUST_LEVEL_CONFIG)) {
    return null;
  }

  const config = TRUST_LEVEL_CONFIG[level as TrustLevel];
  const dotSize = size === 'sm' ? 'h-2 w-2' : 'h-3 w-3';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        className
      )}
      title={config.label}
    >
      <span
        className={cn(
          'rounded-full shrink-0',
          dotSize,
          config.color
        )}
        aria-hidden
      />
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground">
          {config.label}
        </span>
      )}
    </span>
  );
}
