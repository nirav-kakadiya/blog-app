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

/**
 * Check if a position is inside a URL (http:// or https://).
 * This prevents injecting links into URL paths.
 */
export function isInsideUrl(text: string, position: number): boolean {
  // Find all URLs in the text
  const urlRegex = /https?:\/\/[^\s\)\]"'>]+/gi;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    const urlStart = match.index;
    const urlEnd = urlStart + match[0].length;
    // Check if position is within this URL
    if (position >= urlStart && position < urlEnd) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a position is inside the URL portion of a markdown link ](url)
 */
export function isInsideLinkUrl(text: string, position: number): boolean {
  // Find all markdown link URL portions: ](url)
  const linkUrlRegex = /\]\([^)]+\)/g;
  let match;
  while ((match = linkUrlRegex.exec(text)) !== null) {
    const urlStart = match.index;
    const urlEnd = urlStart + match[0].length;
    // Check if position is within this link URL portion
    if (position >= urlStart && position < urlEnd) {
      return true;
    }
  }
  return false;
}

/**
 * Comprehensive check if a position should NOT have a link injected.
 * Returns true if the position is unsafe for link injection.
 */
export function isUnsafePosition(text: string, position: number): boolean {
  return (
    isInsideMarkdownLink(text, position) ||
    isInsideUrl(text, position) ||
    isInsideLinkUrl(text, position)
  );
}
