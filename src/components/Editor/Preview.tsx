'use client';

import { useMemo } from 'react';
import { markdownToHtml, editorStyles } from '@/lib/tiptap-config';

interface PreviewProps {
  content: string;
  isMarkdown?: boolean;
  className?: string;
}

export function Preview({ content, isMarkdown = true, className = '' }: PreviewProps) {
  const htmlContent = useMemo(() => {
    if (!content) return '';
    return isMarkdown ? markdownToHtml(content) : content;
  }, [content, isMarkdown]);

  return (
    <div className={`preview-container ${className}`}>
      <style>{editorStyles}</style>
      <style>{`
        .preview-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          line-height: 1.7;
          color: #1f2937;
        }

        .preview-container h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1rem;
          line-height: 1.2;
          color: #111827;
        }

        .preview-container h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          line-height: 1.3;
          color: #1f2937;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.5rem;
        }

        .preview-container h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
          color: #374151;
        }

        .preview-container p {
          margin-bottom: 1rem;
        }

        .preview-container ul,
        .preview-container ol {
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }

        .preview-container li {
          margin-bottom: 0.5rem;
        }

        .preview-container blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1rem;
          margin: 1.5rem 0;
          color: #4b5563;
          font-style: italic;
          background: #f9fafb;
          padding: 1rem;
          border-radius: 0 0.5rem 0.5rem 0;
        }

        .preview-container code {
          background-color: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.875rem;
          color: #dc2626;
        }

        .preview-container pre {
          background-color: #1f2937;
          color: #f3f4f6;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
        }

        .preview-container pre code {
          background: none;
          padding: 0;
          color: inherit;
        }

        .preview-container a {
          color: #2563eb;
          text-decoration: none;
        }

        .preview-container a:hover {
          text-decoration: underline;
        }

        .preview-container img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .preview-container hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 2rem 0;
        }

        .preview-container table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }

        .preview-container th,
        .preview-container td {
          border: 1px solid #e5e7eb;
          padding: 0.75rem;
          text-align: left;
        }

        .preview-container th {
          background-color: #f9fafb;
          font-weight: 600;
        }

        .preview-container tr:nth-child(even) {
          background-color: #f9fafb;
        }
      `}</style>
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}
