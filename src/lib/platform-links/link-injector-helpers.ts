/**
 * Helper functions for link injection - shared across injectors
 */

export function isUnsafeLine(line: string): boolean {
  const trimmed = line.trim();

  // Code blocks
  if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) return true;
  // Headings
  if (/^#{1,6}\s/.test(trimmed)) return true;
  // Table rows
  if (trimmed.startsWith('|') && trimmed.endsWith('|')) return true;
  // Table separator
  if (/^\|[\s:|-]+\|$/.test(trimmed)) return true;
  // Images
  if (trimmed.startsWith('![')) return true;
  // HTML blocks
  if (/^<\/?[a-z]/i.test(trimmed)) return true;
  // Blockquotes
  if (trimmed.startsWith('>')) return true;
  // Empty lines
  if (!trimmed) return true;

  return false;
}

export function countWordsInLine(line: string): number {
  return line.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Check if a position in a string is inside an existing markdown link
 */
export function isInsideMarkdownLink(text: string, position: number): boolean {
  const before = text.slice(0, position);
  const openBrackets = (before.match(/\[/g) || []).length;
  const closeBrackets = (before.match(/\]/g) || []).length;
  return openBrackets !== closeBrackets;
}
