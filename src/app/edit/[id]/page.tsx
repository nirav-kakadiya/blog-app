'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { EditorLayout } from '@/components/Editor';
import { BlogType } from '@/types';

interface BlogData {
  id: string;
  keyword: string;
  blogType: BlogType;
  title: string;
  metaDescription: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function EditBlogPage() {
  const params = useParams();
  const router = useRouter();
  const blogId = params.id as string;

  const [blog, setBlog] = useState<BlogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function fetchBlog() {
      try {
        const res = await fetch(`/api/blogs/${blogId}`);
        if (!res.ok) throw new Error('Blog not found');
        const data = await res.json();
        setBlog(data.data);
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
    <div className="min-h-screen bg-gray-50">
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
              <span className="text-sm text-gray-600">Edit Blog</span>
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

      {/* Content Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900">{blog.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium capitalize">
              {blog.blogType}
            </span>
            <span className="text-gray-300">|</span>
            <span>{blog.keyword}</span>
            <span className="text-gray-300">|</span>
            <span>
              Last updated: {new Date(blog.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Editor */}
      <main className="h-[calc(100vh-140px)]">
        <EditorLayout
          initialContent={blog.content}
          onSave={handleSaveContent}
          placeholder="Start editing your blog post..."
        />
      </main>
    </div>
  );
}
