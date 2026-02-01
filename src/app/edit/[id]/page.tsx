'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { EditorLayout } from '@/components/Editor';
import { ImagePanel } from '@/components/ImagePanel';
import { SEOPanel } from '@/components/SEOPanel';
import { PublishPanel } from '@/components/PublishPanel';
import { ContentCheckPanel } from '@/components/ContentCheckPanel';
import { SearchScorePanel } from '@/components/SearchScorePanel';
import { SEOAnalysisPanel } from '@/components/SEOAnalysisPanel';
import { AEOAnalysisPanel } from '@/components/AEOAnalysisPanel';
import { BlogType, Platform } from '@/types';

interface BlogImage {
  id: string;
  prompt: string;
  s3Url: string;
  altText: string;
  placement: string;
}

interface BlogData {
  id: string;
  keyword: string;
  blogType: BlogType;
  title: string;
  metaDescription: string;
  content: string;
  canonicalUrl?: string;
  focusKeyword?: string;
  secondaryKeywords?: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  images?: BlogImage[];
}

type TabType = 'editor' | 'images' | 'seo-analysis' | 'aeo-analysis' | 'search' | 'seo' | 'quality' | 'publish';

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'editor', label: 'Editor', icon: '📝' },
  { key: 'images', label: 'Images', icon: '🖼️' },
  { key: 'seo-analysis', label: 'SEO', icon: '🔍' },
  { key: 'aeo-analysis', label: 'AEO', icon: '🤖' },
  { key: 'search', label: 'Combined', icon: '📊' },
  { key: 'seo', label: 'Settings', icon: '⚙️' },
  { key: 'quality', label: 'Quality', icon: '✅' },
  { key: 'publish', label: 'Publish', icon: '🚀' },
];

export default function EditBlogPage() {
  const params = useParams();
  const router = useRouter();
  const blogId = params.id as string;

  const [blog, setBlog] = useState<BlogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('editor');
  const [images, setImages] = useState<BlogImage[]>([]);
  const [generatingImages, setGeneratingImages] = useState(false);

  useEffect(() => {
    async function fetchBlog() {
      try {
        const res = await fetch(`/api/blogs/${blogId}`);
        if (!res.ok) throw new Error('Blog not found');
        const data = await res.json();
        const blogData = data?.data;
        if (!blogData || typeof blogData !== 'object') {
          throw new Error('Invalid blog data received');
        }
        setBlog(blogData);

        // Fetch images - ensure we always get an array
        try {
          const imagesRes = await fetch(`/api/images/blog/${blogId}`);
          if (imagesRes.ok) {
            const imagesData = await imagesRes.json();
            const imagesList = imagesData?.data;
            setImages(Array.isArray(imagesList) ? imagesList : []);
          }
        } catch (imgErr) {
          console.error('Failed to fetch images:', imgErr);
          setImages([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load blog');
      } finally {
        setLoading(false);
      }
    }

    if (blogId) {
      fetchBlog();
    }
  }, [blogId]);

  const handleSaveContent = useCallback(async (content: { html: string; markdown: string }) => {
    if (!blogId) return;

    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/blogs/${blogId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.markdown,
        }),
      });

      if (!res.ok) throw new Error('Failed to save');

      const data = await res.json();
      setBlog(data.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [blogId]);

  const handleSEOChange = useCallback(async (seoData: {
    title: string;
    metaDescription: string;
    focusKeyword: string;
    secondaryKeywords: string[];
    canonicalUrl: string;
  }) => {
    if (!blogId || !blog) return;

    // Debounced auto-save for SEO changes
    try {
      await fetch(`/api/blogs/${blogId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: seoData.title || blog.title,
          metaDescription: seoData.metaDescription,
          focusKeyword: seoData.focusKeyword,
          secondaryKeywords: seoData.secondaryKeywords,
          canonicalUrl: seoData.canonicalUrl,
        }),
      });
    } catch (err) {
      console.error('Failed to save SEO data:', err);
    }
  }, [blogId, blog]);

  const handleStatusChange = async (newStatus: string) => {
    if (!blogId) return;

    try {
      const res = await fetch(`/api/blogs/${blogId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      const data = await res.json();
      setBlog(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleGenerateImage = async (prompt: string) => {
    if (!blogId) return;

    setGeneratingImages(true);
    try {
      const res = await fetch('/api/images/generate-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId, prompt }),
      });

      if (!res.ok) throw new Error('Failed to generate image');

      const data = await res.json();
      const newImage = data?.data?.image || data?.data;
      if (newImage && typeof newImage === 'object' && newImage.id) {
        setImages((prev) => [...prev, newImage]);
      } else {
        throw new Error('Invalid image data received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setGeneratingImages(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const res = await fetch(`/api/images/${imageId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete image');
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    }
  };

  const handlePublish = async (platforms: Platform[]) => {
    if (!blogId) return { results: [] };

    const res = await fetch(`/api/publish/${blogId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platforms }),
    });

    if (!res.ok) throw new Error('Failed to publish');

    return res.json();
  };

  const handlePreview = async (platform: Platform) => {
    if (!blogId) return { content: '', metadata: {} };

    const res = await fetch(`/api/publish/preview/${blogId}/${platform}`);
    if (!res.ok) throw new Error('Failed to load preview');

    const data = await res.json();
    return { content: data.data.content, metadata: data.data.metadata };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Loading blog...</p>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Blog not found</h2>
          <p className="text-gray-500 mb-6">{error || 'The blog you are looking for does not exist.'}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm">Back</span>
              </Link>
              <div className="h-6 w-px bg-gray-200" />
              <span className="text-sm text-gray-600 truncate max-w-[200px]" title={blog.title}>
                {blog.title}
              </span>
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

              {saveSuccess && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}

              <select
                value={blog.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="review">In Review</option>
                <option value="published">Published</option>
              </select>

              <Link
                href="/dashboard"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Done
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'editor' && (
          <div className="h-full">
            <EditorLayout
              initialContent={blog.content}
              onSave={handleSaveContent}
              placeholder="Start editing your blog post..."
            />
          </div>
        )}

        {activeTab === 'images' && (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <ImagePanel
              blogId={blogId}
              images={images}
              onGenerateNew={handleGenerateImage}
              onDelete={handleDeleteImage}
              isGenerating={generatingImages}
            />
          </div>
        )}

        {activeTab === 'seo-analysis' && (
          <div className="max-w-3xl mx-auto px-4 py-6">
            <SEOAnalysisPanel
              content={blog.content}
              keyword={blog.focusKeyword || blog.keyword}
              title={blog.title}
            />
          </div>
        )}

        {activeTab === 'aeo-analysis' && (
          <div className="max-w-3xl mx-auto px-4 py-6">
            <AEOAnalysisPanel
              content={blog.content}
              keyword={blog.focusKeyword || blog.keyword}
              title={blog.title}
              blogType={blog.blogType}
            />
          </div>
        )}

        {activeTab === 'search' && (
          <div className="max-w-3xl mx-auto px-4 py-6">
            <SearchScorePanel
              content={blog.content}
              keyword={blog.focusKeyword || blog.keyword}
              title={blog.title}
              blogType={blog.blogType}
              metaDescription={blog.metaDescription}
            />
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="max-w-3xl mx-auto px-4 py-6">
            <SEOPanel
              content={blog.content}
              initialData={{
                title: blog.title,
                metaDescription: blog.metaDescription,
                focusKeyword: blog.focusKeyword || blog.keyword,
                secondaryKeywords: blog.secondaryKeywords || [],
                canonicalUrl: blog.canonicalUrl || '',
              }}
              onChange={handleSEOChange}
            />
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="max-w-3xl mx-auto px-4 py-6">
            <ContentCheckPanel
              content={blog.content}
              keyword={blog.focusKeyword || blog.keyword}
              title={blog.title}
              blogType={blog.blogType}
            />
          </div>
        )}

        {activeTab === 'publish' && (
          <div className="max-w-3xl mx-auto px-4 py-6">
            <PublishPanel
              blogId={blogId}
              availablePlatforms={['medium', 'devto', 'linkedin', 'wordpress', 'ghost', 'hashnode']}
              onPublish={handlePublish}
              onPreview={handlePreview}
            />
          </div>
        )}
      </main>
    </div>
  );
}
