'use client';

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';

interface SplitEditViewProps {
  original: string;
  editedContent: string;
  onContentChange: (content: string) => void;
  readOnly?: boolean;
}

export function SplitEditView({
  original,
  editedContent,
  onContentChange,
  readOnly = false,
}: SplitEditViewProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLTextAreaElement>(null);
  const [syncScroll, setSyncScroll] = useState(true);
  const scrollingRef = useRef(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  // Split content into lines for display
  const originalLines = useMemo(() => original.split('\n'), [original]);
  const editedLines = useMemo(() => editedContent.split('\n'), [editedContent]);

  // Sync scrolling between panels
  const handleLeftScroll = useCallback(() => {
    if (!syncScroll || scrollingRef.current || !leftRef.current || !rightRef.current) return;
    scrollingRef.current = true;
    rightRef.current.scrollTop = leftRef.current.scrollTop;
    requestAnimationFrame(() => {
      scrollingRef.current = false;
    });
  }, [syncScroll]);

  const handleRightScroll = useCallback(() => {
    if (!syncScroll || scrollingRef.current || !leftRef.current || !rightRef.current) return;
    scrollingRef.current = true;
    leftRef.current.scrollTop = rightRef.current.scrollTop;
    requestAnimationFrame(() => {
      scrollingRef.current = false;
    });
  }, [syncScroll]);

  // Reset to optimized content
  const handleReset = useCallback(() => {
    // This would reset to the original optimized content
    // For now, we don't have access to that, so this is a placeholder
  }, []);

  // Calculate line number width
  const maxLines = Math.max(originalLines.length, editedLines.length);
  const lineNumWidth = String(maxLines).length * 8 + 16;

  return (
    <div className="split-edit-view h-full flex flex-col">
      {/* Mini toolbar for edit mode */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500">Side-by-Side Edit Mode</span>
          <span className="text-[10px] text-gray-400">
            Original: {originalLines.length} lines • Edited: {editedLines.length} lines
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`p-1.5 rounded text-xs transition-colors ${
              showLineNumbers ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Toggle line numbers"
          >
            {showLineNumbers ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={syncScroll}
              onChange={(e) => setSyncScroll(e.target.checked)}
              className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Sync scroll
          </label>
        </div>
      </div>

      {/* Split panels */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left panel: Original (read-only) */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-gray-50/50">
          <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Original (Reference)
            </span>
          </div>
          <div
            ref={leftRef}
            onScroll={handleLeftScroll}
            className="flex-1 overflow-auto font-mono text-xs"
          >
            <div className="flex min-h-full">
              {/* Line numbers */}
              {showLineNumbers && (
                <div
                  className="flex-shrink-0 bg-gray-100 text-gray-400 text-right select-none border-r border-gray-200"
                  style={{ width: lineNumWidth }}
                >
                  {originalLines.map((_, i) => (
                    <div key={i} className="px-2 py-0.5 leading-5">
                      {i + 1}
                    </div>
                  ))}
                </div>
              )}
              {/* Content */}
              <div className="flex-1 p-2">
                {originalLines.map((line, i) => (
                  <div
                    key={i}
                    className="leading-5 whitespace-pre-wrap break-words text-gray-600 hover:bg-gray-100/50"
                  >
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Resize handle (visual only for now) */}
        <div className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors" />

        {/* Right panel: Editable */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="px-3 py-2 bg-green-50 border-b border-green-200">
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Editing (Your Changes)
            </span>
          </div>
          <div className="flex-1 flex overflow-hidden">
            {/* Line numbers for editor */}
            {showLineNumbers && (
              <div
                className="flex-shrink-0 bg-gray-50 text-gray-400 text-right select-none border-r border-gray-200 overflow-hidden"
                style={{ width: lineNumWidth }}
              >
                <div className="h-full overflow-hidden">
                  {editedLines.map((_, i) => (
                    <div key={i} className="px-2 py-0.5 leading-5 text-xs font-mono">
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Textarea */}
            <textarea
              ref={rightRef}
              value={editedContent}
              onChange={(e) => onContentChange(e.target.value)}
              onScroll={handleRightScroll}
              disabled={readOnly}
              className="flex-1 p-2 font-mono text-xs leading-5 resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 bg-white"
              placeholder="Edit the content here..."
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-500">
        <div className="flex items-center gap-4">
          <span>
            Lines: <span className="font-medium text-gray-700">{editedLines.length}</span>
          </span>
          <span>
            Characters: <span className="font-medium text-gray-700">{editedContent.length}</span>
          </span>
          <span>
            Words: <span className="font-medium text-gray-700">{editedContent.split(/\s+/).filter(Boolean).length}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {editedContent !== original && (
            <span className="text-amber-600 font-medium">Modified</span>
          )}
        </div>
      </div>
    </div>
  );
}
