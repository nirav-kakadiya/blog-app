'use client';

import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm" showClose={false}>
      <div className="text-center">
        {variant === 'danger' && (
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        {description && <p className="text-sm text-gray-500 mb-6">{description}</p>}
        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
