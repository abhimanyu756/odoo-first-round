import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const TONES = {
  success: 'border-success/40 text-success',
  error: 'border-danger/40 text-danger',
  info: 'border-info/40 text-info',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = 'info', title) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, message, type, title }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const value = {
    toast,
    success: (m, title) => toast(m, 'success', title),
    error: (m, title) => toast(m, 'error', title),
    info: (m, title) => toast(m, 'info', title),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border bg-elevated p-3 shadow-lg animate-in slide-in-from-bottom-2',
                TONES[t.type]
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <div className="flex-1 text-sm">
                {t.title && <p className="font-medium text-fg">{t.title}</p>}
                <p className="text-fg-muted">{t.message}</p>
              </div>
              <button onClick={() => dismiss(t.id)} className="text-fg-subtle hover:text-fg">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
