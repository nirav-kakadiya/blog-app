'use client';

import { useState } from 'react';
import { BlogType } from '@/types';

const BLOG_TYPES: { value: BlogType; label: string; description: string; icon: string }[] = [
  { value: 'guide', label: 'Guide', description: 'How-to tutorials and comprehensive guides', icon: '📚' },
  { value: 'prompt', label: 'Prompts', description: 'AI prompt libraries and templates', icon: '✨' },
  { value: 'comparison', label: 'Comparison', description: 'Tool comparisons and alternatives', icon: '⚖️' },
  { value: 'tips', label: 'Tips & Tricks', description: 'Quick tutorials and pro tips', icon: '💡' },
  { value: 'usecase', label: 'Use Cases', description: 'Industry-specific use cases', icon: '🎯' },
  { value: 'api', label: 'API Guide', description: 'API documentation and integration guides', icon: '🔌' },
  { value: 'upcoming', label: 'Upcoming/Trends', description: 'News about upcoming releases', icon: '🚀' },
  { value: 'troubleshoot', label: 'Troubleshooting', description: 'Error fixes and debugging guides', icon: '🔧' },
  { value: 'tools', label: 'Tools & Models', description: 'Deep-dive articles on specific tools', icon: '🛠️' },
  { value: 'review', label: 'Review', description: 'In-depth tool or model reviews', icon: '⭐' },
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
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Keyword Input */}
      <div>
        <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
          Topic or Keyword
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            id="keyword"
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g., Flux AI image generation, GPT-4 prompts, LangChain tutorial"
            className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed text-gray-900 placeholder:text-gray-400 transition-all"
            disabled={loading}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Enter the main keyword or topic for your blog post
        </p>
      </div>

      {/* Blog Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Blog Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {BLOG_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setBlogType(type.value)}
              disabled={loading}
              className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                blogType === type.value
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="text-2xl mb-2">{type.icon}</span>
              <span className={`text-sm font-medium ${blogType === type.value ? 'text-blue-700' : 'text-gray-700'}`}>
                {type.label}
              </span>
              {blogType === type.value && (
                <div className="absolute top-2 right-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
        {selectedType && (
          <p className="mt-3 text-sm text-gray-500 flex items-center gap-2">
            <span className="text-lg">{selectedType.icon}</span>
            {selectedType.description}
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || keyword.trim().length < 2}
        className="w-full py-4 px-6 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating Titles...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Blog Titles
          </>
        )}
      </button>
    </form>
  );
}
