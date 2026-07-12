import { cn } from '@/lib/utils';

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full text-sm border-collapse', className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }) {
  return <thead className={cn('', className)} {...props} />;
}

export function TBody({ className, ...props }) {
  return <tbody className={cn('', className)} {...props} />;
}

export function TR({ className, ...props }) {
  return (
    <tr
      className={cn('border-b border-border transition-colors hover:bg-surface-2/50', className)}
      {...props}
    />
  );
}

export function TH({ className, ...props }) {
  return (
    <th
      className={cn(
        'h-10 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-fg-subtle',
        className
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }) {
  return <td className={cn('px-3 py-2.5 align-middle text-fg', className)} {...props} />;
}
