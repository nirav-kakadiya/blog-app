'use client';

import { useState } from 'react';
import { BlogType } from '@/types';

const BLOG_TYPES: { value: BlogType; label: string; description: string }[] = [
  { value: 'guide', label: 'Guide', description: 'How-to tutorials and comprehensive guides' },
  { value: 'prompt', label: 'Prompts', description: 'AI prompt libraries and templates' },
  { value: 'comparison', label: 'Comparison', description: 'Tool comparisons and alternatives' },
  { value: 'tips', label: 'Tips & Tricks', description: 'Quick tutorials and pro tips' },
  { value: 'usecase', label: 'Use Cases', description: 'Industry-specific use cases' },
  { value: 'api', label: 'API Guide', description: 'API documentation and integration guides' },
  { value: 'upcoming', label: 'Upcoming/Trends', description: 'News about upcoming releases' },
  { value: 'troubleshoot', label: 'Troubleshooting', description: 'Error fixes and debugging guides' },
  { value: 'tools', label: 'Tools & Models', description: 'Deep-dive articles on specific tools' },
  { value: 'review', label: 'Review', description: 'In-depth tool or model reviews' },
];

interface Props {
  onSubmit: (data: { keyword: string; blogType: BlogType }) => Promise<void>;
  loading?: boolean;
}

export function BlogInputForm({ onSubmit, loading = false }: Props) {
  const [keyword, setKeyword] = useState('');
  const [blogType, setBlogType] = useState<BlogType>('guide');
  const [error, setError] = useState<string | null>(null);

  const selectedType = BLOG_TYPES.find((t) => t.value === blogType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (keyword.trim().length < 2) {
      setError('Keyword must be at least 2 characters');
      return;
    }

    try {
      await onSubmit({ keyword: keyword.trim(), blogType });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div>
        <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-1">
          Keyword / Topic
        </label>
        <input
          id="keyword"
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="e.g., Flux AI image generation"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          disabled={loading}
        />
        <p className="mt-1 text-sm text-gray-500">
          Enter the main keyword or topic for your blog post
        </p>
      </div>

      <div>
        <label htmlFor="blogType" className="block text-sm font-medium text-gray-700 mb-1">
          Blog Type
        </label>
        <select
          id="blogType"
          value={blogType}
          onChange={(e) => setBlogType(e.target.value as BlogType)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {BLOG_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {selectedType && (
          <p className="mt-1 text-sm text-gray-500">{selectedType.description}</p>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating...
          </span>
        ) : (
          'Generate Blog'
        )}
      </button>
    </form>
  );
}
