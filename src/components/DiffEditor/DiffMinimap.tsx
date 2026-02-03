'use client';

import { useMemo } from 'react';
import { DiffLine, ChangeGroup } from './types';

interface DiffMinimapProps {
  diffLines: DiffLine[];
  changeGroups: ChangeGroup[];
  currentChangeIndex: number;
  containerHeight: number;
  totalLines: number;
  scrollPosition: number;
  viewportHeight: number;
  onNavigateToLine: (lineIndex: number) => void;
}

export function DiffMinimap({
  diffLines,
  changeGroups,
  currentChangeIndex,
  containerHeight,
  totalLines,
  scrollPosition,
  viewportHeight,
  onNavigateToLine,
}: DiffMinimapProps) {
  const minimapHeight = Math.min(containerHeight, 300);
  const safeTotal = Math.max(totalLines, 1);
  const lineHeight = minimapHeight / safeTotal;

  // Calculate viewport indicator position and size (with NaN protection)
  const viewportIndicatorTop = Number.isFinite(scrollPosition) && safeTotal > 0
    ? (scrollPosition / safeTotal) * minimapHeight
    : 0;
  const viewportIndicatorHeight = Math.max((viewportHeight / safeTotal) * minimapHeight, 20);

  // Build change markers
  const markers = useMemo(() => {
    return diffLines
      .map((line, index) => {
        if (line.type === 'unchanged') return null;

        const y = index * lineHeight;
        const height = Math.max(lineHeight, 2);

        let color = 'bg-gray-400';
        if (line.type === 'added') color = 'bg-green-500';
        else if (line.type === 'removed') color = 'bg-red-500';
        else if (line.type === 'modified') color = 'bg-amber-500';

        // Check if rejected
        if (line.rejected) {
          color = 'bg-gray-300';
        }

        return { index, y, height, color, type: line.type };
      })
      .filter(Boolean);
  }, [diffLines, lineHeight]);

  // Highlight current change group
  const currentGroupHighlight = useMemo(() => {
    if (currentChangeIndex < 0 || currentChangeIndex >= changeGroups.length) return null;
    
    const group = changeGroups[currentChangeIndex];
    const startY = group.startLine * lineHeight;
    const endY = (group.endLine + 1) * lineHeight;
    
    return {
      top: startY,
      height: endY - startY,
    };
  }, [changeGroups, currentChangeIndex, lineHeight]);

  return (
    <div
      className="relative bg-gray-100 rounded border border-gray-200 cursor-pointer"
      style={{ width: 60, height: minimapHeight }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const lineIndex = Math.floor((clickY / minimapHeight) * totalLines);
        onNavigateToLine(lineIndex);
      }}
    >
      {/* Change markers */}
      {markers.map((marker) => (
        <div
          key={marker!.index}
          className={`absolute left-1 right-1 ${marker!.color} rounded-sm opacity-80`}
          style={{
            top: marker!.y,
            height: Math.max(marker!.height, 2),
          }}
        />
      ))}

      {/* Current change highlight */}
      {currentGroupHighlight && (
        <div
          className="absolute left-0 right-0 border-2 border-blue-500 bg-blue-100/30 rounded pointer-events-none"
          style={{
            top: currentGroupHighlight.top,
            height: currentGroupHighlight.height,
          }}
        />
      )}

      {/* Viewport indicator */}
      <div
        className="absolute left-0 right-0 bg-gray-400/20 border border-gray-400/40 rounded pointer-events-none"
        style={{
          top: Math.max(0, Math.min(viewportIndicatorTop, minimapHeight - viewportIndicatorHeight)) || 0,
          height: viewportIndicatorHeight || 20,
        }}
      />

      {/* Labels */}
      <div className="absolute bottom-1 left-1 right-1 text-[8px] text-gray-500 text-center">
        {diffLines.filter((l) => l.type !== 'unchanged').length} changes
      </div>
    </div>
  );
}
