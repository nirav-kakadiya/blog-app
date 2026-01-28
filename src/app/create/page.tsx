'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { BlogInputForm } from '@/components/BlogInputForm';
import { TitleSelector } from '@/components/TitleSelector';
import { EditorLayout } from '@/components/Editor';
import { BlogType } from '@/types';

type Step = 'input' | 'titles' | 'content';

const STEPS = [
  { key: 'input' as const, label: 'Topic', icon: '1' },
  { key: 'titles' as const, label: 'Title', icon: '2' },
  { key: 'content' as const, label: 'Edit', icon: '3' },
];

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

      // Safely extract content with fallbacks
      const content = result?.data?.blog?.content?.markdown ?? result?.data?.content?.markdown ?? '';

      setBlogData((prev) => ({
        ...prev,
        selectedTitle: title,
        content,
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

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <span className="text-lg font-semibold text-gray-900 hidden sm:block">BlogForge</span>
              </Link>
              <div className="h-6 w-px bg-gray-200" />
              <span className="text-sm text-gray-600">Create New Blog</span>
            </div>

            {/* Progress Steps */}
            <div className="hidden md:flex items-center gap-1">
              {STEPS.map((s, i) => (
                <div key={s.key} className="flex items-center">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors"
                    style={{
                      background: currentStepIndex >= i ? (currentStepIndex === i ? '#1a73e8' : '#e8f0fe') : 'transparent',
                      color: currentStepIndex >= i ? (currentStepIndex === i ? 'white' : '#1a73e8') : '#9aa0a6',
                    }}
                  >
                    <span className="w-5 h-5 text-xs font-medium flex items-center justify-center rounded-full"
                      style={{
                        background: currentStepIndex > i ? '#1a73e8' : 'transparent',
                        color: currentStepIndex > i ? 'white' : 'inherit',
                      }}
                    >
                      {currentStepIndex > i ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        s.icon
                      )}
                    </span>
                    <span className="text-sm font-medium">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-8 h-0.5 mx-1" style={{ background: currentStepIndex > i ? '#1a73e8' : '#dadce0' }} />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {saving && (
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              )}
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={step === 'content' ? 'h-[calc(100vh-64px)]' : ''}>
        {/* Error Alert */}
        {error && (
          <div className="max-w-4xl mx-auto px-4 pt-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between animate-fadeIn">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-red-800">Something went wrong</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {saveSuccess && (
          <div className="fixed top-20 right-4 p-4 bg-green-50 border border-green-200 rounded-xl shadow-lg z-50 animate-slideIn">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Content saved successfully!
            </p>
          </div>
        )}

        {/* Step 1: Input */}
        {step === 'input' && (
          <div className="max-w-2xl mx-auto px-4 py-12 animate-fadeIn">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Create a New Blog</h1>
              <p className="text-lg text-gray-600">Enter your topic and select a blog type to get started</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <BlogInputForm onSubmit={handleInputSubmit} loading={loading} />
            </div>
          </div>
        )}

        {/* Step 2: Title Selection */}
        {step === 'titles' && blogData.titles && (
          <div className="max-w-3xl mx-auto px-4 py-12 animate-fadeIn">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Choose Your Title</h1>
              <p className="text-lg text-gray-600">
                Select a title for <span className="font-medium text-blue-600">"{blogData.keyword}"</span>
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <TitleSelector
                titles={blogData.titles}
                onSelect={handleTitleSelect}
                onRegenerate={handleRegenerate}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* Step 3: Content Editor */}
        {step === 'content' && blogData.content && (
          <div className="h-full flex flex-col animate-fadeIn">
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{blogData.selectedTitle}</h2>
                  <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium capitalize">{blogData.blogType}</span>
                    <span className="text-gray-300">|</span>
                    <span>{blogData.keyword}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Done
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
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
