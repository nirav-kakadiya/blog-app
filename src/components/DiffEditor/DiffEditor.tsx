'use client';

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { DiffEditorProps, DiffLine, ViewMode, ChangeGroup } from './types';
import {
  computeLineDiff,
  calculateStats,
  groupChanges,
  applyDecisions,
  searchInDiff,
  getCollapsibleSections,
} from './diff-utils';
import { DiffToolbar } from './DiffToolbar';
import { DiffStatsBar } from './DiffStatsBar';
import { DiffLineRow } from './DiffLineRow';
import { DiffMinimap } from './DiffMinimap';
import { SplitEditView } from './SplitEditView';
import { ChevronRight } from 'lucide-react';

export function DiffEditor({
  original,
  optimized,
  onContentChange,
  onAccept,
  onReject,
  readOnly = false,
  className = '',
}: DiffEditorProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMinimap, setShowMinimap] = useState(true);
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [editedContent, setEditedContent] = useState(optimized);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [scrollPosition, setScrollPosition] = useState(0);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Compute diff
  useEffect(() => {
    const lines = computeLineDiff(original, optimized);
    setDiffLines(lines);
    setEditedContent(optimized);
    setExpandedSections(new Set());
    setCurrentChangeIndex(0);
  }, [original, optimized]);

  // Computed values
  const stats = useMemo(() => calculateStats(diffLines, original, optimized), [diffLines, original, optimized]);
  const changeGroups = useMemo(() => groupChanges(diffLines), [diffLines]);
  const searchMatches = useMemo(() => searchInDiff(diffLines, searchQuery), [diffLines, searchQuery]);
  const collapsibleSections = useMemo(() => getCollapsibleSections(diffLines), [diffLines]);

  // Count accepted/rejected
  const acceptedCount = useMemo(
    () => diffLines.filter((l) => l.type !== 'unchanged' && l.accepted === true).length,
    [diffLines]
  );
  const rejectedCount = useMemo(
    () => diffLines.filter((l) => l.type !== 'unchanged' && l.rejected === true).length,
    [diffLines]
  );

  // Get current content based on decisions
  const currentContent = useMemo(() => {
    if (viewMode === 'edit') {
      return editedContent;
    }
    return applyDecisions(original, optimized, diffLines);
  }, [viewMode, editedContent, original, optimized, diffLines]);

  // Notify parent of content changes
  useEffect(() => {
    onContentChange?.(currentContent);
  }, [currentContent, onContentChange]);

  // Handlers
  const handleAcceptLine = useCallback((lineId: string) => {
    setDiffLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, accepted: true, rejected: false } : line
      )
    );
  }, []);

  const handleRejectLine = useCallback((lineId: string) => {
    setDiffLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, accepted: false, rejected: true } : line
      )
    );
  }, []);

  const handleResetLine = useCallback((lineId: string) => {
    setDiffLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, accepted: undefined, rejected: undefined } : line
      )
    );
  }, []);

  const handleAcceptAll = useCallback(() => {
    setDiffLines((prev) =>
      prev.map((line) =>
        line.type !== 'unchanged' ? { ...line, accepted: true, rejected: false } : line
      )
    );
  }, []);

  const handleRejectAll = useCallback(() => {
    setDiffLines((prev) =>
      prev.map((line) =>
        line.type !== 'unchanged' ? { ...line, accepted: false, rejected: true } : line
      )
    );
  }, []);

  const handleResetAll = useCallback(() => {
    setDiffLines((prev) =>
      prev.map((line) => ({ ...line, accepted: undefined, rejected: undefined }))
    );
  }, []);

  const navigateToChange = useCallback(
    (index: number) => {
      if (index < 0 || index >= changeGroups.length) return;
      setCurrentChangeIndex(index);

      // Scroll to the change group
      const group = changeGroups[index];
      const lineElement = contentRef.current?.querySelector(`[data-line-id="${group.lines[0].id}"]`);
      lineElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    [changeGroups]
  );

  const handlePrevChange = useCallback(() => {
    navigateToChange(currentChangeIndex - 1);
  }, [currentChangeIndex, navigateToChange]);

  const handleNextChange = useCallback(() => {
    navigateToChange(currentChangeIndex + 1);
  }, [currentChangeIndex, navigateToChange]);

  const handleNavigateToLine = useCallback((lineIndex: number) => {
    const lineElement = contentRef.current?.children[lineIndex];
    lineElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const toggleSection = useCallback((startIndex: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(startIndex)) {
        next.delete(startIndex);
      } else {
        next.add(startIndex);
      }
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when in edit mode or input focused
      if (viewMode === 'edit') return;
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          handlePrevChange();
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          handleNextChange();
          break;
        case 'a':
        case 'A':
          if (changeGroups[currentChangeIndex]) {
            changeGroups[currentChangeIndex].lines.forEach((line) => handleAcceptLine(line.id));
          }
          break;
        case 'r':
        case 'R':
          if (changeGroups[currentChangeIndex]) {
            changeGroups[currentChangeIndex].lines.forEach((line) => handleRejectLine(line.id));
          }
          break;
        case 'z':
        case 'Z':
          if (changeGroups[currentChangeIndex]) {
            changeGroups[currentChangeIndex].lines.forEach((line) => handleResetLine(line.id));
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentChangeIndex, changeGroups, handlePrevChange, handleNextChange, handleAcceptLine, handleRejectLine, handleResetLine]);

  // Handle scroll for minimap
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrollRatio = target.scrollTop / (target.scrollHeight - target.clientHeight);
    setScrollPosition(scrollRatio * diffLines.length);
  }, [diffLines.length]);

  // Build visible rows (with collapsing)
  const visibleRows = useMemo(() => {
    type RowType =
      | { kind: 'line'; line: DiffLine; index: number }
      | { kind: 'collapse'; startIndex: number; count: number };

    const rows: RowType[] = [];
    let i = 0;

    while (i < diffLines.length) {
      // Check if this index is in a collapsed section
      const section = collapsibleSections.find(
        (s) => i >= s.start && i <= s.end && !expandedSections.has(s.start)
      );

      if (section) {
        rows.push({ kind: 'collapse', startIndex: section.start, count: section.count });
        i = section.end + 1;
      } else {
        rows.push({ kind: 'line', line: diffLines[i], index: i });
        i++;
      }
    }

    return rows;
  }, [diffLines, collapsibleSections, expandedSections]);

  // Check if line is in current change group
  const isLineHighlighted = useCallback(
    (lineId: string) => {
      if (currentChangeIndex < 0 || currentChangeIndex >= changeGroups.length) return false;
      return changeGroups[currentChangeIndex].lines.some((l) => l.id === lineId);
    },
    [changeGroups, currentChangeIndex]
  );

  return (
    <div className={`diff-editor flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* Toolbar */}
      <DiffToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchMatchCount={searchMatches.size}
        onPrevChange={handlePrevChange}
        onNextChange={handleNextChange}
        onAcceptAll={handleAcceptAll}
        onRejectAll={handleRejectAll}
        onResetAll={handleResetAll}
        showMinimap={showMinimap}
        onToggleMinimap={() => setShowMinimap(!showMinimap)}
        hasChanges={stats.totalChanges > 0}
        canNavigate={changeGroups.length > 0}
      />

      {/* Stats bar */}
      <DiffStatsBar
        stats={stats}
        changeGroups={changeGroups}
        currentChangeIndex={currentChangeIndex}
        acceptedCount={acceptedCount}
        rejectedCount={rejectedCount}
      />

      {/* Main content area */}
      <div ref={containerRef} className="flex flex-1 min-h-0">
        {/* Diff content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-auto font-mono text-xs"
          onScroll={handleScroll}
          style={{ maxHeight: '500px' }}
        >
          {viewMode === 'edit' ? (
            /* Edit mode: Side-by-side with original reference */
            <SplitEditView
              original={original}
              editedContent={editedContent}
              onContentChange={setEditedContent}
              readOnly={readOnly}
            />
          ) : viewMode === 'split' ? (
            /* Split view */
            <div className="diff-split-view">
              {/* Headers */}
              <div className="diff-split-header">
                <div className="diff-split-header-left">Original</div>
                <div className="diff-split-header-right">Optimized</div>
              </div>

              {/* Content */}
              {visibleRows.map((row, idx) => {
                if (row.kind === 'collapse') {
                  return (
                    <button
                      key={`collapse-${row.startIndex}`}
                      onClick={() => toggleSection(row.startIndex)}
                      className="diff-collapse-row"
                    >
                      <ChevronRight className="w-3 h-3" />
                      <span>Show {row.count} unchanged lines</span>
                    </button>
                  );
                }

                return (
                  <DiffLineRow
                    key={row.line.id}
                    line={row.line}
                    index={row.index}
                    isHighlighted={isLineHighlighted(row.line.id)}
                    isSearchMatch={searchMatches.has(row.line.id)}
                    onAccept={readOnly ? undefined : handleAcceptLine}
                    onReject={readOnly ? undefined : handleRejectLine}
                    onReset={readOnly ? undefined : handleResetLine}
                    showActions={!readOnly}
                    viewMode="split"
                  />
                );
              })}
            </div>
          ) : (
            /* Unified view */
            <div className="diff-unified-view">
              {visibleRows.map((row, idx) => {
                if (row.kind === 'collapse') {
                  return (
                    <button
                      key={`collapse-${row.startIndex}`}
                      onClick={() => toggleSection(row.startIndex)}
                      className="diff-collapse-row-unified"
                    >
                      <ChevronRight className="w-3 h-3" />
                      <span>Show {row.count} unchanged lines</span>
                    </button>
                  );
                }

                return (
                  <DiffLineRow
                    key={row.line.id}
                    line={row.line}
                    index={row.index}
                    isHighlighted={isLineHighlighted(row.line.id)}
                    isSearchMatch={searchMatches.has(row.line.id)}
                    onAccept={readOnly ? undefined : handleAcceptLine}
                    onReject={readOnly ? undefined : handleRejectLine}
                    onReset={readOnly ? undefined : handleResetLine}
                    showActions={!readOnly}
                    viewMode="unified"
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Minimap */}
        {showMinimap && viewMode !== 'edit' && (
          <div className="border-l border-gray-200 p-2 bg-gray-50">
            <DiffMinimap
              diffLines={diffLines}
              changeGroups={changeGroups}
              currentChangeIndex={currentChangeIndex}
              containerHeight={500}
              totalLines={diffLines.length}
              scrollPosition={scrollPosition}
              viewportHeight={30}
              onNavigateToLine={handleNavigateToLine}
            />
          </div>
        )}
      </div>
    </div>
  );
}
