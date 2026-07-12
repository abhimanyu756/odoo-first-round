import { cn } from '@/lib/utils';

// Compact stat tile. `tone` tints the icon + value for status KPIs.
export function KpiCard({ label, value, icon: Icon, tone = 'default', hint }) {
  const tones = {
    default: 'text-fg',
    success: 'text-success',
    info: 'text-info',
    warning: 'text-warning',
    danger: 'text-danger',
    accent: 'text-accent',
  };
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-fg-muted">{label}</span>
        {Icon && <Icon className={cn('size-4', tones[tone])} />}
      </div>
      <p className={cn('mt-2 text-3xl font-semibold tabular-nums', tones[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}
