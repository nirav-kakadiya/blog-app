'use client';

import { useState, useEffect } from 'react';

interface Props {
  value?: string;
  onChange: (url: string) => void;
  blogTitle?: string;
  suggestedBase?: string;
}

export function CanonicalManager({ value, onChange, blogTitle, suggestedBase = 'https://yourdomain.com/blog/' }: Props) {
  const [inputValue, setInputValue] = useState(value || '');
  const [isValid, setIsValid] = useState(true);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100);
  };

  const suggestedUrl = blogTitle
    ? `${suggestedBase}${generateSlug(blogTitle)}`
    : suggestedBase;

  const validateUrl = (url: string) => {
    if (!url) return true; // Empty is valid (optional)
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleChange = (newValue: string) => {
    setInputValue(newValue);
    setTouched(true);
    const valid = validateUrl(newValue);
    setIsValid(valid);
    if (valid) {
      onChange(newValue);
    }
  };

  const handleUseSuggested = () => {
    handleChange(suggestedUrl);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Canonical URL
        </label>
        {!inputValue && (
          <span className="text-xs text-amber-600 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Not set
          </span>
        )}
      </div>

      <div className="relative">
        <input
          type="url"
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="https://yourdomain.com/blog/your-post-slug"
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-blue-500 text-sm transition-all ${
            touched && !isValid
              ? 'border-red-300 focus:ring-red-200'
              : 'border-gray-200 focus:ring-blue-200'
          }`}
        />
        {inputValue && isValid && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {touched && !isValid && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Please enter a valid URL
        </p>
      )}

      {blogTitle && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseSuggested}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Use suggested URL
          </button>
          <span className="text-xs text-gray-400 truncate max-w-xs" title={suggestedUrl}>
            {suggestedUrl}
          </span>
        </div>
      )}

      <p className="text-xs text-gray-500">
        The canonical URL tells search engines the preferred version of this content.
        This is important when publishing to multiple platforms.
      </p>
    </div>
  );
}
