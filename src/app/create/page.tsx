'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { BlogInputForm } from '@/components/BlogInputForm';
import { TitleSelector } from '@/components/TitleSelector';
import { EditorLayout } from '@/components/Editor';
import { BlogType } from '@/types';

type Step = 'input' | 'titles' | 'generating' | 'content';

const STEPS = [
  { key: 'input' as const, label: 'Topic', icon: '1' },
  { key: 'titles' as const, label: 'Title', icon: '2' },
  { key: 'generating' as const, label: 'Generate', icon: '3' },
  { key: 'content' as const, label: 'Edit', icon: '4' },
];

export default function CreateBlogPage() {
  const [step, setStep] = useState<Step>('input');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<string>('');
  const [blogData, setBlogData] = useState<{
    id?: string;
    keyword?: string;
    blogType?: BlogType;
    titles?: string[];
    selectedTitle?: string;
    content?: string;
    imageCount?: number;
    contentCheck?: {
      score: number;
      grade: string;
      summary: string;
      checks: { id: string; name: string; category: string; passed: boolean; message: string; importance: string; details?: string }[];
      suggestions: string[];
    };
    seoScore?: number;
    aeoScore?: number;
    searchScore?: number;
    searchGrade?: string;
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
    setError(null);
    setBlogData((prev) => ({ ...prev, selectedTitle: title }));

    // Show the generation step with progress
    setStep('generating');
    setGenerationPhase('Writing blog content...');

    try {
      // This single API call now handles: content generation + image generation + image insertion
      const res = await fetch('/api/blogs/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId: blogData.id, title }),
      });

      if (!res.ok) throw new Error('Failed to generate content');
      const result = await res.json();

      // Safely extract content with fallbacks
      const content = result?.data?.blog?.content?.markdown ?? result?.data?.content?.markdown ?? '';
      const imageCount = result?.data?.blog?.images?.length ?? 0;
      const contentCheck = result?.data?.contentCheck ?? undefined;
      const seoScore = result?.data?.seoAnalysis?.score ?? undefined;
      const aeoScore = result?.data?.aeoAnalysis?.score ?? undefined;
      const searchScore = result?.data?.unifiedSearchScore?.overall ?? undefined;
      const searchGrade = result?.data?.unifiedSearchScore?.grade ?? undefined;

      setBlogData((prev) => ({
        ...prev,
        selectedTitle: title,
        content,
        imageCount,
        contentCheck,
        seoScore,
        aeoScore,
        searchScore,
        searchGrade,
      }));
      setStep('content');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Go back to titles step on error
      setStep('titles');
    } finally {
      setLoading(false);
      setGenerationPhase('');
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

        {/* Step 3: Generation Progress */}
        {step === 'generating' && (
          <div className="max-w-2xl mx-auto px-4 py-20 animate-fadeIn">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-8">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Creating Your Blog</h1>
              <p className="text-lg text-gray-600 mb-8">{blogData.selectedTitle}</p>

              <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                <div className="space-y-6">
                  {/* Phase indicators */}
                  <GenerationStep
                    label="Generating blog content"
                    description="Writing SEO-optimized article with GPT-4o"
                    active={generationPhase.includes('content') || generationPhase === ''}
                    done={generationPhase.includes('image') || generationPhase.includes('insert') || generationPhase.includes('SEO')}
                  />
                  <GenerationStep
                    label="Creating image prompts"
                    description="Designing prompts based on your keyword and title"
                    active={generationPhase.includes('prompt')}
                    done={generationPhase.includes('Generating image') || generationPhase.includes('insert') || generationPhase.includes('SEO')}
                  />
                  <GenerationStep
                    label="Generating images"
                    description="Creating visuals with Imagen 3 AI"
                    active={generationPhase.includes('Generating image') || generationPhase.includes('Uploading')}
                    done={generationPhase.includes('insert') || generationPhase.includes('SEO')}
                  />
                  <GenerationStep
                    label="Inserting images & analyzing"
                    description="Placing images, SEO + AEO analysis, Schema.org generation"
                    active={generationPhase.includes('insert') || generationPhase.includes('SEO') || generationPhase.includes('AEO')}
                    done={generationPhase.includes('check')}
                  />
                  <GenerationStep
                    label="Content quality check"
                    description="Verifying structure, readability and completeness"
                    active={generationPhase.includes('check')}
                    done={false}
                  />
                </div>

                <p className="text-sm text-gray-400 mt-8">
                  This may take a minute. Your blog is being crafted with care.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Content Editor */}
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
                    {(blogData.imageCount ?? 0) > 0 && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="text-green-600">{blogData.imageCount} images</span>
                      </>
                    )}
                    {blogData.contentCheck && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className={
                          blogData.contentCheck.score >= 75 ? 'text-green-600' :
                          blogData.contentCheck.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }>
                          Quality: {blogData.contentCheck.grade} ({blogData.contentCheck.score}%)
                        </span>
                      </>
                    )}
                    {blogData.searchScore != null && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className={
                          blogData.searchScore >= 75 ? 'text-green-600' :
                          blogData.searchScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }>
                          Search: {blogData.searchGrade} ({blogData.searchScore}%)
                        </span>
                      </>
                    )}
                    {blogData.seoScore != null && blogData.aeoScore != null && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-500 text-xs">
                          SEO {blogData.seoScore}% / AEO {blogData.aeoScore}%
                        </span>
                      </>
                    )}
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
            {/* Content Check Suggestions */}
            {blogData.contentCheck && blogData.contentCheck.suggestions.length > 0 && (
              <ContentCheckBanner
                score={blogData.contentCheck.score}
                grade={blogData.contentCheck.grade}
                summary={blogData.contentCheck.summary}
                suggestions={blogData.contentCheck.suggestions}
                checks={blogData.contentCheck.checks}
              />
            )}
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

function ContentCheckBanner({
  score,
  grade,
  summary,
  suggestions,
  checks,
}: {
  score: number;
  grade: string;
  summary: string;
  suggestions: string[];
  checks: { id: string; name: string; category: string; passed: boolean; message: string; importance: string }[];
}) {
  const [expanded, setExpanded] = useState(false);

  const bgColor = score >= 75 ? 'bg-green-50 border-green-200' : score >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
  const textColor = score >= 75 ? 'text-green-700' : score >= 50 ? 'text-yellow-700' : 'text-red-700';
  const iconColor = score >= 75 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500';

  const failedCritical = checks.filter((c) => !c.passed && c.importance === 'critical');
  const failedImportant = checks.filter((c) => !c.passed && c.importance === 'important');
  const failedOptional = checks.filter((c) => !c.passed && c.importance === 'optional');

  return (
    <div className={`border-b ${bgColor} px-6 py-3`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 ${iconColor}`}>
              {score >= 75 ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
              <span className={`text-sm font-semibold ${textColor}`}>
                Quality: {grade} ({score}%)
              </span>
            </div>
            <span className="text-xs text-gray-500">{summary}</span>
          </div>
          {suggestions.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className={`text-xs font-medium ${textColor} hover:underline flex items-center gap-1`}
            >
              {expanded ? 'Hide' : `${suggestions.length} suggestion(s)`}
              <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 pb-1">
            {failedCritical.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 mb-1">Critical Issues:</p>
                {failedCritical.map((c) => (
                  <p key={c.id} className="text-xs text-red-600 ml-4">- {c.message}</p>
                ))}
              </div>
            )}
            {failedImportant.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-yellow-700 mb-1">Improvements:</p>
                {failedImportant.map((c) => (
                  <p key={c.id} className="text-xs text-yellow-700 ml-4">- {c.message}</p>
                ))}
              </div>
            )}
            {failedOptional.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Optional:</p>
                {failedOptional.map((c) => (
                  <p key={c.id} className="text-xs text-gray-500 ml-4">- {c.message}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GenerationStep({
  label,
  description,
  active,
  done,
}: {
  label: string;
  description: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className={`flex items-start gap-4 transition-opacity ${!active && !done ? 'opacity-40' : ''}`}>
      <div className="flex-shrink-0 mt-0.5">
        {done ? (
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : active ? (
          <div className="w-6 h-6 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-gray-300 rounded-full" />
          </div>
        )}
      </div>
      <div>
        <p className={`text-sm font-medium ${done ? 'text-green-700' : active ? 'text-blue-700' : 'text-gray-500'}`}>
          {label}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
