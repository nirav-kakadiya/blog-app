'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Toolbar } from './Toolbar';
import {
  getTiptapExtensions,
  editorStyles,
  calculateReadingTime,
  countWords,
  htmlToMarkdown,
  markdownToHtml
} from '@/lib/tiptap-config';

interface BlogEditorProps {
  initialContent?: string;
  onChange?: (content: { html: string; markdown: string }) => void;
  onSave?: (content: { html: string; markdown: string }) => void;
  placeholder?: string;
  autoSaveInterval?: number; // in milliseconds, default 30000 (30s)
  readOnly?: boolean;
}

export function BlogEditor({
  initialContent = '',
  onChange,
  onSave,
  placeholder,
  autoSaveInterval = 30000,
  readOnly = false,
}: BlogEditorProps) {
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const prevInitialContentRef = useRef(initialContent);
  const localStorageKey = 'blog-editor-autosave';

  const editor = useEditor({
    extensions: getTiptapExtensions(placeholder),
    content: initialContent ? markdownToHtml(initialContent) : '',
    editable: !readOnly,
    immediatelyRender: false, // Prevent SSR hydration mismatch
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      const markdown = htmlToMarkdown(html);

      setWordCount(countWords(text));
      setReadingTime(calculateReadingTime(text));

      if (onChange) {
        onChange({ html, markdown });
      }
    },
  });

  // Update editor when initialContent changes externally (e.g. after auto-fix apply)
  useEffect(() => {
    if (!editor) return;
    if (initialContent !== prevInitialContentRef.current) {
      prevInitialContentRef.current = initialContent;
      const newHtml = initialContent ? markdownToHtml(initialContent) : '';
      editor.commands.setContent(newHtml);

      const text = editor.getText();
      setWordCount(countWords(text));
      setReadingTime(calculateReadingTime(text));

      if (onChange) {
        onChange({ html: editor.getHTML(), markdown: initialContent });
      }
    }
  }, [editor, initialContent, onChange]);

  // Load from localStorage on mount
  useEffect(() => {
    if (editor && !initialContent) {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        try {
          const { html, timestamp } = JSON.parse(saved);
          // Only restore if saved within last 24 hours
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            editor.commands.setContent(html);
            setLastSaved(new Date(timestamp));
          }
        } catch (e) {
          console.error('Failed to restore autosave:', e);
        }
      }
    }
  }, [editor, initialContent]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!editor || readOnly) return;

    const saveToLocalStorage = () => {
      const html = editor.getHTML();
      const data = {
        html,
        timestamp: Date.now(),
      };
      localStorage.setItem(localStorageKey, JSON.stringify(data));
      setLastSaved(new Date());
    };

    autoSaveRef.current = setInterval(saveToLocalStorage, autoSaveInterval);

    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
      }
    };
  }, [editor, autoSaveInterval, readOnly]);

  const handleSave = useCallback(async () => {
    if (!editor || !onSave) return;

    setIsSaving(true);
    try {
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      await onSave({ html, markdown });
      setLastSaved(new Date());
      // Clear localStorage after successful save
      localStorage.removeItem(localStorageKey);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editor, onSave]);

  const handleInsertImage = useCallback(() => {
    const url = prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const getMarkdown = useCallback(() => {
    if (!editor) return '';
    return htmlToMarkdown(editor.getHTML());
  }, [editor]);

  const setMarkdown = useCallback((markdown: string) => {
    if (!editor) return;
    editor.commands.setContent(markdownToHtml(markdown));
  }, [editor]);

  // Expose methods via ref pattern - use a safer approach
  useEffect(() => {
    if (editor && typeof editor === 'object') {
      try {
        // Define the methods as non-enumerable to avoid conflicts
        Object.defineProperty(editor, 'getMarkdown', {
          value: getMarkdown,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(editor, 'setMarkdown', {
          value: setMarkdown,
          writable: true,
          configurable: true,
        });
      } catch {
        // Silently fail if properties can't be set
      }
    }
  }, [editor, getMarkdown, setMarkdown]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <style>{editorStyles}</style>

      {!readOnly && <Toolbar editor={editor} onInsertImage={handleInsertImage} />}

      <EditorContent
        editor={editor}
        className="min-h-[400px] max-h-[600px] overflow-y-auto"
      />

      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span>{readingTime} min read</span>
        </div>

        <div className="flex items-center gap-4">
          {lastSaved && (
            <span className="text-gray-400">
              Auto-saved {lastSaved.toLocaleTimeString()}
            </span>
          )}

          {onSave && !readOnly && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
