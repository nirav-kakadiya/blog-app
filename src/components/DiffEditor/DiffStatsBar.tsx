'use client';

import { DiffStats, ChangeGroup } from './types';
import { Plus, Minus, RefreshCw, FileText, Type, Hash } from 'lucide-react';

interface DiffStatsBarProps {
  stats: DiffStats;
  changeGroups: ChangeGroup[];
  currentChangeIndex: number;
  acceptedCount: number;
  rejectedCount: number;
}

export function DiffStatsBar({
  stats,
  changeGroups,
  currentChangeIndex,
  acceptedCount,
  rejectedCount,
}: DiffStatsBarProps) {
  const pendingCount = stats.totalChanges - acceptedCount - rejectedCount;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs">
      {/* Left: Change stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-green-600">
          <Plus className="w-3.5 h-3.5" />
          <span className="font-medium">{stats.additions}</span>
          <span className="text-gray-400">added</span>
        </div>
        <div className="flex items-center gap-1.5 text-red-600">
          <Minus className="w-3.5 h-3.5" />
          <span className="font-medium">{stats.deletions}</span>
          <span className="text-gray-400">removed</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-600">
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="font-medium">{stats.modifications}</span>
          <span className="text-gray-400">modified</span>
        </div>
      </div>

      {/* Center: Navigation info */}
      {changeGroups.length > 0 && (
        <div className="flex items-center gap-2 text-gray-500">
          <span>Change</span>
          <span className="font-mono font-medium text-gray-700">
            {currentChangeIndex + 1}/{changeGroups.length}
          </span>
        </div>
      )}

      {/* Right: Word/char diff + decision status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-gray-500">
          <Type className="w-3.5 h-3.5" />
          <span
            className={
              stats.wordCountDiff > 0
                ? 'text-green-600'
                : stats.wordCountDiff < 0
                  ? 'text-red-600'
                  : 'text-gray-500'
            }
          >
            {stats.wordCountDiff > 0 ? '+' : ''}
            {stats.wordCountDiff}
          </span>
          <span className="text-gray-400">words</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500">
          <Hash className="w-3.5 h-3.5" />
          <span
            className={
              stats.characterDiff > 0
                ? 'text-green-600'
                : stats.characterDiff < 0
                  ? 'text-red-600'
                  : 'text-gray-500'
            }
          >
            {stats.characterDiff > 0 ? '+' : ''}
            {stats.characterDiff}
          </span>
          <span className="text-gray-400">chars</span>
        </div>

        {/* Decision progress */}
        {stats.totalChanges > 0 && (
          <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-green-600 font-medium">{acceptedCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-600 font-medium">{rejectedCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <span className="text-gray-500 font-medium">{pendingCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
