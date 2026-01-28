'use client';

import { useState } from 'react';
import { BlogInputForm } from '@/components/BlogInputForm';
import { TitleSelector } from '@/components/TitleSelector';
import { BlogType } from '@/types';

type Step = 'input' | 'titles' | 'content';

export default function CreateBlogPage() {
  const [step, setStep] = useState<Step>('input');
  const [loading, setLoading] = useState(false);
  const [blogData, setBlogData] = useState<{
    id?: string;
    keyword?: string;
    blogType?: BlogType;
    titles?: string[];
    selectedTitle?: string;
    content?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);

  const handleInputSubmit = async (data: { keyword: string; blogType: BlogType }) => {
    setLoading(true);
    setError(null);

    try {
      const createRes = await fetch('/api/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!createRes.ok) throw new Error('Failed to create blog');
      const createResult = await createRes.json();

      const titlesRes = await fetch('/api/blogs/generate-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!titlesRes.ok) throw new Error('Failed to generate titles');
      const titlesResult = await titlesRes.json();

      setBlogData({
        id: createResult.data.id,
        keyword: data.keyword,
        blogType: data.blogType,
        titles: titlesResult.data.titles,
      });
      setStep('titles');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleSelect = async (title: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/blogs/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId: blogData.id, title }),
      });

      if (!res.ok) throw new Error('Failed to generate content');
      const result = await res.json();

      setBlogData((prev) => ({
        ...prev,
        selectedTitle: title,
        content: result.data.blog.content.markdown,
      }));
      setStep('content');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!blogData.keyword || !blogData.blogType) return;
    setLoading(true);
    try {
      const res = await fetch('/api/blogs/generate-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: blogData.keyword, blogType: blogData.blogType }),
      });
      if (!res.ok) throw new Error('Failed to regenerate');
      const result = await res.json();
      setBlogData((prev) => ({ ...prev, titles: result.data.titles }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8 flex gap-4">
          {['input', 'titles', 'content'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                ['input', 'titles', 'content'].indexOf(step) >= i
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {i + 1}
              </div>
              <span className="ml-2 text-sm capitalize">{s}</span>
              {i < 2 && <div className="w-8 h-0.5 mx-2 bg-gray-200" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {step === 'input' && <BlogInputForm onSubmit={handleInputSubmit} loading={loading} />}

        {step === 'titles' && blogData.titles && (
          <TitleSelector
            titles={blogData.titles}
            onSelect={handleTitleSelect}
            onRegenerate={handleRegenerate}
            loading={loading}
          />
        )}

        {step === 'content' && (
          <div className="max-w-4xl">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <p className="text-green-700">Blog generated successfully!</p>
            </div>
            <h3 className="text-lg font-semibold mb-4">{blogData.selectedTitle}</h3>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm">
              {blogData.content}
            </pre>
            <a
              href="/dashboard"
              className="mt-4 inline-block py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
