'use client';

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

type ToastType = 'error' | 'success' | 'info';

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  toast: {
    error: (message: string) => void;
    success: (message: string) => void;
    info: (message: string) => void;
  };
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => remove(id), DURATION);
    },
    [remove]
  );

  const toast = useMemo(
    () => ({
      error: (message: string) => push('error', message),
      success: (message: string) => push('success', message),
      info: (message: string) => push('info', message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div className="fixed right-4 top-4 z-[70] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx.toast;
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const styles = {
    error: { border: 'border-[#f3b7b1]', icon: 'text-[var(--danger)]', title: 'Error' },
    success: { border: 'border-[#b8ddd5]', icon: 'text-[var(--accent)]', title: 'Success' },
    info: { border: 'border-[#d8d0ff]', icon: 'text-[var(--brand)]', title: 'Info' },
  }[item.type];

  return (
    <div className="animate-in slide-in-from-top-2 fade-in duration-300">
      <div className={`flex max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-[0_14px_36px_rgba(23,32,29,0.14)] ${styles.border}`}>
        <svg className={`h-5 w-5 shrink-0 mt-0.5 ${styles.icon}`} viewBox="0 0 20 20" fill="currentColor">
          {item.type === 'error' && (
            <path fillRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          )}
          {item.type === 'success' && (
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          )}
          {item.type === 'info' && (
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2h1a1 1 0 001-1v-1a1 1 0 00-1-1H9z" clipRule="evenodd" />
          )}
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">{styles.title}</p>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{item.message}</p>
        </div>
        <button onClick={onClose} className="shrink-0 text-[#8a9691] hover:text-[var(--foreground)]">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
