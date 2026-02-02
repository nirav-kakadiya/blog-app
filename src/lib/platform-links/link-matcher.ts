export interface BrandToolData {
  id: string;
  name: string;
  path: string;
  category: string;
  keywords: string[];
  description: string | null;
  priority: number;
}

export interface LinkMatch {
  tool: BrandToolData;
  fullUrl: string;
  matchedKeyword: string;
  relevanceScore: number;
}

/**
 * Normalize version separators so "seedream 4.5", "seedream 4-5", "seedream 4 5"
 * all become "seedream 4 5" for comparison purposes.
 */
function normalizeVersions(text: string): string {
  return text.replace(/(\d)[.\-](\d)/g, '$1 $2');
}

export function findRelevantLinks(
  keyword: string,
  blogType: string,
  tools: BrandToolData[],
  domain: string,
  maxResults: number = 10
): LinkMatch[] {
  const normalizedKeyword = normalizeVersions(keyword.toLowerCase().trim());
  const keywordTokens = normalizedKeyword.split(/\s+/);
  const matches: LinkMatch[] = [];

  for (const tool of tools) {
    let bestScore = 0;
    let bestMatchedKeyword = '';

    for (const toolKw of tool.keywords) {
      const normalizedToolKw = normalizeVersions(toolKw.toLowerCase().trim());

      // Tier 1: Exact match (after normalization)
      if (normalizedKeyword === normalizedToolKw) {
        bestScore = 1.0;
        bestMatchedKeyword = toolKw;
        break;
      }

      // Tier 2: Contains match
      if (normalizedKeyword.includes(normalizedToolKw) || normalizedToolKw.includes(normalizedKeyword)) {
        const score = 0.7;
        if (score > bestScore) {
          bestScore = score;
          bestMatchedKeyword = toolKw;
        }
        continue;
      }

      // Tier 3: Token overlap
      const toolTokens = normalizedToolKw.split(/\s+/);
      const overlap = keywordTokens.filter(t => toolTokens.includes(t)).length;
      if (overlap > 0) {
        const score = 0.3 + (0.3 * overlap / Math.max(keywordTokens.length, toolTokens.length));
        if (score > bestScore) {
          bestScore = score;
          bestMatchedKeyword = toolKw;
        }
      }
    }

    // Also check tool name (with version normalization)
    if (bestScore === 0) {
      const normalizedName = normalizeVersions(tool.name.toLowerCase());
      if (normalizedKeyword.includes(normalizedName) || normalizedName.includes(normalizedKeyword)) {
        bestScore = 0.5;
        bestMatchedKeyword = tool.name;
      }
    }

    if (bestScore > 0) {
      const cleanDomain = domain.replace(/\/$/, '');
      matches.push({
        tool,
        fullUrl: `${cleanDomain}${tool.path}`,
        matchedKeyword: bestMatchedKeyword,
        relevanceScore: bestScore,
      });
    }
  }

  // Sort by relevance * inverse priority (lower priority number = higher importance)
  matches.sort((a, b) => {
    const scoreA = a.relevanceScore * (10 / a.tool.priority);
    const scoreB = b.relevanceScore * (10 / b.tool.priority);
    return scoreB - scoreA;
  });

  return matches.slice(0, maxResults);
}
