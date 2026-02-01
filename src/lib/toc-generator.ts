export interface TOCItem {
  id: string;
  text: string;
  level: 2 | 3;
  anchor: string;
}

export function generateTOC(markdown: string): TOCItem[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const items: TOCItem[] = [];
  const anchors: Map<string, number> = new Map();

  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length as 2 | 3;
    const text = match[2].trim();

    // Generate anchor
    let baseAnchor = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Handle duplicate anchors
    const count = anchors.get(baseAnchor) || 0;
    anchors.set(baseAnchor, count + 1);
    const anchor = count > 0 ? `${baseAnchor}-${count}` : baseAnchor;

    items.push({
      id: `toc-${items.length}`,
      text,
      level,
      anchor,
    });
  }

  return items;
}

export function generateTOCMarkdown(markdown: string, options?: { maxDepth?: 2 | 3 }): string {
  const maxDepth = options?.maxDepth || 3;
  const items = generateTOC(markdown).filter((item) => item.level <= maxDepth);

  if (items.length === 0) {
    return '';
  }

  const lines = items.map((item) => {
    const indent = item.level === 3 ? '  ' : '';
    return `${indent}- [${item.text}](#${item.anchor})`;
  });

  return '## Table of Contents\n\n' + lines.join('\n');
}

export function insertTOC(markdown: string, afterSection?: string): string {
  // First, strip any existing TOC sections the LLM may have generated
  // This prevents duplicate TOCs
  const cleaned = removeExistingTOC(markdown);

  const toc = generateTOCMarkdown(cleaned);

  if (!toc) {
    return cleaned;
  }

  if (afterSection) {
    // Insert after specific section
    const sectionRegex = new RegExp(`(## ${afterSection}[\\s\\S]*?)(\n## )`, 'i');
    const match = cleaned.match(sectionRegex);

    if (match) {
      return cleaned.replace(sectionRegex, `$1\n\n${toc}\n\n$2`);
    }
  }

  // Insert after first paragraph (after intro)
  const firstParagraphEnd = cleaned.indexOf('\n\n## ');
  if (firstParagraphEnd !== -1) {
    return (
      cleaned.slice(0, firstParagraphEnd) +
      '\n\n' +
      toc +
      '\n' +
      cleaned.slice(firstParagraphEnd)
    );
  }

  // Fallback: insert at beginning
  return toc + '\n\n' + cleaned;
}

/**
 * Remove any existing Table of Contents sections from markdown
 * Handles LLM-generated TOCs that would duplicate with our generated one
 */
function removeExistingTOC(markdown: string): string {
  // Match "## Table of Contents" followed by a list of links, until next H2 or end
  // This pattern matches the TOC header + all lines that are TOC links (- [...] or  - [...])
  const tocPattern = /\n*## Table of Contents\n+((?:\s*-\s+\[.*?\]\(#.*?\)\n*)*)/gi;

  let result = markdown;
  let matchFound = true;

  // Remove all occurrences (there might be multiple)
  while (matchFound) {
    const newResult = result.replace(tocPattern, '\n');
    matchFound = newResult !== result;
    result = newResult;
  }

  // Clean up excessive blank lines left after removal
  result = result.replace(/\n{4,}/g, '\n\n\n');

  return result;
}

export function addAnchorsToHeadings(markdown: string): string {
  const items = generateTOC(markdown);
  let result = markdown;
  let offset = 0;

  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  let itemIndex = 0;

  result = markdown.replace(headingRegex, (match, hashes, text) => {
    if (itemIndex < items.length) {
      const item = items[itemIndex];
      itemIndex++;
      return `${hashes} ${text} {#${item.anchor}}`;
    }
    return match;
  });

  return result;
}
