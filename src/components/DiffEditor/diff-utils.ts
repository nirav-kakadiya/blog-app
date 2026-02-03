import { DiffLine, DiffStats, ChangeGroup, WordDiff, WordSegment } from './types';

// Compute LCS (Longest Common Subsequence) for diff algorithm
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

// Backtrack to get diff operations
function backtrackDiff<T>(
  dp: number[][],
  a: T[],
  b: T[]
): Array<{ type: 'same' | 'removed' | 'added'; value: T }> {
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

// Tokenize text for word-level diff
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const re = /(\S+|\s+)/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

// Compute word-level diff for modified lines
export function computeWordDiff(oldText: string, newText: string): WordDiff {
  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);
  const dp = computeLCS(oldTokens, newTokens);
  const raw = backtrackDiff(dp, oldTokens, newTokens);

  const leftSegments: WordSegment[] = [];
  const rightSegments: WordSegment[] = [];

  let leftChanged = '';
  let leftUnchanged = '';
  let rightChanged = '';
  let rightUnchanged = '';

  const flushLeft = () => {
    if (leftUnchanged) {
      leftSegments.push({ text: leftUnchanged, changed: false });
      leftUnchanged = '';
    }
    if (leftChanged) {
      leftSegments.push({ text: leftChanged, changed: true });
      leftChanged = '';
    }
  };

  const flushRight = () => {
    if (rightUnchanged) {
      rightSegments.push({ text: rightUnchanged, changed: false });
      rightUnchanged = '';
    }
    if (rightChanged) {
      rightSegments.push({ text: rightChanged, changed: true });
      rightChanged = '';
    }
  };

  for (const r of raw) {
    if (r.type === 'same') {
      if (leftChanged) {
        leftSegments.push({ text: leftChanged, changed: true });
        leftChanged = '';
      }
      if (rightChanged) {
        rightSegments.push({ text: rightChanged, changed: true });
        rightChanged = '';
      }
      leftUnchanged += r.value;
      rightUnchanged += r.value;
    } else if (r.type === 'removed') {
      if (leftUnchanged) {
        leftSegments.push({ text: leftUnchanged, changed: false });
        leftUnchanged = '';
      }
      if (rightUnchanged) {
        rightSegments.push({ text: rightUnchanged, changed: false });
        rightUnchanged = '';
      }
      leftChanged += r.value;
    } else {
      if (leftUnchanged) {
        leftSegments.push({ text: leftUnchanged, changed: false });
        leftUnchanged = '';
      }
      if (rightUnchanged) {
        rightSegments.push({ text: rightUnchanged, changed: false });
        rightUnchanged = '';
      }
      rightChanged += r.value;
    }
  }

  flushLeft();
  flushRight();

  return { leftSegments, rightSegments };
}

// Compute line-level diff
export function computeLineDiff(original: string, optimized: string): DiffLine[] {
  const oldLines = original.split('\n');
  const newLines = optimized.split('\n');
  const dp = computeLCS(oldLines, newLines);
  const raw = backtrackDiff(dp, oldLines, newLines);

  // Build intermediate list
  const intermediate: Array<{ type: 'unchanged' | 'added' | 'removed'; text: string }> = [];
  for (const r of raw) {
    if (r.type === 'same') intermediate.push({ type: 'unchanged', text: r.value });
    else if (r.type === 'removed') intermediate.push({ type: 'removed', text: r.value });
    else intermediate.push({ type: 'added', text: r.value });
  }

  // Build diff lines with proper line numbers
  const diffLines: DiffLine[] = [];
  let leftNum = 0;
  let rightNum = 0;
  let lineId = 0;

  for (let k = 0; k < intermediate.length; k++) {
    const curr = intermediate[k];
    const next = intermediate[k + 1];

    // Merge adjacent removed+added into modified
    if (curr.type === 'removed' && next && next.type === 'added') {
      leftNum++;
      rightNum++;
      diffLines.push({
        id: `line-${lineId++}`,
        type: 'modified',
        lineNumber: { left: leftNum, right: rightNum },
        content: { left: curr.text, right: next.text },
      });
      k++; // Skip next
    } else if (curr.type === 'unchanged') {
      leftNum++;
      rightNum++;
      diffLines.push({
        id: `line-${lineId++}`,
        type: 'unchanged',
        lineNumber: { left: leftNum, right: rightNum },
        content: { left: curr.text, right: curr.text },
      });
    } else if (curr.type === 'removed') {
      leftNum++;
      diffLines.push({
        id: `line-${lineId++}`,
        type: 'removed',
        lineNumber: { left: leftNum, right: null },
        content: { left: curr.text, right: null },
      });
    } else if (curr.type === 'added') {
      rightNum++;
      diffLines.push({
        id: `line-${lineId++}`,
        type: 'added',
        lineNumber: { left: null, right: rightNum },
        content: { left: null, right: curr.text },
      });
    }
  }

  return diffLines;
}

// Calculate diff statistics
export function calculateStats(diffLines: DiffLine[], original: string, optimized: string): DiffStats {
  let additions = 0;
  let deletions = 0;
  let modifications = 0;
  let unchanged = 0;

  for (const line of diffLines) {
    switch (line.type) {
      case 'added':
        additions++;
        break;
      case 'removed':
        deletions++;
        break;
      case 'modified':
        modifications++;
        break;
      case 'unchanged':
        unchanged++;
        break;
    }
  }

  const originalWords = original.split(/\s+/).filter(Boolean).length;
  const optimizedWords = optimized.split(/\s+/).filter(Boolean).length;

  return {
    totalChanges: additions + deletions + modifications,
    additions,
    deletions,
    modifications,
    unchanged,
    wordCountDiff: optimizedWords - originalWords,
    characterDiff: optimized.length - original.length,
  };
}

// Group consecutive changes
export function groupChanges(diffLines: DiffLine[]): ChangeGroup[] {
  const groups: ChangeGroup[] = [];
  let currentGroup: DiffLine[] = [];
  let groupStart = 0;
  let groupId = 0;

  const flushGroup = (endLine: number) => {
    if (currentGroup.length > 0) {
      const hasAdditions = currentGroup.some((l) => l.type === 'added');
      const hasDeletions = currentGroup.some((l) => l.type === 'removed');
      const hasModifications = currentGroup.some((l) => l.type === 'modified');

      let type: ChangeGroup['type'] = 'modification';
      if (hasModifications || (hasAdditions && hasDeletions)) {
        type = 'modification';
      } else if (hasAdditions) {
        type = 'addition';
      } else if (hasDeletions) {
        type = 'deletion';
      }

      groups.push({
        id: `group-${groupId++}`,
        startLine: groupStart,
        endLine,
        type,
        lines: [...currentGroup],
      });
      currentGroup = [];
    }
  };

  for (let i = 0; i < diffLines.length; i++) {
    const line = diffLines[i];

    if (line.type === 'unchanged') {
      flushGroup(i - 1);
      groupStart = i + 1;
    } else {
      if (currentGroup.length === 0) {
        groupStart = i;
      }
      currentGroup.push(line);
    }
  }

  flushGroup(diffLines.length - 1);

  return groups;
}

// Apply per-line accept/reject decisions to produce final content
export function applyDecisions(
  original: string,
  optimized: string,
  diffLines: DiffLine[]
): string {
  const resultLines: string[] = [];

  for (const line of diffLines) {
    const isAccepted = line.accepted !== false; // Default to accepted
    const isRejected = line.rejected === true;

    switch (line.type) {
      case 'unchanged':
        resultLines.push(line.content.left!);
        break;
      case 'added':
        if (!isRejected) {
          resultLines.push(line.content.right!);
        }
        break;
      case 'removed':
        if (isRejected) {
          resultLines.push(line.content.left!);
        }
        break;
      case 'modified':
        if (isRejected) {
          resultLines.push(line.content.left!);
        } else {
          resultLines.push(line.content.right!);
        }
        break;
    }
  }

  return resultLines.join('\n');
}

// Find changes containing search query
export function searchInDiff(diffLines: DiffLine[], query: string): Set<string> {
  if (!query.trim()) return new Set();

  const matches = new Set<string>();
  const lowerQuery = query.toLowerCase();

  for (const line of diffLines) {
    const leftMatch = line.content.left?.toLowerCase().includes(lowerQuery);
    const rightMatch = line.content.right?.toLowerCase().includes(lowerQuery);

    if (leftMatch || rightMatch) {
      matches.add(line.id);
    }
  }

  return matches;
}

// Get collapsible sections (long unchanged regions)
export function getCollapsibleSections(
  diffLines: DiffLine[],
  contextLines: number = 3
): Array<{ start: number; end: number; count: number }> {
  const sections: Array<{ start: number; end: number; count: number }> = [];
  let runStart = -1;
  let runLength = 0;

  for (let i = 0; i <= diffLines.length; i++) {
    if (i < diffLines.length && diffLines[i].type === 'unchanged') {
      if (runStart === -1) runStart = i;
      runLength++;
    } else {
      // Need at least contextLines * 2 + 1 unchanged lines to collapse
      if (runLength > contextLines * 2 + 1) {
        sections.push({
          start: runStart + contextLines,
          end: runStart + runLength - contextLines - 1,
          count: runLength - contextLines * 2,
        });
      }
      runStart = -1;
      runLength = 0;
    }
  }

  return sections;
}
