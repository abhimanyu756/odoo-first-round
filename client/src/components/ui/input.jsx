import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const inputClass =
  'flex h-9 w-full rounded-md border border-border-strong bg-surface-2 px-3 py-1 text-sm text-fg shadow-sm transition-colors placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50';

export const Input = forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input ref={ref} type={type} className={cn(inputClass, className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(inputClass, 'min-h-20 py-2 resize-y', className)}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(inputClass, 'cursor-pointer', className)} {...props}>
    {children}
  </select>
));
Select.displayName = 'Select';
