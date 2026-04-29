import { cn } from '../../lib/utils';

export interface LukoutLoaderProps {
  /** Pixel size (height). Width auto-scales 2:1. Default 48 */
  size?: number;
  className?: string;
  'aria-label'?: string;
}

/**
 * Animated lukout mark loader.
 * Side brackets (vertical bar + top/bot caps) stay visible.
 * Inner arms (top → mid → bot) fade in sequentially then fade out in reverse, looping.
 */
export function LukoutLoader({ size = 48, className, ...rest }: LukoutLoaderProps) {
  const width = size * 2;
  return (
    <svg
      role="status"
      aria-label={rest['aria-label'] ?? 'Loading'}
      width={width}
      height={size}
      viewBox="0 0 120 60"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('lukout-loader', className)}
    >
      <g transform="translate(27, 12)">
        {/* Left bracket */}
        <rect x="0" y="0" width="5" height="36" rx="1.5" className="lk-bracket" />
        <rect x="0" y="0" width="16" height="5" rx="1.5" className="lk-bracket" />
        <rect x="0" y="31" width="16" height="5" rx="1.5" className="lk-bracket" />
        {/* Left arms */}
        <rect x="8" y="7" width="20" height="5" rx="1" className="lk-arm lk-arm-1" />
        <rect x="8" y="16" width="14" height="5" rx="1" className="lk-arm lk-arm-2" />
        <rect x="8" y="25" width="8" height="5" rx="1" className="lk-arm lk-arm-3" />
        {/* Right bracket */}
        <rect x="58" y="0" width="5" height="36" rx="1.5" className="lk-bracket" />
        <rect x="47" y="0" width="16" height="5" rx="1.5" className="lk-bracket" />
        <rect x="47" y="31" width="16" height="5" rx="1.5" className="lk-bracket" />
        {/* Right arms */}
        <rect x="35" y="7" width="20" height="5" rx="1" className="lk-arm lk-arm-1" />
        <rect x="41" y="16" width="14" height="5" rx="1" className="lk-arm lk-arm-2" />
        <rect x="47" y="25" width="8" height="5" rx="1" className="lk-arm lk-arm-3" />
      </g>
    </svg>
  );
}

export function LukoutLoaderCentered({ label = 'Loading...', size = 56 }: { label?: string; size?: number }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <LukoutLoader size={size} />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}

/**
 * Compact inline lukout spinner for buttons / inline loading indicators.
 * Drop-in replacement for `<Loader2 className="h-4 w-4 animate-spin" />`.
 */
export function LukoutSpinner({ size = 16, className }: { size?: number; className?: string }) {
  return <LukoutLoader size={size} className={className} aria-label="Loading" />;
}
