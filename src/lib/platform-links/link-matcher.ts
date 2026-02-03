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

/**
 * Extract version number from a string (e.g., "veo 3" -> "3", "gpt-4o" -> "4o")
 */
function extractVersion(text: string): string | null {
  const match = text.match(/(\d+(?:[.\-]\d+)?(?:[a-z])?)/i);
  return match ? match[1].replace(/[.\-]/g, ' ') : null;
}

/**
 * Calculate specificity score - more specific matches score higher.
 * "veo 3" matching "veo 3" is more specific than "veo 3" matching "veo"
 */
function calculateSpecificityBonus(keyword: string, toolKeyword: string): number {
  const keywordVersion = extractVersion(keyword);
  const toolVersion = extractVersion(toolKeyword);
  
  // If keyword has a version number
  if (keywordVersion) {
    // Tool also has the SAME version = high bonus
    if (toolVersion && keywordVersion === toolVersion) {
      return 0.3;
    }
    // Tool has a DIFFERENT version = penalty (prefer exact version match)
    if (toolVersion && keywordVersion !== toolVersion) {
      return -0.2;
    }
    // Tool has NO version (parent page like /m/veo) = small penalty
    if (!toolVersion) {
      return -0.1;
    }
  }
  
  return 0;
}

/**
 * Category-related keywords for broader matching in aggressive mode.
 * Maps general terms to tool categories.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'video': ['video generation', 'video creator', 'video maker', 'ai video', 'text to video', 'video editing'],
  'image': ['image generation', 'image creator', 'ai image', 'text to image', 'image editing', 'photo editing'],
  'audio': ['audio generation', 'voice', 'text to speech', 'music generation', 'sound'],
  'watermark': ['watermark', 'watermark removal', 'watermark remover', 'remove watermark'],
  'upscale': ['upscale', 'upscaler', 'enhance', 'image enhancer', 'resolution'],
  'background': ['background', 'background removal', 'background remover', 'remove background'],
};

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
      
      // Calculate specificity bonus/penalty based on version matching
      const specificityBonus = calculateSpecificityBonus(normalizedKeyword, normalizedToolKw);

      // Tier 1: Exact match (after normalization)
      if (normalizedKeyword === normalizedToolKw) {
        const score = 1.0 + specificityBonus;
        if (score > bestScore) {
          bestScore = score;
          bestMatchedKeyword = toolKw;
        }
        continue;
      }

      // Tier 2: Contains match - but prefer more specific matches
      if (normalizedKeyword.includes(normalizedToolKw) || normalizedToolKw.includes(normalizedKeyword)) {
        // Calculate how much of the keyword is covered by the tool keyword
        const coverage = normalizedToolKw.length / normalizedKeyword.length;
        const score = 0.5 + (0.3 * coverage) + specificityBonus;
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
        const score = 0.3 + (0.3 * overlap / Math.max(keywordTokens.length, toolTokens.length)) + specificityBonus;
        if (score > bestScore) {
          bestScore = score;
          bestMatchedKeyword = toolKw;
        }
      }
    }

    // Also check tool name (with version normalization and specificity)
    if (bestScore < 0.5) {
      const normalizedName = normalizeVersions(tool.name.toLowerCase());
      const nameSpecificityBonus = calculateSpecificityBonus(normalizedKeyword, normalizedName);
      
      if (normalizedKeyword.includes(normalizedName) || normalizedName.includes(normalizedKeyword)) {
        const coverage = normalizedName.length / normalizedKeyword.length;
        const score = 0.4 + (0.2 * coverage) + nameSpecificityBonus;
        if (score > bestScore) {
          bestScore = score;
          bestMatchedKeyword = tool.name;
        }
      }
    }

    // Tier 4: Category-based matching (for related tools)
    // Lower score but allows related tools to be included
    if (bestScore === 0) {
      const toolCategory = tool.category.toLowerCase();
      for (const [category, categoryKeywords] of Object.entries(CATEGORY_KEYWORDS)) {
        // Check if blog keyword relates to this category
        const keywordMatchesCategory = categoryKeywords.some(ck => 
          normalizedKeyword.includes(ck) || ck.includes(normalizedKeyword)
        );
        // Check if tool is in this category
        const toolMatchesCategory = 
          toolCategory.includes(category) || 
          tool.keywords.some(k => categoryKeywords.some(ck => k.toLowerCase().includes(ck)));
        
        if (keywordMatchesCategory && toolMatchesCategory) {
          bestScore = 0.2; // Lower score for category matches
          bestMatchedKeyword = tool.name;
          break;
        }
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

  // Sort by relevance score, then by path specificity (deeper paths = more specific)
  matches.sort((a, b) => {
    const scoreA = a.relevanceScore * (10 / a.tool.priority);
    const scoreB = b.relevanceScore * (10 / b.tool.priority);
    
    // If scores are close (within 0.2), prefer the more specific (deeper) path
    if (Math.abs(scoreA - scoreB) < 0.2) {
      const depthA = a.tool.path.split('/').filter(Boolean).length;
      const depthB = b.tool.path.split('/').filter(Boolean).length;
      // More depth = more specific = should rank higher
      if (depthB !== depthA) {
        return depthB - depthA;
      }
    }
    
    return scoreB - scoreA;
  });

  return matches.slice(0, maxResults);
}

/**
 * Find the most specific matching URL for a keyword.
 * Prefers deeper paths when multiple matches exist.
 * 
 * Example: "veo 3" with tools [/m/veo, /m/veo/veo-3]
 * Returns: /m/veo/veo-3 (more specific)
 * 
 * Example: "veo 3" with tools [/m/veo] only
 * Returns: /m/veo (fallback to parent)
 */
export function findBestMatchingUrl(
  keyword: string,
  tools: BrandToolData[],
  domain: string
): LinkMatch | null {
  const matches = findRelevantLinks(keyword, '', tools, domain, 5);
  
  if (matches.length === 0) return null;
  
  // The sorting already prefers specific paths, so just return the first
  return matches[0];
}
