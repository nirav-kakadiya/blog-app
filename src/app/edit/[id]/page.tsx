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
import { SkeletonTabPanel } from '@/components/ui/Skeleton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { BlogType, Platform } from '@/types';
import {
  FileEdit,
  Image,
  Search,
  CheckCircle,
  Send,
  ChevronLeft,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

type TabType = 'editor' | 'images' | 'search' | 'quality' | 'publish';

const TABS: { key: TabType; label: string; icon: LucideIcon }[] = [
  { key: 'editor', label: 'Editor', icon: FileEdit },
  { key: 'images', label: 'Images', icon: Image },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'quality', label: 'Quality', icon: CheckCircle },
  { key: 'publish', label: 'Publish', icon: Send },
];

export default function EditBlogPage() {
  const params = useParams();
  const router = useRouter();
  const blogId = params.id as string;
  const toast = useToast();

  const [blog, setBlog] = useState<BlogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('editor');
  const [images, setImages] = useState<BlogImage[]>([]);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [scoreKey, setScoreKey] = useState(0);
  const [previousScores, setPreviousScores] = useState<{ overall: number; seo: number; aeo: number } | null>(null);
  const [currentScores, setCurrentScores] = useState<{ overall: number; seo: number; aeo: number } | null>(null);

  useUnsavedChanges(isDirty);

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
      setIsDirty(false);
      toast.success('Content saved successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [blogId, toast]);

  const handleOptimizeApply = useCallback(async (optimizedContent: string) => {
    if (!blogId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/blogs/${blogId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: optimizedContent }),
      });

      if (!res.ok) throw new Error('Failed to save optimized content');

      const data = await res.json();
      setBlog(data.data);
      setIsDirty(false);
      // Save current scores as previous for comparison after re-analysis
      setPreviousScores(currentScores);
      // Increment scoreKey to trigger re-analysis with new content
      setScoreKey((k) => k + 1);
      toast.success('Changes applied! Re-analyzing scores...');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply optimized content');
    } finally {
      setSaving(false);
    }
  }, [blogId, toast, currentScores]);

  const handleScoreUpdate = useCallback((scores: { overall: number; seo: number; aeo: number }) => {
    setCurrentScores(scores);
  }, []);

  const handleSEOChange = useCallback(async (seoData: {
    title: string;
    metaDescription: string;
    focusKeyword: string;
    secondaryKeywords: string[];
    canonicalUrl: string;
  }) => {
    if (!blogId || !blog) return;

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
      toast.error('Failed to save SEO settings');
    }
  }, [blogId, blog, toast]);

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
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
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
        toast.success('Image generated successfully');
      } else {
        throw new Error('Invalid image data received');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setGeneratingImages(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const res = await fetch(`/api/images/${imageId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete image');
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success('Image deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete image');
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-16" />
                <div className="h-6 w-px bg-gray-200" />
                <Skeleton className="h-5 w-48" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-24" rounded="rounded-lg" />
                <Skeleton className="h-8 w-16" rounded="rounded-lg" />
              </div>
            </div>
          </div>
        </header>
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-4 py-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 w-20" rounded="rounded-md" />)}
          </div>
        </div>
        <div className="max-w-3xl mx-auto w-full px-4">
          <SkeletonTabPanel />
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
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
                <ChevronLeft className="w-5 h-5" />
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
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Saving...
                </span>
              )}

              {isDirty && !saving && (
                <span className="flex items-center gap-1.5 text-xs text-amber-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Unsaved changes
                </span>
              )}

              {!isDirty && !saving && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="w-4 h-4" />
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
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        <div className="tab-enter" key={activeTab}>
          {activeTab === 'editor' && (
            <div className="h-full">
              <EditorLayout
                initialContent={blog.content}
                onSave={handleSaveContent}
                onChange={() => setIsDirty(true)}
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

          {activeTab === 'search' && (
            <div className="max-w-3xl mx-auto px-4 py-6">
              <SearchScorePanel
                key={scoreKey}
                content={blog.content}
                keyword={blog.focusKeyword || blog.keyword}
                title={blog.title}
                blogType={blog.blogType}
                metaDescription={blog.metaDescription}
                blogId={blogId}
                onOptimizeApply={handleOptimizeApply}
                previousScores={previousScores}
                onScoreUpdate={handleScoreUpdate}
                seoSettings={{
                  content: blog.content,
                  initialData: {
                    title: blog.title,
                    metaDescription: blog.metaDescription,
                    focusKeyword: blog.focusKeyword || blog.keyword,
                    secondaryKeywords: blog.secondaryKeywords || [],
                    canonicalUrl: blog.canonicalUrl || '',
                  },
                  onChange: handleSEOChange,
                }}
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
        </div>
      </main>
    </div>
  );
}
