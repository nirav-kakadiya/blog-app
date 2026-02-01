'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const STYLES = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
};

const ICON_STYLES = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-amber-500',
};

export function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = ICONS[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 200);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${STYLES[toast.type]} ${
        isExiting ? 'animate-slideOut' : 'animate-slideUp'
      }`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${ICON_STYLES[toast.type]}`} />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onDismiss(toast.id), 200);
        }}
        className="p-1 hover:bg-black/5 rounded-md transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
