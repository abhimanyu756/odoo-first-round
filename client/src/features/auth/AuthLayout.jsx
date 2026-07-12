import { Boxes } from 'lucide-react';

export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-fg">
            <Boxes className="size-7" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-fg">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-lg">{children}</div>
        {footer && <div className="mt-4 text-center text-sm text-fg-muted">{footer}</div>}
      </div>
    </div>
  );
}
