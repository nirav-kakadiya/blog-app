'use client';

import { useState, useEffect, useCallback } from 'react';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { url: string; text: string; isExternal: boolean; nofollow: boolean }) => void;
  initialUrl?: string;
  initialText?: string;
  isEditing?: boolean;
}

export function LinkModal({
  isOpen,
  onClose,
  onSubmit,
  initialUrl = '',
  initialText = '',
  isEditing = false,
}: LinkModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const [isExternal, setIsExternal] = useState(true);
  const [nofollow, setNofollow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUrl(initialUrl);
    setText(initialText);
    // Auto-detect if external link (client-side only)
    if (initialUrl && typeof window !== 'undefined') {
      const isExt = !initialUrl.startsWith('/') && !initialUrl.includes(window.location.hostname);
      setIsExternal(isExt);
    }
  }, [initialUrl, initialText, isOpen]);

  const validateUrl = (url: string): boolean => {
    if (!url) return false;

    // Allow relative URLs
    if (url.startsWith('/')) return true;
    if (url.startsWith('#')) return true;

    // Validate absolute URLs
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    if (!validateUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('/') && !normalizedUrl.startsWith('#') && !normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    onSubmit({
      url: normalizedUrl,
      text: text.trim() || normalizedUrl,
      isExternal,
      nofollow: isExternal && nofollow,
    });

    // Reset form
    setUrl('');
    setText('');
    setIsExternal(true);
    setNofollow(false);
    onClose();
  }, [url, text, isExternal, nofollow, onSubmit, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Link' : 'Insert Link'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 mb-1">
              URL
            </label>
            <input
              id="link-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com or /internal-page"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="link-text" className="block text-sm font-medium text-gray-700 mb-1">
              Link Text (optional)
            </label>
            <input
              id="link-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Click here"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty to use selected text or URL as link text
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isExternal}
                onChange={(e) => {
                  setIsExternal(e.target.checked);
                  if (!e.target.checked) setNofollow(false);
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">External link</span>
            </label>

            {isExternal && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={nofollow}
                  onChange={(e) => setNofollow(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Add nofollow</span>
              </label>
            )}
          </div>

          {isExternal && (
            <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              External links will open in a new tab. Add nofollow for untrusted or sponsored links.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isEditing ? 'Update Link' : 'Insert Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
