/**
 * Image Inserter - Places generated images into markdown content
 * at the correct positions based on their placement type
 */

interface PlacedImage {
  url: string;
  altText: string;
  placement: string;
  sectionId?: string;
}

/**
 * Insert images into markdown content at appropriate positions
 */
export function insertImagesIntoMarkdown(
  content: string,
  images: PlacedImage[]
): string {
  if (!content || images.length === 0) return content;

  const lines = content.split('\n');
  const insertions: { lineIndex: number; markdown: string }[] = [];

  for (const image of images) {
    const imgMarkdown = `\n![${image.altText}](${image.url})\n`;

    switch (image.placement) {
      case 'hero': {
        // Insert after the first H1 title
        const h1Index = lines.findIndex((line) => /^#\s+/.test(line));
        if (h1Index !== -1) {
          insertions.push({ lineIndex: h1Index + 1, markdown: imgMarkdown });
        } else {
          // No H1 found, insert at very top
          insertions.push({ lineIndex: 0, markdown: imgMarkdown });
        }
        break;
      }

      case 'after_intro': {
        // Insert after the first paragraph (after H1 + first text block)
        const introEnd = findEndOfIntro(lines);
        insertions.push({ lineIndex: introEnd, markdown: imgMarkdown });
        break;
      }

      case 'in_section': {
        // Insert after a matching section header or a mid-content H2
        const sectionIndex = findSectionIndex(lines, image.sectionId);
        insertions.push({ lineIndex: sectionIndex, markdown: imgMarkdown });
        break;
      }

      case 'before_cta': {
        // Insert before the last section (Conclusion or CTA)
        const ctaIndex = findBeforeCTA(lines);
        insertions.push({ lineIndex: ctaIndex, markdown: imgMarkdown });
        break;
      }

      default: {
        // Default: insert at a reasonable mid-point
        const midPoint = Math.floor(lines.length * 0.5);
        insertions.push({ lineIndex: midPoint, markdown: imgMarkdown });
      }
    }
  }

  // Sort insertions by line index descending so earlier insertions don't shift later ones
  insertions.sort((a, b) => b.lineIndex - a.lineIndex);

  const result = [...lines];
  for (const insertion of insertions) {
    const safeIndex = Math.min(insertion.lineIndex, result.length);
    result.splice(safeIndex, 0, insertion.markdown);
  }

  return result.join('\n');
}

/**
 * Find the end of the intro section (after H1 + first paragraph)
 */
function findEndOfIntro(lines: string[]): number {
  let foundH1 = false;
  let foundParagraph = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (/^#\s+/.test(line)) {
      foundH1 = true;
      continue;
    }

    if (foundH1 && line.length > 0 && !line.startsWith('#')) {
      foundParagraph = true;
      continue;
    }

    // End of intro: found empty line after first paragraph
    if (foundH1 && foundParagraph && line.length === 0) {
      return i;
    }

    // Hit the next header - insert before it
    if (foundH1 && foundParagraph && /^#{2,}\s+/.test(line)) {
      return i;
    }
  }

  // Fallback: after first 10 lines or end
  return Math.min(10, lines.length);
}

/**
 * Find the index to insert an in-section image
 */
function findSectionIndex(lines: string[], sectionId?: string): number {
  // Try to find a matching H2 by section name
  if (sectionId) {
    const sectionLower = sectionId.toLowerCase();
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^##\s+(.+)/);
      if (match && match[1].toLowerCase().includes(sectionLower)) {
        // Find end of the first paragraph after this H2
        return findNextParagraphEnd(lines, i + 1);
      }
    }
  }

  // Fallback: find a mid-content H2 (not the first or last)
  const h2Indices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      h2Indices.push(i);
    }
  }

  if (h2Indices.length >= 3) {
    // Pick a section around the middle
    const midH2 = h2Indices[Math.floor(h2Indices.length / 2)];
    return findNextParagraphEnd(lines, midH2 + 1);
  }

  // Fallback: 60% through the content
  return Math.floor(lines.length * 0.6);
}

/**
 * Find the line before the CTA/Conclusion section
 */
function findBeforeCTA(lines: string[]): number {
  const ctaHeaders = ['conclusion', 'try it now', 'get started', 'start using', 'try', 'final verdict', 'download'];

  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(/^##\s+(.+)/);
    if (match) {
      const headerLower = match[1].toLowerCase();
      if (ctaHeaders.some((cta) => headerLower.includes(cta))) {
        return i;
      }
    }
  }

  // Fallback: 5 lines before the end
  return Math.max(0, lines.length - 5);
}

/**
 * Find the end of the next paragraph after a given line
 */
function findNextParagraphEnd(lines: string[], startIndex: number): number {
  let foundText = false;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.length > 0 && !line.startsWith('#')) {
      foundText = true;
      continue;
    }

    if (foundText && (line.length === 0 || line.startsWith('#'))) {
      return i;
    }
  }

  return Math.min(startIndex + 3, lines.length);
}
