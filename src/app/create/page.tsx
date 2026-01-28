'use client';

import { useState, useCallback } from 'react';
import { BlogInputForm } from '@/components/BlogInputForm';
import { TitleSelector } from '@/components/TitleSelector';
import { EditorLayout } from '@/components/Editor';
import { BlogType } from '@/types';

type Step = 'input' | 'titles' | 'content';

export default function CreateBlogPage() {
  const [step, setStep] = useState<Step>('input');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blogData, setBlogData] = useState<{
    id?: string;
    keyword?: string;
    blogType?: BlogType;
    titles?: string[];
    selectedTitle?: string;
    content?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const handleSaveContent = useCallback(async (content: { html: string; markdown: string }) => {
    if (!blogData.id) return;

    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/blogs/${blogData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.markdown,
          status: 'review',
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      setBlogData((prev) => ({ ...prev, content: content.markdown }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [blogData.id]);

  const steps = [
    { key: 'input', label: 'Input', description: 'Enter keyword & type' },
    { key: 'titles', label: 'Title', description: 'Select a title' },
    { key: 'content', label: 'Edit', description: 'Edit content' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Create Blog</h1>
            <a
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </a>
          </div>

          {/* Progress Steps */}
          <div className="mt-4 flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      steps.findIndex((x) => x.key === step) >= i
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {steps.findIndex((x) => x.key === step) > i ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{s.label}</p>
                    <p className="text-xs text-gray-500">{s.description}</p>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-3 ${
                      steps.findIndex((x) => x.key === step) > i ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={step === 'content' ? 'h-[calc(100vh-140px)]' : ''}>
        {error && (
          <div className="max-w-4xl mx-auto px-4 pt-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-700 hover:text-red-900"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {saveSuccess && (
          <div className="fixed top-20 right-4 p-4 bg-green-50 border border-green-200 rounded-lg shadow-lg z-20">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Content saved successfully!
            </p>
          </div>
        )}

        {step === 'input' && (
          <div className="max-w-xl mx-auto px-4 py-8">
            <BlogInputForm onSubmit={handleInputSubmit} loading={loading} />
          </div>
        )}

        {step === 'titles' && blogData.titles && (
          <div className="max-w-2xl mx-auto px-4 py-8">
            <TitleSelector
              titles={blogData.titles}
              onSelect={handleTitleSelect}
              onRegenerate={handleRegenerate}
              loading={loading}
            />
          </div>
        )}

        {step === 'content' && blogData.content && (
          <div className="h-full">
            <div className="bg-white border-b border-gray-200 px-4 py-2">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div>
                  <h2 className="font-medium text-gray-900">{blogData.selectedTitle}</h2>
                  <p className="text-sm text-gray-500">
                    {blogData.keyword} &middot; {blogData.blogType}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {saving && (
                    <span className="text-sm text-gray-500 flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </span>
                  )}
                  <a
                    href="/dashboard"
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </a>
                </div>
              </div>
            </div>
            <div className="h-[calc(100%-60px)]">
              <EditorLayout
                initialContent={blogData.content}
                onSave={handleSaveContent}
                placeholder="Start editing your blog post..."
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
