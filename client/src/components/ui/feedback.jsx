import { Loader2, Inbox, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className }) {
  return <Loader2 className={cn('size-4 animate-spin', className)} />;
}

export function LoadingState({ label = 'Loading…', className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-16 text-fg-muted', className)}>
      <Loader2 className="size-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-16 text-center', className)}>
      <div className="rounded-full bg-surface-2 p-3 text-fg-subtle">
        <Icon className="size-6" />
      </div>
      <h3 className="text-sm font-medium text-fg">{title}</h3>
      {description && <p className="max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Failed to load data', onRetry, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-16 text-center', className)}>
      <div className="rounded-full bg-danger/10 p-3 text-danger">
        <AlertCircle className="size-6" />
      </div>
      <p className="text-sm text-fg">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-accent hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}
