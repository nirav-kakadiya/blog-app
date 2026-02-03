// Types for the professional diff editor

export type DiffLineType = 'unchanged' | 'added' | 'removed' | 'modified';

export interface DiffLine {
  id: string;
  type: DiffLineType;
  lineNumber: { left: number | null; right: number | null };
  content: {
    left: string | null;
    right: string | null;
  };
  accepted?: boolean; // For per-change accept/reject
  rejected?: boolean;
}

export interface WordSegment {
  text: string;
  changed: boolean;
}

export interface WordDiff {
  leftSegments: WordSegment[];
  rightSegments: WordSegment[];
}

export interface DiffStats {
  totalChanges: number;
  additions: number;
  deletions: number;
  modifications: number;
  unchanged: number;
  wordCountDiff: number;
  characterDiff: number;
}

export interface ChangeGroup {
  id: string;
  startLine: number;
  endLine: number;
  type: 'addition' | 'deletion' | 'modification';
  lines: DiffLine[];
}

export type ViewMode = 'split' | 'unified' | 'edit';

export interface EditorState {
  viewMode: ViewMode;
  currentChangeIndex: number;
  searchQuery: string;
  filterType: DiffLineType | 'all';
  showMinimap: boolean;
  editedContent: string;
  history: string[];
  historyIndex: number;
}

export interface DiffEditorProps {
  original: string;
  optimized: string;
  onContentChange?: (content: string) => void;
  onAccept?: (content: string) => void;
  onReject?: () => void;
  readOnly?: boolean;
  className?: string;
}
