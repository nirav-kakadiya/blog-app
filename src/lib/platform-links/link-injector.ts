import { LinkMatch } from './link-matcher';

interface InjectionConfig {
  maxInjections?: number;
  minWordGap?: number;
}

interface InjectionResult {
  content: string;
  injectedCount: number;
  existingCount: number;
}

/**
 * Post-generation markdown link injection.
 * Finds first occurrence of matched keywords in body paragraphs and links them.
 * Safety: skips code blocks, existing links, headings, table rows, images.
 */
export function injectPlatformLinks(
  content: string,
  matches: LinkMatch[],
  config: InjectionConfig = {}
): InjectionResult {
  const { maxInjections = 5, minWordGap = 120 } = config;

  if (!matches.length || !content) {
    return { content, injectedCount: 0, existingCount: 0 };
  }

  // Count existing platform links
  const existingUrls = new Set<string>();
  const existingLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let linkMatch;
  while ((linkMatch = existingLinkRegex.exec(content)) !== null) {
    existingUrls.add(linkMatch[2]);
  }

  const existingCount = matches.filter(m => existingUrls.has(m.fullUrl)).length;

  // Filter out matches that already have links in the content
  const newMatches = matches.filter(m => !existingUrls.has(m.fullUrl));
  if (!newMatches.length) {
    return { content, injectedCount: 0, existingCount };
  }

  // Split content into safe/unsafe zones
  const lines = content.split('\n');
  let injectedCount = 0;
  let lastInjectionWordIndex = -minWordGap; // Allow first injection immediately
  let wordCounter = 0;
  const usedUrls = new Set<string>();

  const processedLines = lines.map(line => {
    if (injectedCount >= maxInjections) return line;

    // Skip unsafe zones
    if (isUnsafeLine(line)) {
      wordCounter += countWordsInLine(line);
      return line;
    }

    const lineWords = countWordsInLine(line);

    for (const match of newMatches) {
      if (injectedCount >= maxInjections) break;
      if (usedUrls.has(match.fullUrl)) continue;
      if (wordCounter - lastInjectionWordIndex < minWordGap) continue;

      // Try to find and link the keyword in this line
      const result = tryInjectLink(line, match);
      if (result) {
        line = result;
        injectedCount++;
        lastInjectionWordIndex = wordCounter;
        usedUrls.add(match.fullUrl);
      }
    }

    wordCounter += lineWords;
    return line;
  });

  return {
    content: processedLines.join('\n'),
    injectedCount,
    existingCount,
  };
}

function isUnsafeLine(line: string): boolean {
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

function countWordsInLine(line: string): number {
  return line.trim().split(/\s+/).filter(Boolean).length;
}

function tryInjectLink(line: string, match: LinkMatch): string | null {
  // Build search patterns from the matched keyword and tool name
  const searchTerms = [
    match.matchedKeyword,
    match.tool.name,
    ...match.tool.keywords,
  ];

  for (const term of searchTerms) {
    if (!term || term.length < 3) continue;

    // Case-insensitive search, but not inside existing links
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![\\[\\(])\\b(${escaped})\\b(?![\\]\\)])`, 'i');
    const found = regex.exec(line);

    if (found) {
      // Make sure we're not inside an existing markdown link
      const beforeMatch = line.substring(0, found.index);
      const openBrackets = (beforeMatch.match(/\[/g) || []).length;
      const closeBrackets = (beforeMatch.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) continue; // Inside a link

      const original = found[1];
      const linked = `[${original}](${match.fullUrl})`;
      return line.substring(0, found.index) + linked + line.substring(found.index + original.length);
    }
  }

  return null;
}
