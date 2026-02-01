'use client';

import { useState, useRef, useCallback, useMemo, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface ContentDiffViewProps {
  original: string;
  optimized: string;
}

type DiffLine =
  | { type: 'unchanged'; text: string }
  | { type: 'added'; text: string }
  | { type: 'removed'; text: string }
  | { type: 'modified'; oldText: string; newText: string };

// Word-level diff segment
type WordSegment = { text: string; changed: boolean };

function computeLCS<T>(a: T[], b: T[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

function backtrackDiff<T>(dp: number[][], a: T[], b: T[]): Array<{ type: 'same' | 'removed' | 'added'; value: T }> {
  const result: Array<{ type: 'same' | 'removed' | 'added'; value: T }> = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({ type: 'same', value: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', value: b[j - 1] });
      j--;
    } else {
      result.push({ type: 'removed', value: a[i - 1] });
      i--;
    }
  }

  result.reverse();
  return result;
}

function computeLineDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const dp = computeLCS(oldLines, newLines);
  const raw = backtrackDiff(dp, oldLines, newLines);
  const result: DiffLine[] = [];

  // Build intermediate list
  const intermediate: Array<{ type: 'unchanged' | 'added' | 'removed'; text: string }> = [];
  for (const r of raw) {
    if (r.type === 'same') intermediate.push({ type: 'unchanged', text: r.value });
    else if (r.type === 'removed') intermediate.push({ type: 'removed', text: r.value });
    else intermediate.push({ type: 'added', text: r.value });
  }

  // Merge adjacent removed+added into modified pairs
  for (let k = 0; k < intermediate.length; k++) {
    const curr = intermediate[k];
    const next = intermediate[k + 1];

    if (curr.type === 'removed' && next && next.type === 'added') {
      result.push({ type: 'modified', oldText: curr.text, newText: next.text });
      k++;
    } else {
      result.push(curr as DiffLine);
    }
  }

  return result;
}

// Split a string into words while keeping whitespace/punctuation as separate tokens
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const re = /(\S+|\s+)/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

// Compute word-level diff segments for a modified line
function computeWordDiff(oldText: string, newText: string): { oldSegments: WordSegment[]; newSegments: WordSegment[] } {
  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);
  const dp = computeLCS(oldTokens, newTokens);
  const raw = backtrackDiff(dp, oldTokens, newTokens);

  const oldSegments: WordSegment[] = [];
  const newSegments: WordSegment[] = [];

  // Group consecutive same-type tokens into segments
  let oldChanged = '';
  let oldUnchanged = '';
  let newChanged = '';
  let newUnchanged = '';

  const flushOld = () => {
    if (oldUnchanged) { oldSegments.push({ text: oldUnchanged, changed: false }); oldUnchanged = ''; }
    if (oldChanged) { oldSegments.push({ text: oldChanged, changed: true }); oldChanged = ''; }
  };
  const flushNew = () => {
    if (newUnchanged) { newSegments.push({ text: newUnchanged, changed: false }); newUnchanged = ''; }
    if (newChanged) { newSegments.push({ text: newChanged, changed: true }); newChanged = ''; }
  };

  for (const r of raw) {
    if (r.type === 'same') {
      // Flush changed buffers first
      if (oldChanged) { oldSegments.push({ text: oldChanged, changed: true }); oldChanged = ''; }
      if (newChanged) { newSegments.push({ text: newChanged, changed: true }); newChanged = ''; }
      oldUnchanged += r.value;
      newUnchanged += r.value;
    } else if (r.type === 'removed') {
      // Flush unchanged buffer first
      if (oldUnchanged) { oldSegments.push({ text: oldUnchanged, changed: false }); oldUnchanged = ''; }
      if (newUnchanged) { newSegments.push({ text: newUnchanged, changed: false }); newUnchanged = ''; }
      oldChanged += r.value;
    } else {
      // added
      if (oldUnchanged) { oldSegments.push({ text: oldUnchanged, changed: false }); oldUnchanged = ''; }
      if (newUnchanged) { newSegments.push({ text: newUnchanged, changed: false }); newUnchanged = ''; }
      newChanged += r.value;
    }
  }

  // Final flush
  flushOld();
  flushNew();

  return { oldSegments, newSegments };
}

interface CollapsedSection {
  startIndex: number;
  count: number;
}

function getCollapsedSections(diff: DiffLine[]): CollapsedSection[] {
  const sections: CollapsedSection[] = [];
  let runStart = -1;
  let runLength = 0;

  for (let i = 0; i <= diff.length; i++) {
    if (i < diff.length && diff[i].type === 'unchanged') {
      if (runStart === -1) runStart = i;
      runLength++;
    } else {
      if (runLength > 6) {
        sections.push({
          startIndex: runStart + 2,
          count: runLength - 4,
        });
      }
      runStart = -1;
      runLength = 0;
    }
  }

  return sections;
}

// Render word segments with inline highlights
function renderSegments(segments: WordSegment[], highlightClass: string): ReactNode {
  return segments.map((seg, i) =>
    seg.changed ? (
      <span key={i} className={highlightClass}>{seg.text}</span>
    ) : (
      <span key={i}>{seg.text}</span>
    )
  );
}

export function ContentDiffView({ original, optimized }: ContentDiffViewProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);

  const diff = useMemo(() => {
    const oldLines = original.split('\n');
    const newLines = optimized.split('\n');
    return computeLineDiff(oldLines, newLines);
  }, [original, optimized]);

  // Pre-compute word diffs for modified lines
  const wordDiffs = useMemo(() => {
    const map = new Map<number, { oldSegments: WordSegment[]; newSegments: WordSegment[] }>();
    diff.forEach((line, idx) => {
      if (line.type === 'modified') {
        map.set(idx, computeWordDiff(line.oldText, line.newText));
      }
    });
    return map;
  }, [diff]);

  const collapsedSections = useMemo(() => getCollapsedSections(diff), [diff]);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const toggleSection = (startIndex: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(startIndex)) {
        next.delete(startIndex);
      } else {
        next.add(startIndex);
      }
      return next;
    });
  };

  const handleScroll = useCallback((source: 'left' | 'right') => {
    if (scrollingRef.current) return;
    scrollingRef.current = true;

    const sourceEl = source === 'left' ? leftRef.current : rightRef.current;
    const targetEl = source === 'left' ? rightRef.current : leftRef.current;

    if (sourceEl && targetEl) {
      targetEl.scrollTop = sourceEl.scrollTop;
    }

    requestAnimationFrame(() => {
      scrollingRef.current = false;
    });
  }, []);

  // Build row data
  type Row =
    | { kind: 'line'; diffIdx: number; leftNum: number | null; leftText: string | null; rightNum: number | null; rightText: string | null; lineType: 'unchanged' | 'added' | 'removed' | 'modified' }
    | { kind: 'collapse'; startIndex: number; count: number };

  const rows: Row[] = [];
  let leftLineNum = 0;
  let rightLineNum = 0;

  const isCollapsed = (index: number): CollapsedSection | undefined => {
    return collapsedSections.find(
      (s) => index >= s.startIndex && index < s.startIndex + s.count && !expandedSections.has(s.startIndex)
    );
  };

  let i = 0;
  while (i < diff.length) {
    const section = isCollapsed(i);
    if (section) {
      rows.push({ kind: 'collapse', startIndex: section.startIndex, count: section.count });
      leftLineNum += section.count;
      rightLineNum += section.count;
      i = section.startIndex + section.count;
      continue;
    }

    const line = diff[i];

    if (line.type === 'unchanged') {
      leftLineNum++;
      rightLineNum++;
      rows.push({
        kind: 'line', diffIdx: i,
        leftNum: leftLineNum, leftText: line.text,
        rightNum: rightLineNum, rightText: line.text,
        lineType: 'unchanged',
      });
    } else if (line.type === 'removed') {
      leftLineNum++;
      rows.push({
        kind: 'line', diffIdx: i,
        leftNum: leftLineNum, leftText: line.text,
        rightNum: null, rightText: null,
        lineType: 'removed',
      });
    } else if (line.type === 'added') {
      rightLineNum++;
      rows.push({
        kind: 'line', diffIdx: i,
        leftNum: null, leftText: null,
        rightNum: rightLineNum, rightText: line.text,
        lineType: 'added',
      });
    } else if (line.type === 'modified') {
      leftLineNum++;
      rightLineNum++;
      rows.push({
        kind: 'line', diffIdx: i,
        leftNum: leftLineNum, leftText: line.oldText,
        rightNum: rightLineNum, rightText: line.newText,
        lineType: 'modified',
      });
    }

    i++;
  }

  // Stats
  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let unchanged = 0;
    for (const line of diff) {
      if (line.type === 'added') added++;
      else if (line.type === 'removed') removed++;
      else if (line.type === 'unchanged') unchanged++;
      else if (line.type === 'modified') {
        added++;
        removed++;
      }
    }
    return { added, removed, unchanged };
  }, [diff]);

  const renderLeftContent = (row: Extract<Row, { kind: 'line' }>): ReactNode => {
    if (row.leftText === null) return <span>&nbsp;</span>;
    if (row.leftText === '') return <span>&nbsp;</span>;

    if (row.lineType === 'modified') {
      const wd = wordDiffs.get(row.diffIdx);
      if (wd) return renderSegments(wd.oldSegments, 'diff-word-removed');
    }

    return <span>{row.leftText}</span>;
  };

  const renderRightContent = (row: Extract<Row, { kind: 'line' }>): ReactNode => {
    if (row.rightText === null) return <span>&nbsp;</span>;
    if (row.rightText === '') return <span>&nbsp;</span>;

    if (row.lineType === 'modified') {
      const wd = wordDiffs.get(row.diffIdx);
      if (wd) return renderSegments(wd.newSegments, 'diff-word-added');
    }

    return <span>{row.rightText}</span>;
  };

  return (
    <div>
      <div className="diff-view border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="flex-1 px-3 py-2 text-xs font-semibold text-gray-600 border-r border-gray-200">
            Original
          </div>
          <div className="flex-1 px-3 py-2 text-xs font-semibold text-gray-600">
            Optimized
          </div>
        </div>

        {/* Diff content */}
        <div className="flex max-h-96 overflow-hidden">
          {/* Left pane */}
          <div
            ref={leftRef}
            onScroll={() => handleScroll('left')}
            className="flex-1 overflow-y-auto border-r border-gray-200"
          >
            {rows.map((row, idx) => {
              if (row.kind === 'collapse') {
                return (
                  <button
                    key={`collapse-l-${idx}`}
                    onClick={() => toggleSection(row.startIndex)}
                    className="w-full px-3 py-1 text-xs text-blue-600 bg-blue-50/70 hover:bg-blue-100 transition-colors flex items-center gap-1 border-y border-blue-100"
                  >
                    <ChevronRight className="w-3 h-3" />
                    Show {row.count} unchanged lines
                  </button>
                );
              }

              const bgClass =
                row.lineType === 'removed' || row.lineType === 'modified'
                  ? 'diff-line-removed'
                  : 'diff-line-unchanged';

              const textClass =
                row.lineType === 'removed' || row.lineType === 'modified'
                  ? 'text-gray-900'
                  : 'text-gray-600';

              return (
                <div key={`l-${idx}`} className={`flex min-h-[1.625rem] ${bgClass}`}>
                  <span className="diff-gutter w-10 flex-shrink-0 text-right pr-2 py-0.5 text-xs text-gray-400 select-none">
                    {row.leftNum ?? ''}
                  </span>
                  <span className={`flex-1 px-2 py-0.5 text-xs whitespace-pre-wrap break-words ${textClass}`}>
                    {renderLeftContent(row)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right pane */}
          <div
            ref={rightRef}
            onScroll={() => handleScroll('right')}
            className="flex-1 overflow-y-auto"
          >
            {rows.map((row, idx) => {
              if (row.kind === 'collapse') {
                return (
                  <button
                    key={`collapse-r-${idx}`}
                    onClick={() => toggleSection(row.startIndex)}
                    className="w-full px-3 py-1 text-xs text-blue-600 bg-blue-50/70 hover:bg-blue-100 transition-colors flex items-center gap-1 border-y border-blue-100"
                  >
                    <ChevronRight className="w-3 h-3 opacity-0" />
                    Show {row.count} unchanged lines
                  </button>
                );
              }

              const bgClass =
                row.lineType === 'added' || row.lineType === 'modified'
                  ? 'diff-line-added'
                  : 'diff-line-unchanged';

              const textClass =
                row.lineType === 'added' || row.lineType === 'modified'
                  ? 'text-gray-900'
                  : 'text-gray-600';

              return (
                <div key={`r-${idx}`} className={`flex min-h-[1.625rem] ${bgClass}`}>
                  <span className="diff-gutter w-10 flex-shrink-0 text-right pr-2 py-0.5 text-xs text-gray-400 select-none">
                    {row.rightNum ?? ''}
                  </span>
                  <span className={`flex-1 px-2 py-0.5 text-xs whitespace-pre-wrap break-words ${textClass}`}>
                    {renderRightContent(row)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <span className="text-green-600 font-medium">+{stats.added} added</span>
        <span className="text-red-600 font-medium">-{stats.removed} removed</span>
        <span>{stats.unchanged} unchanged</span>
      </div>
    </div>
  );
}
