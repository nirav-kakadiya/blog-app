'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BLOG_TYPE_ICONS, STAT_ICONS } from '@/components/ui/icons';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SkeletonStatCard, SkeletonCard } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { Plus, Search, BookOpen, Pencil, Trash2, FileText, Settings } from 'lucide-react';

interface Blog {
  id: string;
  keyword: string;
  blogType: string;
  title: string;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG = {
  published: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Published' },
  review: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'In Review' },
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Draft' },
} as const;

export default function DashboardPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'draft' | 'review' | 'published'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch('/api/blogs');
        if (!res.ok) {
          throw new Error(`Failed to fetch blogs: ${res.status}`);
        }
        const data = await res.json();
        const blogList = data?.data;
        setBlogs(Array.isArray(blogList) ? blogList : []);
      } catch (err) {
        console.error('Failed to fetch blogs:', err);
        setError(err instanceof Error ? err.message : 'Failed to load blogs');
        setBlogs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(null);
    try {
      const res = await fetch(`/api/blogs/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete blog');
      }
      setBlogs((prev) => prev.filter((b) => b.id !== id));
      toast.success('Blog deleted successfully');
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete blog. Please try again.');
    }
  };

  const filteredBlogs = blogs.filter((blog) => {
    const matchesFilter = filter === 'all' || blog.status === filter;
    const matchesSearch = searchQuery === '' ||
      blog.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.keyword?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: blogs.length,
    published: blogs.filter((b) => b.status === 'published').length,
    review: blogs.filter((b) => b.status === 'review').length,
    draft: blogs.filter((b) => b.status === 'draft').length,
  };

  const STAT_CARDS = [
    { label: 'Total Blogs', value: stats.total, icon: STAT_ICONS.total, color: 'text-blue-600' },
    { label: 'Published', value: stats.published, icon: STAT_ICONS.published, color: 'text-green-600' },
    { label: 'In Review', value: stats.review, icon: STAT_ICONS.review, color: 'text-amber-600' },
    { label: 'Drafts', value: stats.draft, icon: STAT_ICONS.draft, color: 'text-gray-500' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Pencil className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-semibold text-gray-900">BlogForge</span>
                </Link>
              </div>
              <Link href="/create" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                New Blog
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => <SkeletonStatCard key={i} />)}
          </div>
          <div className="grid gap-4">
            {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
          </div>
        </main>
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
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-semibold text-gray-900">BlogForge</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Blog
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {STAT_CARDS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto scrollbar-hide">
              {(['all', 'draft', 'review', 'published'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex-shrink-0 ${
                    filter === f
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f !== 'all' && (
                    <span className="ml-1.5 text-xs text-gray-400">
                      ({f === 'draft' ? stats.draft : f === 'review' ? stats.review : stats.published})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search blogs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Blog List */}
        {filteredBlogs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            {blogs.length === 0 ? (
              <>
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No blogs yet</h3>
                <p className="text-gray-500 mb-6">Create your first blog post to get started</p>
                <Link
                  href="/create"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Blog
                </Link>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No blogs found</h3>
                <p className="text-gray-500">Try adjusting your search or filter criteria</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredBlogs.map((blog) => {
              const statusConfig = STATUS_CONFIG[blog.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
              const Icon = BLOG_TYPE_ICONS[blog.blogType] || FileText;

              return (
                <div
                  key={blog.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {blog.title || 'Untitled'}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-sm text-gray-500">{blog.keyword}</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-sm text-gray-500 capitalize">{blog.blogType}</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-sm text-gray-400">
                            {new Date(blog.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                        {statusConfig.label}
                      </span>

                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/edit/${blog.id}`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteConfirmId(blog.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
        title="Delete Blog"
        description="This action cannot be undone. The blog and all its content will be permanently deleted."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
