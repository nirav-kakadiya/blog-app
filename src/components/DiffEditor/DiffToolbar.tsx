'use client';

import { ViewMode } from './types';
import {
  Columns2,
  List,
  Edit3,
  Search,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  RotateCcw,
  Map,
  Keyboard,
} from 'lucide-react';

interface DiffToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchMatchCount: number;
  onPrevChange: () => void;
  onNextChange: () => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onResetAll: () => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
  hasChanges: boolean;
  canNavigate: boolean;
}

export function DiffToolbar({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  searchMatchCount,
  onPrevChange,
  onNextChange,
  onAcceptAll,
  onRejectAll,
  onResetAll,
  showMinimap,
  onToggleMinimap,
  hasChanges,
  canNavigate,
}: DiffToolbarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200">
      {/* Left: View mode toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => onViewModeChange('split')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'split'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          title="Side-by-side view"
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span>Split</span>
        </button>
        <button
          onClick={() => onViewModeChange('unified')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'unified'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          title="Unified view"
        >
          <List className="w-3.5 h-3.5" />
          <span>Unified</span>
        </button>
        <button
          onClick={() => onViewModeChange('edit')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'edit'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          title="Edit mode"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>
      </div>

      {/* Center: Search */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search in changes..."
            className="w-48 pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && searchMatchCount > 0 && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
              {searchMatchCount} found
            </span>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-0.5 border-l border-gray-200 pl-2 ml-1">
          <button
            onClick={onPrevChange}
            disabled={!canNavigate}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous change (↑)"
          >
            <ChevronUp className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={onNextChange}
            disabled={!canNavigate}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next change (↓)"
          >
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Right: Bulk actions + Minimap toggle */}
      <div className="flex items-center gap-2">
        {hasChanges && viewMode !== 'edit' && (
          <>
            <button
              onClick={onAcceptAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              title="Accept all changes"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept All</span>
            </button>
            <button
              onClick={onRejectAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              title="Reject all changes"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject All</span>
            </button>
            <button
              onClick={onResetAll}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Reset all decisions"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </>
        )}

        <div className="border-l border-gray-200 pl-2 ml-1 flex items-center gap-1">
          <button
            onClick={onToggleMinimap}
            className={`p-1.5 rounded-lg transition-colors ${
              showMinimap ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Toggle minimap"
          >
            <Map className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            title="Keyboard shortcuts: ↑↓ navigate, A accept, R reject, Z reset"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
