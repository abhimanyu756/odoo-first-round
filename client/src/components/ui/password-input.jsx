import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './input';
import { cn } from '@/lib/utils';

// Password field with a show/hide eye toggle.
export const PasswordInput = forwardRef(({ className, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cn('pr-9', className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

// Shared password policy: 8+ chars, one upper, one lower, one number, one special.
export const PASSWORD_POLICY = {
  regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
  message: 'Min 8 chars with uppercase, lowercase, number & special character',
};

// Live checklist of which password rules are met.
export function PasswordChecklist({ value = '' }) {
  const rules = [
    { label: '8+ characters', ok: value.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(value) },
    { label: 'Lowercase', ok: /[a-z]/.test(value) },
    { label: 'Number', ok: /\d/.test(value) },
    { label: 'Special character', ok: /[^A-Za-z0-9]/.test(value) },
  ];
  return (
    <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {rules.map((r) => (
        <li key={r.label} className={r.ok ? 'text-success' : 'text-fg-subtle'}>
          {r.ok ? '✓' : '○'} {r.label}
        </li>
      ))}
    </ul>
  );
}
