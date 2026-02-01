'use client';

import { Check, X } from 'lucide-react';

interface CheckItem {
  id?: string;
  name: string;
  passed: boolean;
  message: string;
  importance?: string;
}

interface CheckGroupProps {
  label: string;
  description?: string;
  checks: CheckItem[];
  showCount?: boolean;
}

export function CheckGroup({ label, description, checks, showCount = true }: CheckGroupProps) {
  const passed = checks.filter((c) => c.passed).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">{label}</h4>
        {showCount && (
          <span className="text-xs text-gray-400">
            {passed}/{checks.length} passed
          </span>
        )}
      </div>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <div className="space-y-1.5">
        {checks.map((check, i) => (
          <div
            key={check.id || `${check.name}-${i}`}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg text-sm ${
              check.passed ? 'bg-green-50/50' : 'bg-red-50/50'
            }`}
          >
            {check.passed ? (
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            ) : (
              <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <span className={check.passed ? 'text-green-700' : 'text-red-700'}>
                {check.name}
              </span>
              {!check.passed && check.message && (
                <p className="text-xs text-gray-500 mt-0.5">{check.message}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
