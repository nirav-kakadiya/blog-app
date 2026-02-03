/**
 * Generic keyword/phrase link injector.
 * This is a second-pass injector that links common phrases like
 * "video generation", "text to video" etc. to relevant platform pages.
 */

import { isUnsafeLine, countWordsInLine, isInsideMarkdownLink } from './link-injector-helpers';
import { KeywordRule } from './keyword-links';

interface KeywordInjectionConfig {
  maxInjections?: number;
  minWordGap?: number;
  /** Base domain to prepend to relative URLs */
  domain?: string;
}

interface KeywordInjectionResult {
  content: string;
  injectedCount: number;
  /** Which phrases were linked */
  linkedPhrases: string[];
}

/**
 * Inject links for generic keyword phrases in content.
 * 
 * @param content - Markdown content to process
 * @param rules - Keyword rules (phrase → URL mappings)
 * @param config - Injection configuration
 * @returns Modified content with links injected
 */
export function injectKeywordLinks(
  content: string,
  rules: KeywordRule[],
  config: KeywordInjectionConfig = {}
): KeywordInjectionResult {
  const { 
    maxInjections = 10, 
    minWordGap = 80,
    domain = ''
  } = config;

  if (!rules.length || !content) {
    return { content, injectedCount: 0, linkedPhrases: [] };
  }

  const lines = content.split('\n');
  let injectedCount = 0;
  let wordCounter = 0;
  let lastInjectionWordIndex = -minWordGap;
  const usedPhrases = new Set<string>();
  const linkedPhrases: string[] = [];

  const processedLines = lines.map((line) => {
    if (injectedCount >= maxInjections) return line;
    
    if (isUnsafeLine(line)) {
      wordCounter += countWordsInLine(line);
      return line;
    }

    for (const rule of rules) {
      if (injectedCount >= maxInjections) break;
      if (wordCounter - lastInjectionWordIndex < minWordGap) break;
      
      // Skip if we already linked this phrase
      const phraseKey = rule.phrase.toLowerCase();
      if (usedPhrases.has(phraseKey)) continue;

      // Build case-insensitive regex for the phrase
      // Escape special regex characters in the phrase
      const escapedPhrase = rule.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b(${escapedPhrase})\\b`, 'i');
      
      const match = line.match(regex);
      if (!match || match.index === undefined) continue;

      // Check if this position is already inside a markdown link
      if (isInsideMarkdownLink(line, match.index)) continue;
      
      // Check if the match is already part of a link (look for ] or ( nearby)
      const afterMatch = line.slice(match.index + match[0].length);
      if (afterMatch.startsWith('](') || afterMatch.startsWith('](http')) continue;
      
      // Check if there's already a link on this line for a similar phrase
      const linkRegex = /\[([^\]]+)\]\([^)]+\)/g;
      let existingLink;
      let skipThisLine = false;
      while ((existingLink = linkRegex.exec(line)) !== null) {
        const linkedText = existingLink[1].toLowerCase();
        if (linkedText.includes(phraseKey) || phraseKey.includes(linkedText)) {
          skipThisLine = true;
          break;
        }
      }
      if (skipThisLine) continue;

      // Build the URL (prepend domain if URL is relative)
      let url = rule.url;
      if (url.startsWith('/') && domain) {
        url = `${domain}${url}`;
      }

      // Create the link
      const anchor = match[0];
      const link = `[${anchor}](${url})`;
      
      // Replace only the first occurrence
      line = line.slice(0, match.index) + link + line.slice(match.index + match[0].length);

      injectedCount++;
      lastInjectionWordIndex = wordCounter;
      usedPhrases.add(phraseKey);
      linkedPhrases.push(rule.phrase);
      break; // Only one injection per line
    }

    wordCounter += countWordsInLine(line);
    return line;
  });

  return {
    content: processedLines.join('\n'),
    injectedCount,
    linkedPhrases,
  };
}
