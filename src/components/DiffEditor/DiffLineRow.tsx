'use client';

import { useMemo, memo } from 'react';
import { DiffLine, WordSegment } from './types';
import { computeWordDiff } from './diff-utils';
import { Check, X, RotateCcw } from 'lucide-react';

interface DiffLineRowProps {
  line: DiffLine;
  index: number;
  isHighlighted: boolean;
  isSearchMatch: boolean;
  onAccept?: (lineId: string) => void;
  onReject?: (lineId: string) => void;
  onReset?: (lineId: string) => void;
  showActions?: boolean;
  viewMode: 'split' | 'unified';
}

// Render word segments with highlighting
function renderSegments(segments: WordSegment[], highlightClass: string) {
  return segments.map((seg, i) =>
    seg.changed ? (
      <span key={i} className={highlightClass}>
        {seg.text}
      </span>
    ) : (
      <span key={i}>{seg.text}</span>
    )
  );
}

export const DiffLineRow = memo(function DiffLineRow({
  line,
  index,
  isHighlighted,
  isSearchMatch,
  onAccept,
  onReject,
  onReset,
  showActions = true,
  viewMode,
}: DiffLineRowProps) {
  // Compute word diff for modified lines
  const wordDiff = useMemo(() => {
    if (line.type === 'modified' && line.content.left && line.content.right) {
      return computeWordDiff(line.content.left, line.content.right);
    }
    return null;
  }, [line]);

  const hasDecision = line.accepted !== undefined || line.rejected !== undefined;
  const isRejected = line.rejected === true;
  const showRejectedStyle = isRejected && line.type !== 'unchanged';

  // Split view row
  if (viewMode === 'split') {
    return (
      <div
        className={`diff-row group ${isHighlighted ? 'ring-2 ring-blue-400 ring-inset' : ''} ${
          isSearchMatch ? 'bg-yellow-50' : ''
        } ${showRejectedStyle ? 'opacity-50' : ''}`}
        data-line-id={line.id}
      >
        {/* Left side (original) */}
        <div
          className={`diff-cell-left ${
            line.type === 'removed'
              ? 'bg-red-50'
              : line.type === 'modified'
                ? 'bg-red-50/50'
                : 'bg-white'
          }`}
        >
          <span className="diff-line-number">{line.lineNumber.left ?? ''}</span>
          <span
            className={`diff-line-content ${
              line.type === 'removed' || line.type === 'modified' ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            {line.content.left !== null ? (
              line.type === 'modified' && wordDiff ? (
                renderSegments(wordDiff.leftSegments, 'diff-word-removed')
              ) : (
                <span>{line.content.left || '\u00A0'}</span>
              )
            ) : (
              <span className="text-gray-300">&nbsp;</span>
            )}
          </span>
        </div>

        {/* Actions column (center) */}
        {showActions && line.type !== 'unchanged' && (
          <div className="diff-actions">
            {!hasDecision ? (
              <>
                <button
                  onClick={() => onAccept?.(line.id)}
                  className="diff-action-btn diff-action-accept"
                  title="Accept this change"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onReject?.(line.id)}
                  className="diff-action-btn diff-action-reject"
                  title="Reject this change"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <button
                onClick={() => onReset?.(line.id)}
                className="diff-action-btn diff-action-reset"
                title="Reset decision"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Right side (optimized) */}
        <div
          className={`diff-cell-right ${
            line.type === 'added'
              ? 'bg-green-50'
              : line.type === 'modified'
                ? 'bg-green-50/50'
                : 'bg-white'
          }`}
        >
          <span className="diff-line-number">{line.lineNumber.right ?? ''}</span>
          <span
            className={`diff-line-content ${
              line.type === 'added' || line.type === 'modified' ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            {line.content.right !== null ? (
              line.type === 'modified' && wordDiff ? (
                renderSegments(wordDiff.rightSegments, 'diff-word-added')
              ) : (
                <span>{line.content.right || '\u00A0'}</span>
              )
            ) : (
              <span className="text-gray-300">&nbsp;</span>
            )}
          </span>
        </div>

        {/* Decision indicator */}
        {hasDecision && (
          <div
            className={`absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
              isRejected ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {isRejected ? 'Rejected' : 'Accepted'}
          </div>
        )}
      </div>
    );
  }

  // Unified view row
  return (
    <div
      className={`diff-unified-row group ${isHighlighted ? 'ring-2 ring-blue-400 ring-inset' : ''} ${
        isSearchMatch ? 'bg-yellow-50' : ''
      } ${showRejectedStyle ? 'opacity-50' : ''}`}
      data-line-id={line.id}
    >
      <span className="diff-line-number w-8">{line.lineNumber.left ?? ''}</span>
      <span className="diff-line-number w-8">{line.lineNumber.right ?? ''}</span>
      <span
        className={`diff-unified-marker ${
          line.type === 'added'
            ? 'text-green-600'
            : line.type === 'removed'
              ? 'text-red-600'
              : line.type === 'modified'
                ? 'text-amber-600'
                : 'text-gray-300'
        }`}
      >
        {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : line.type === 'modified' ? '~' : ' '}
      </span>
      <span
        className={`diff-unified-content flex-1 ${
          line.type === 'added'
            ? 'bg-green-50 text-gray-900'
            : line.type === 'removed'
              ? 'bg-red-50 text-gray-900'
              : line.type === 'modified'
                ? 'bg-amber-50 text-gray-900'
                : 'text-gray-500'
        }`}
      >
        {line.type === 'modified' ? (
          <div className="space-y-0.5">
            <div className="bg-red-50/50 px-1 -mx-1 rounded">
              {wordDiff ? renderSegments(wordDiff.leftSegments, 'diff-word-removed') : line.content.left}
            </div>
            <div className="bg-green-50/50 px-1 -mx-1 rounded">
              {wordDiff ? renderSegments(wordDiff.rightSegments, 'diff-word-added') : line.content.right}
            </div>
          </div>
        ) : (
          <span>{line.content.left ?? line.content.right ?? '\u00A0'}</span>
        )}
      </span>

      {/* Unified view actions */}
      {showActions && line.type !== 'unchanged' && (
        <div className="diff-unified-actions">
          {!hasDecision ? (
            <>
              <button
                onClick={() => onAccept?.(line.id)}
                className="diff-action-btn-sm diff-action-accept"
                title="Accept"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => onReject?.(line.id)}
                className="diff-action-btn-sm diff-action-reject"
                title="Reject"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <button
              onClick={() => onReset?.(line.id)}
              className="diff-action-btn-sm diff-action-reset"
              title="Reset"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
});
