'use client';

import { useState, useEffect } from 'react';
import { PLATFORM_ICONS } from '@/components/ui/icons';
import { FileText, CheckCircle, Globe, BarChart3, ExternalLink, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface PlatformStats {
  platform: string;
  publishedUrl: string;
  publishedAt: string;
  status: string;
}

interface BlogAnalytics {
  blogId: string;
  title: string;
  totalViews: number;
  platforms: PlatformStats[];
  createdAt: string;
  updatedAt: string;
}

interface Props {
  blogId?: string;
  showAllBlogs?: boolean;
}

export function AnalyticsWidget({ blogId, showAllBlogs = false }: Props) {
  const [analytics, setAnalytics] = useState<BlogAnalytics | null>(null);
  const [allAnalytics, setAllAnalytics] = useState<BlogAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);

      try {
        if (blogId) {
          const response = await fetch(`/api/analytics/${blogId}`);
          if (!response.ok) throw new Error('Failed to fetch analytics');
          const data = await response.json();
          setAnalytics(data.data);
        } else if (showAllBlogs) {
          const response = await fetch('/api/analytics');
          if (!response.ok) throw new Error('Failed to fetch analytics');
          const data = await response.json();
          setAllAnalytics(data.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [blogId, showAllBlogs]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  // Single blog analytics
  if (analytics) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Publishing Status</h3>

        {analytics.platforms.length === 0 ? (
          <p className="text-sm text-gray-500">Not published to any platform yet.</p>
        ) : (
          <div className="space-y-3">
            {analytics.platforms.map((platform) => (
              <div
                key={platform.platform}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={platform.platform} />
                  <div>
                    <p className="text-sm font-medium capitalize">{platform.platform}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(platform.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={platform.status} />
                  {platform.publishedUrl && (
                    <a
                      href={platform.publishedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // All blogs analytics (dashboard)
  if (showAllBlogs && allAnalytics.length > 0) {
    const totalPublished = allAnalytics.reduce(
      (acc, blog) => acc + blog.platforms.filter((p) => p.status === 'published').length,
      0
    );
    const platformCounts = allAnalytics.reduce(
      (acc, blog) => {
        blog.platforms.forEach((p) => {
          acc[p.platform] = (acc[p.platform] || 0) + 1;
        });
        return acc;
      },
      {} as Record<string, number>
    );

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Publishing Analytics</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Blogs" value={allAnalytics.length} icon={FileText} />
          <StatCard label="Published" value={totalPublished} icon={CheckCircle} />
          <StatCard label="Platforms" value={Object.keys(platformCounts).length} icon={Globe} />
          <StatCard
            label="Avg Per Blog"
            value={(totalPublished / Math.max(allAnalytics.length, 1)).toFixed(1)}
            icon={BarChart3}
          />
        </div>

        <h4 className="text-sm font-medium text-gray-700 mb-3">By Platform</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(platformCounts).map(([platform, count]) => (
            <div
              key={platform}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full"
            >
              <PlatformIcon platform={platform} size="sm" />
              <span className="text-sm capitalize">{platform}</span>
              <span className="text-xs text-gray-500">({count})</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm text-gray-500">No analytics data available.</p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string }> = {
    published: { bg: 'bg-green-100', text: 'text-green-700' },
    draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
    failed: { bg: 'bg-red-100', text: 'text-red-700' },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      {status}
    </span>
  );
}

function PlatformIcon({ platform, size = 'md' }: { platform: string; size?: 'sm' | 'md' }) {
  const Icon = PLATFORM_ICONS[platform] || Globe;
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return <Icon className={`${sizeClass} text-gray-500`} />;
}
