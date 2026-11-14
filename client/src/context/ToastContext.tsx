import React, { createContext, useCallback, useContext, useState } from 'react';

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };
interface ToastCtx { show: (message: string, type?: Toast['type']) => void; }
const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`min-w-[240px] rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur bg-white/95 dark:bg-slate-900/95 ${
            t.type === 'success' ? 'border-emerald-200 text-emerald-800 dark:border-emerald-900 dark:text-emerald-200' :
            t.type === 'error' ? 'border-red-200 text-red-800 dark:border-red-900 dark:text-red-200' :
            'border-slate-200 text-slate-800 dark:border-slate-700 dark:text-slate-200'
          }`}>{t.message}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be used within ToastProvider');
  return v;
}
