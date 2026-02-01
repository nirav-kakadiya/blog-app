'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { BlogType } from '@/types';
import { ContentDiffView } from '@/components/ContentDiffView';
import { Sparkles, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';

interface SearchCheck {
  id: string;
  name: string;
  passed: boolean;
  message: string;
  importance: 'critical' | 'important' | 'optional';
}

interface UnifiedSuggestion {
  source: 'seo' | 'aeo' | 'schema';
  importance: 'critical' | 'important' | 'optional';
  message: string;
}

interface OptimizeContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  blogId: string;
  content: string;
  keyword: string;
  title: string;
  blogType: BlogType;
  metaDescription: string;
  failedChecks: SearchCheck[];
  suggestions: UnifiedSuggestion[];
  onApply: (optimizedContent: string) => void;
}

type ModalState = 'input' | 'loading' | 'preview' | 'error';

export function OptimizeContentModal({
  isOpen,
  onClose,
  blogId,
  content,
  keyword,
  title,
  blogType,
  metaDescription,
  failedChecks,
  suggestions,
  onApply,
}: OptimizeContentModalProps) {
  const [state, setState] = useState<ModalState>('input');
  const [userNotes, setUserNotes] = useState('');
  const [optimizedContent, setOptimizedContent] = useState('');
  const [changesSummary, setChangesSummary] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const criticalCount = failedChecks.filter((c) => c.importance === 'critical').length;
  const importantCount = failedChecks.filter((c) => c.importance === 'important').length;

  const handleOptimize = async () => {
    setState('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/blogs/optimize-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogId,
          content,
          keyword,
          title,
          blogType,
          metaDescription,
          failedChecks: failedChecks.map((c) => ({
            id: c.id,
            name: c.name,
            message: c.message,
            importance: c.importance,
          })),
          suggestions,
          userNotes: userNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Optimization failed');
      }

      const data = await res.json();
      setOptimizedContent(data.data.optimizedContent);
      setChangesSummary(data.data.changesSummary);
      setState('preview');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Optimization failed');
      setState('error');
    }
  };

  const handleApply = () => {
    onApply(optimizedContent);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setState('input');
    setUserNotes('');
    setOptimizedContent('');
    setChangesSummary([]);
    setErrorMessage('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size={state === 'preview' ? 'xl' : 'lg'} showClose={state !== 'loading'}>
      {/* Input State */}
      {state === 'input' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Auto-Fix SEO & AEO Issues</h3>
              <p className="text-sm text-gray-500">
                {failedChecks.length} issue{failedChecks.length !== 1 ? 's' : ''} found
                {criticalCount > 0 && (
                  <span className="text-red-600 font-medium"> ({criticalCount} critical)</span>
                )}
                {importantCount > 0 && criticalCount === 0 && (
                  <span className="text-amber-600 font-medium"> ({importantCount} important)</span>
                )}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5 mb-4">
              {failedChecks.slice(0, 6).map((check) => (
                <span
                  key={check.id}
                  className={`text-xs px-2 py-1 rounded-full ${
                    check.importance === 'critical'
                      ? 'bg-red-50 text-red-700'
                      : check.importance === 'important'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {check.name}
                </span>
              ))}
              {failedChecks.length > 6 && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                  +{failedChecks.length - 6} more
                </span>
              )}
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Additional notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="e.g., make the tone more casual, add a section about pricing, focus on beginners..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none placeholder:text-gray-400"
            />
            {userNotes.length > 0 && (
              <p className="text-xs text-gray-400 mt-1 text-right">{userNotes.length}/500</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleOptimize}
              className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Optimize
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {state === 'loading' && (
        <div className="py-12 text-center">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Optimizing content...</h3>
          <p className="text-sm text-gray-500">AI is analyzing and fixing the identified issues</p>
        </div>
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="py-8 text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl">!</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Optimization failed</h3>
          <p className="text-sm text-red-600 mb-5">{errorMessage}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleOptimize}
              className="px-5 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Preview State */}
      {state === 'preview' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Review Changes</h3>
              <p className="text-sm text-gray-500">{changesSummary.length} improvement{changesSummary.length !== 1 ? 's' : ''} made</p>
            </div>
          </div>

          {/* Changes Summary */}
          <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium text-green-800 mb-2">What was changed:</p>
            <ul className="space-y-1">
              {changesSummary.map((change, i) => (
                <li key={i} className="text-xs text-green-700 flex items-start gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                  {change}
                </li>
              ))}
            </ul>
          </div>

          {/* Diff View */}
          <div className="mb-5">
            <ContentDiffView original={content} optimized={optimizedContent} />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setState('input')}
              className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleApply}
                className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
