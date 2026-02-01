'use client';

import { useState, useCallback } from 'react';
import { Platform } from '@/types';
import { useToast } from '@/hooks/useToast';

interface PlatformStatus {
  platform: Platform;
  status: 'idle' | 'publishing' | 'success' | 'error';
  publishedUrl?: string;
  error?: string;
}

interface PublishPanelProps {
  blogId: string;
  availablePlatforms?: Platform[];
  onPublish?: (platforms: Platform[]) => Promise<{ results: { platform: Platform; success: boolean; publishedUrl?: string; error?: string }[] }>;
  onPreview?: (platform: Platform) => Promise<{ content: string; metadata: Record<string, unknown> }>;
}

const PLATFORM_INFO: Record<Platform, { name: string; icon: string; description: string }> = {
  medium: {
    name: 'Medium',
    icon: 'M',
    description: 'Markdown format with image handling',
  },
  devto: {
    name: 'Dev.to',
    icon: 'DEV',
    description: 'Frontmatter + markdown with tags',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: 'in',
    description: 'Post or Article format',
  },
  wordpress: {
    name: 'WordPress',
    icon: 'WP',
    description: 'Gutenberg HTML with SEO metadata',
  },
  hashnode: {
    name: 'Hashnode',
    icon: 'HN',
    description: 'Markdown with frontmatter',
  },
  ghost: {
    name: 'Ghost',
    icon: 'G',
    description: 'Markdown or MobileDoc format',
  },
  quora: {
    name: 'Quora',
    icon: 'Q',
    description: 'Answer format, conversational',
  },
  reddit: {
    name: 'Reddit',
    icon: 'R',
    description: 'Markdown, shortened format',
  },
};

export function PublishPanel({
  blogId,
  availablePlatforms = ['medium', 'devto', 'linkedin', 'wordpress'],
  onPublish,
  onPreview,
}: PublishPanelProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(new Set());
  const [platformStatuses, setPlatformStatuses] = useState<Map<Platform, PlatformStatus>>(new Map());
  const [isPublishing, setIsPublishing] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<Platform | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const toast = useToast();

  const togglePlatform = useCallback((platform: Platform) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) {
        next.delete(platform);
      } else {
        next.add(platform);
      }
      return next;
    });
  }, []);

  const handlePreview = useCallback(async (platform: Platform) => {
    if (!onPreview) return;

    setPreviewPlatform(platform);
    setPreviewLoading(true);
    setPreviewContent(null);
    setPreviewWarnings([]);

    try {
      const result = await onPreview(platform);
      // Handle both string content and object with content property
      const content = typeof result === 'string'
        ? result
        : (result?.content ?? 'No content available');
      setPreviewContent(content);

      // Extract warnings if present - use type-safe extraction
      const resultWithWarnings = result as { content: string; metadata: Record<string, unknown>; warnings?: string[] };
      const warnings = Array.isArray(resultWithWarnings?.warnings) ? resultWithWarnings.warnings : [];
      setPreviewWarnings(warnings);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setPreviewContent(`Error loading preview: ${errorMsg}\n\nPlease try again or check the blog content.`);
      setPreviewWarnings([`Preview failed: ${errorMsg}`]);
    } finally {
      setPreviewLoading(false);
    }
  }, [onPreview]);

  const handlePublish = useCallback(async () => {
    if (!onPublish || selectedPlatforms.size === 0) return;

    setIsPublishing(true);

    // Set all selected platforms to publishing status
    const newStatuses = new Map(platformStatuses);
    selectedPlatforms.forEach((platform) => {
      newStatuses.set(platform, { platform, status: 'publishing' });
    });
    setPlatformStatuses(newStatuses);

    try {
      const result = await onPublish(Array.from(selectedPlatforms));

      // Update statuses based on results
      const finalStatuses = new Map(platformStatuses);
      result.results.forEach((r) => {
        finalStatuses.set(r.platform, {
          platform: r.platform,
          status: r.success ? 'success' : 'error',
          publishedUrl: r.publishedUrl,
          error: r.error,
        });
      });
      setPlatformStatuses(finalStatuses);
    } catch (error) {
      // Mark all as error
      const errorStatuses = new Map(platformStatuses);
      selectedPlatforms.forEach((platform) => {
        errorStatuses.set(platform, {
          platform,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
      setPlatformStatuses(errorStatuses);
    } finally {
      setIsPublishing(false);
    }
  }, [onPublish, selectedPlatforms, platformStatuses]);

  const copyToClipboard = useCallback(async (platform: Platform) => {
    if (!onPreview) return;

    try {
      const result = await onPreview(platform);
      await navigator.clipboard.writeText(result.content);
      toast.success('Content copied to clipboard');
    } catch {
      toast.error('Failed to copy content');
    }
  }, [onPreview]);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Publish to Platforms</h3>
        <p className="text-sm text-gray-500">Select platforms and publish your content</p>
      </div>

      {/* Platform Selection */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {availablePlatforms.map((platform) => {
          const info = PLATFORM_INFO[platform];
          const status = platformStatuses.get(platform);
          const isSelected = selectedPlatforms.has(platform);

          return (
            <div
              key={platform}
              onClick={() => togglePlatform(platform)}
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center font-bold text-xs text-gray-700">
                    {info.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{info.name}</p>
                    <p className="text-xs text-gray-500">{info.description}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="w-4 h-4 text-blue-600"
                />
              </div>

              {/* Status indicator */}
              {status && (
                <div className="mt-2 flex items-center gap-2">
                  {status.status === 'publishing' && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Publishing...
                    </span>
                  )}
                  {status.status === 'success' && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Published
                    </span>
                  )}
                  {status.status === 'error' && (
                    <span className="text-xs text-red-600">{status.error || 'Failed'}</span>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-2 flex gap-2">
                {onPreview && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(platform);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Preview
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(platform);
                  }}
                  className="text-xs text-gray-600 hover:text-gray-700"
                >
                  Copy
                </button>
                {status?.publishedUrl && (
                  <a
                    href={status.publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-green-600 hover:text-green-700"
                  >
                    Open
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Publish Button */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {selectedPlatforms.size} platform{selectedPlatforms.size !== 1 ? 's' : ''} selected
        </p>
        <button
          onClick={handlePublish}
          disabled={selectedPlatforms.size === 0 || isPublishing || !onPublish}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPublishing ? 'Publishing...' : 'Publish'}
        </button>
      </div>

      {/* Preview Modal */}
      {previewPlatform && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewPlatform(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h4 className="font-semibold">
                {PLATFORM_INFO[previewPlatform].name} Preview
              </h4>
              <button
                onClick={() => setPreviewPlatform(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {previewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {previewWarnings.length > 0 && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800 mb-1">Warnings:</p>
                      <ul className="text-xs text-yellow-700 list-disc list-inside">
                        {previewWarnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <pre className="text-sm font-mono whitespace-pre-wrap bg-gray-50 p-4 rounded">
                    {previewContent || 'No preview content available'}
                  </pre>
                </>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => copyToClipboard(previewPlatform)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setPreviewPlatform(null)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
