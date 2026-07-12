import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border-border-strong bg-surface-2 text-fg-muted',
        primary: 'border-primary/30 bg-primary/10 text-primary-hover',
        info: 'border-info/30 bg-info/10 text-info',
        warning: 'border-warning/30 bg-warning/10 text-warning',
        danger: 'border-danger/30 bg-danger/10 text-danger',
        success: 'border-success/30 bg-success/10 text-success',
        accent: 'border-accent/30 bg-accent/10 text-accent',
      },
    },
    defaultVariants: { tone: 'neutral' },
  }
);

export function Badge({ className, tone, ...props }) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
