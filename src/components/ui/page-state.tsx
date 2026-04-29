import { ReactNode } from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LukoutLoader } from './lukout-loader';

type Variant = 'loading' | 'empty' | 'error' | 'skeleton';

export interface PageStateProps {
  variant: Variant;
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const defaults: Record<Variant, { title: string; icon: ReactNode; tone: string }> = {
  loading: {
    title: 'Loading...',
    icon: <LukoutLoader size={32} />,
    tone: 'text-muted-foreground',
  },
  empty: {
    title: 'Nothing here yet',
    icon: <Inbox className="h-6 w-6" />,
    tone: 'text-muted-foreground',
  },
  error: {
    title: 'Something went wrong',
    icon: <AlertCircle className="h-6 w-6" />,
    tone: 'text-destructive',
  },
  skeleton: {
    title: '',
    icon: <></>,
    tone: '',
  },
};

export function PageState({
  variant,
  title,
  description,
  icon,
  action,
  className,
}: PageStateProps) {
  // Skeleton variant renders placeholder blocks
  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-96 bg-muted rounded animate-pulse" />
        <div className="space-y-2 pt-4">
          <div className="h-12 w-full bg-muted rounded animate-pulse" />
          <div className="h-12 w-full bg-muted rounded animate-pulse" />
          <div className="h-12 w-full bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const d = defaults[variant];
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 gap-3',
        d.tone,
        className,
      )}
    >
      {icon ?? d.icon}
      <div className="space-y-1">
        <p className="text-sm font-medium">{title ?? d.title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
