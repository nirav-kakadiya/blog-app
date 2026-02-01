'use client';

import { createContext, useCallback, useState } from 'react';
import { Toast, ToastData, ToastType } from './Toast';

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
  const error = useCallback((message: string) => addToast(message, 'error', 6000), [addToast]);
  const warning = useCallback((message: string) => addToast(message, 'warning', 5000), [addToast]);
  const info = useCallback((message: string) => addToast(message, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, success, error, warning, info }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
