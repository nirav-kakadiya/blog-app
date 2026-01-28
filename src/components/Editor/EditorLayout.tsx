'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { BlogEditor } from './BlogEditor';
import { Preview } from './Preview';

type ViewMode = 'edit' | 'preview' | 'split';

interface EditorLayoutProps {
  initialContent?: string;
  onSave?: (content: { html: string; markdown: string }) => void;
  placeholder?: string;
}

export function EditorLayout({ initialContent = '', onSave, placeholder }: EditorLayoutProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [content, setContent] = useState({ html: '', markdown: initialContent });
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleContentChange = useCallback((newContent: { html: string; markdown: string }) => {
    setContent(newContent);
  }, []);

  // Sync scroll between editor and preview in split mode
  useEffect(() => {
    if (viewMode !== 'split') return;

    const editorEl = editorRef.current?.querySelector('.ProseMirror');
    const previewEl = previewRef.current;

    if (!editorEl || !previewEl) return;

    let isSyncing = false;

    const syncScroll = (source: Element, target: Element) => {
      if (isSyncing) return;
      isSyncing = true;

      const sourceScrollRatio = source.scrollTop / (source.scrollHeight - source.clientHeight);
      target.scrollTop = sourceScrollRatio * (target.scrollHeight - target.clientHeight);

      requestAnimationFrame(() => {
        isSyncing = false;
      });
    };

    const handleEditorScroll = () => syncScroll(editorEl, previewEl);
    const handlePreviewScroll = () => syncScroll(previewEl, editorEl);

    editorEl.addEventListener('scroll', handleEditorScroll);
    previewEl.addEventListener('scroll', handlePreviewScroll);

    return () => {
      editorEl.removeEventListener('scroll', handleEditorScroll);
      previewEl.removeEventListener('scroll', handlePreviewScroll);
    };
  }, [viewMode]);

  return (
    <div className="flex flex-col h-full">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
          <button
            onClick={() => setViewMode('edit')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'edit'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'split'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Split
            </span>
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'preview'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </span>
          </button>
        </div>

        <div className="text-sm text-gray-500">
          {viewMode === 'edit' && 'Editing mode - write your content'}
          {viewMode === 'split' && 'Split view - edit and preview side by side'}
          {viewMode === 'preview' && 'Preview mode - see how it looks'}
        </div>
      </div>

      {/* Editor / Preview Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'edit' && (
          <div ref={editorRef} className="h-full overflow-auto">
            <BlogEditor
              initialContent={initialContent}
              onChange={handleContentChange}
              onSave={onSave}
              placeholder={placeholder}
            />
          </div>
        )}

        {viewMode === 'preview' && (
          <div ref={previewRef} className="h-full overflow-auto p-6 bg-white">
            <div className="max-w-3xl mx-auto">
              <Preview content={content.markdown || initialContent} isMarkdown={true} />
            </div>
          </div>
        )}

        {viewMode === 'split' && (
          <div className="flex h-full">
            <div ref={editorRef} className="w-1/2 border-r border-gray-200 overflow-auto">
              <BlogEditor
                initialContent={initialContent}
                onChange={handleContentChange}
                onSave={onSave}
                placeholder={placeholder}
              />
            </div>
            <div ref={previewRef} className="w-1/2 overflow-auto p-6 bg-gray-50">
              <div className="max-w-none">
                <Preview content={content.markdown || initialContent} isMarkdown={true} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
