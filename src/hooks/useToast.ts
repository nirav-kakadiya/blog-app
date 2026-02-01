'use client';

import { useContext } from 'react';
import { ToastContext } from '@/components/ui/ToastProvider';

export function useToast() {
  return useContext(ToastContext);
}
