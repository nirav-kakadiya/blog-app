'use client';

import { useState } from 'react';
import { BlogType } from '@/types';
import { BLOG_TYPE_ICONS } from '@/components/ui/icons';
import { Search, Zap, CheckCircle, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const BLOG_TYPES: { value: BlogType; label: string; description: string; icon: LucideIcon }[] = [
  { value: 'guide', label: 'Guide', description: 'How-to tutorials and comprehensive guides', icon: BLOG_TYPE_ICONS.guide },
  { value: 'prompt', label: 'Prompts', description: 'AI prompt libraries and templates', icon: BLOG_TYPE_ICONS.prompt },
  { value: 'comparison', label: 'Comparison', description: 'Tool comparisons and alternatives', icon: BLOG_TYPE_ICONS.comparison },
  { value: 'tips', label: 'Tips & Tricks', description: 'Quick tutorials and pro tips', icon: BLOG_TYPE_ICONS.tips },
  { value: 'usecase', label: 'Use Cases', description: 'Industry-specific use cases', icon: BLOG_TYPE_ICONS.usecase },
  { value: 'api', label: 'API Guide', description: 'API documentation and integration guides', icon: BLOG_TYPE_ICONS.api },
  { value: 'upcoming', label: 'Upcoming/Trends', description: 'News about upcoming releases', icon: BLOG_TYPE_ICONS.upcoming },
  { value: 'troubleshoot', label: 'Troubleshooting', description: 'Error fixes and debugging guides', icon: BLOG_TYPE_ICONS.troubleshoot },
  { value: 'tools', label: 'Tools & Models', description: 'Deep-dive articles on specific tools', icon: BLOG_TYPE_ICONS.tools },
  { value: 'review', label: 'Review', description: 'In-depth tool or model reviews', icon: BLOG_TYPE_ICONS.review },
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
            <Search className="w-5 h-5" />
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
          {BLOG_TYPES.map((type) => {
            const Icon = type.icon;
            return (
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
                <Icon className={`w-6 h-6 mb-2 ${blogType === type.value ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className={`text-sm font-medium ${blogType === type.value ? 'text-blue-700' : 'text-gray-700'}`}>
                  {type.label}
                </span>
                {blogType === type.value && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {selectedType && (
          <p className="mt-3 text-sm text-gray-500 flex items-center gap-2">
            {(() => { const Icon = selectedType.icon; return <Icon className="w-4 h-4 text-gray-400" />; })()}
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
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Titles...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            Generate Blog Titles
          </>
        )}
      </button>
    </form>
  );
}
