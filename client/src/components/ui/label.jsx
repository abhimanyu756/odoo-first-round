import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Label = forwardRef(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-sm font-medium text-fg-muted mb-1.5 block', className)}
    {...props}
  />
));
Label.displayName = 'Label';

// Small helper to render a labeled field with optional error text.
export function Field({ label, htmlFor, error, hint, children, className }) {
  return (
    <div className={cn('space-y-0', className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
