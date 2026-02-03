/**
 * Smart Link Matcher - Enterprise-grade URL matching with:
 * 1. Trie-based hierarchical tree for fast traversal
 * 2. LRU cache for repeated queries
 * 3. Version-aware matching (veo 3 → /m/veo/veo-3)
 * 4. Intelligent fallback to parent paths
 * 5. Fuzzy matching for typos/variations
 */

import { BrandToolData, LinkMatch } from './link-matcher';

// ============================================================================
// TYPES
// ============================================================================

interface TrieNode {
  segment: string;
  tool: BrandToolData | null;
  children: Map<string, TrieNode>;
  parent: TrieNode | null;
  depth: number;
}

interface MatchResult {
  tool: BrandToolData;
  score: number;
  matchType: 'exact' | 'version' | 'partial' | 'parent-fallback' | 'fuzzy';
}

interface CacheEntry {
  results: LinkMatch[];
  timestamp: number;
}

// ============================================================================
// LRU CACHE
// ============================================================================

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// SMART LINK MATCHER CLASS
// ============================================================================

export class SmartLinkMatcher {
  private root: TrieNode;
  private tools: BrandToolData[] = [];
  private domain: string = '';
  private cache: LRUCache<string, CacheEntry>;
  private cacheMaxAge: number;
  private keywordIndex: Map<string, BrandToolData[]> = new Map();
  private versionMap: Map<string, Map<string, BrandToolData>> = new Map();

  constructor(options: { cacheSize?: number; cacheMaxAge?: number } = {}) {
    this.root = this.createNode('', null, 0);
    this.cache = new LRUCache(options.cacheSize || 200);
    this.cacheMaxAge = options.cacheMaxAge || 5 * 60 * 1000; // 5 minutes default
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  /**
   * Build the trie and indexes from tools data
   */
  initialize(tools: BrandToolData[], domain: string): void {
    this.tools = tools;
    this.domain = domain.replace(/\/$/, '');
    this.cache.clear();
    this.root = this.createNode('', null, 0);
    this.keywordIndex.clear();
    this.versionMap.clear();

    for (const tool of tools) {
      // Build trie from path
      this.insertPath(tool);
      
      // Build keyword index for fast lookup
      this.indexKeywords(tool);
      
      // Build version map for version-aware matching
      this.indexVersions(tool);
    }
  }

  private createNode(segment: string, parent: TrieNode | null, depth: number): TrieNode {
    return {
      segment,
      tool: null,
      children: new Map(),
      parent,
      depth,
    };
  }

  private insertPath(tool: BrandToolData): void {
    const segments = tool.path.split('/').filter(Boolean);
    let current = this.root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i].toLowerCase();
      
      if (!current.children.has(segment)) {
        current.children.set(segment, this.createNode(segment, current, i + 1));
      }
      current = current.children.get(segment)!;
    }

    current.tool = tool;
  }

  private indexKeywords(tool: BrandToolData): void {
    const allKeywords = [
      tool.name.toLowerCase(),
      ...tool.keywords.map(k => k.toLowerCase()),
    ];

    for (const keyword of allKeywords) {
      const normalized = this.normalizeKeyword(keyword);
      if (!this.keywordIndex.has(normalized)) {
        this.keywordIndex.set(normalized, []);
      }
      this.keywordIndex.get(normalized)!.push(tool);

      // Also index individual tokens
      const tokens = normalized.split(/\s+/);
      for (const token of tokens) {
        if (token.length >= 3) {
          if (!this.keywordIndex.has(token)) {
            this.keywordIndex.set(token, []);
          }
          if (!this.keywordIndex.get(token)!.includes(tool)) {
            this.keywordIndex.get(token)!.push(tool);
          }
        }
      }
    }
  }

  private indexVersions(tool: BrandToolData): void {
    // Extract base name and version from tool name
    // "Veo 3" → base: "veo", version: "3"
    // "GPT-4o" → base: "gpt", version: "4o"
    const { baseName, version } = this.extractBaseAndVersion(tool.name);
    
    if (baseName) {
      if (!this.versionMap.has(baseName)) {
        this.versionMap.set(baseName, new Map());
      }
      const versionKey = version || '__base__';
      this.versionMap.get(baseName)!.set(versionKey, tool);
    }
  }

  // --------------------------------------------------------------------------
  // NORMALIZATION & EXTRACTION
  // --------------------------------------------------------------------------

  private normalizeKeyword(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.\-_]/g, ' ')  // Normalize separators
      .replace(/\s+/g, ' ')      // Collapse whitespace
      .trim();
  }

  private extractBaseAndVersion(text: string): { baseName: string; version: string | null } {
    const normalized = this.normalizeKeyword(text);
    
    // Pattern: "name version" or "name-version"
    // Examples: "veo 3", "gpt 4o", "claude 3 5 sonnet", "midjourney v6"
    const match = normalized.match(/^([a-z]+(?:\s+[a-z]+)?)\s*[v]?(\d+(?:\s*\d+)?(?:\s*[a-z]+)?)?$/i);
    
    if (match) {
      return {
        baseName: match[1].replace(/\s+/g, '').toLowerCase(),
        version: match[2] ? match[2].replace(/\s+/g, '').toLowerCase() : null,
      };
    }

    return { baseName: normalized.replace(/\s+/g, ''), version: null };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Levenshtein-based similarity for fuzzy matching
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    // Quick check for exact match
    if (str1 === str2) return 1;

    // Quick check for containment
    if (str1.includes(str2)) return 0.8 + (0.2 * str2.length / str1.length);
    if (str2.includes(str1)) return 0.8 + (0.2 * str1.length / str2.length);

    // Jaccard similarity on character bigrams
    const getBigrams = (s: string): Set<string> => {
      const bigrams = new Set<string>();
      for (let i = 0; i < s.length - 1; i++) {
        bigrams.add(s.slice(i, i + 2));
      }
      return bigrams;
    };

    const bigrams1 = getBigrams(str1);
    const bigrams2 = getBigrams(str2);
    
    let intersection = 0;
    for (const b of bigrams1) {
      if (bigrams2.has(b)) intersection++;
    }
    
    const union = bigrams1.size + bigrams2.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  // --------------------------------------------------------------------------
  // MATCHING LOGIC
  // --------------------------------------------------------------------------

  /**
   * Find the best matching links for a keyword
   */
  findLinks(keyword: string, maxResults: number = 10): LinkMatch[] {
    // Check cache first
    const cacheKey = `${keyword}:${maxResults}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
      return cached.results;
    }

    const normalized = this.normalizeKeyword(keyword);
    const results: MatchResult[] = [];

    // Strategy 1: Exact keyword match
    const exactMatches = this.findExactMatches(normalized);
    results.push(...exactMatches);

    // Strategy 2: Version-aware match (veo 3 → /m/veo/veo-3)
    const versionMatches = this.findVersionMatches(normalized);
    results.push(...versionMatches);

    // Strategy 3: Trie traversal for path-based matches
    const pathMatches = this.findPathMatches(normalized);
    results.push(...pathMatches);

    // Strategy 4: Token-based partial matches
    const partialMatches = this.findPartialMatches(normalized);
    results.push(...partialMatches);

    // Strategy 5: Fuzzy matching for typos (only if no good matches)
    if (results.filter(r => r.score > 0.5).length === 0) {
      const fuzzyMatches = this.findFuzzyMatches(normalized);
      results.push(...fuzzyMatches);
    }

    // Deduplicate and sort by score
    const uniqueResults = this.deduplicateResults(results);
    const sortedResults = uniqueResults
      .sort((a, b) => {
        // Primary: score
        if (Math.abs(b.score - a.score) > 0.1) {
          return b.score - a.score;
        }
        // Secondary: path depth (more specific = better)
        const depthA = a.tool.path.split('/').filter(Boolean).length;
        const depthB = b.tool.path.split('/').filter(Boolean).length;
        return depthB - depthA;
      })
      .slice(0, maxResults);

    // Convert to LinkMatch format
    const linkMatches: LinkMatch[] = sortedResults.map(r => ({
      tool: r.tool,
      fullUrl: `${this.domain}${r.tool.path}`,
      matchedKeyword: normalized,
      relevanceScore: r.score,
    }));

    // Cache results
    this.cache.set(cacheKey, { results: linkMatches, timestamp: Date.now() });

    return linkMatches;
  }

  private findExactMatches(normalized: string): MatchResult[] {
    const results: MatchResult[] = [];
    const tools = this.keywordIndex.get(normalized);
    
    if (tools) {
      for (const tool of tools) {
        results.push({
          tool,
          score: 1.0,
          matchType: 'exact',
        });
      }
    }

    return results;
  }

  private findVersionMatches(normalized: string): MatchResult[] {
    const results: MatchResult[] = [];
    const { baseName, version } = this.extractBaseAndVersion(normalized);

    if (!baseName) return results;

    const versionTools = this.versionMap.get(baseName);
    if (!versionTools) return results;

    if (version) {
      // Look for exact version match first
      const exactVersionTool = versionTools.get(version);
      if (exactVersionTool) {
        results.push({
          tool: exactVersionTool,
          score: 0.95,
          matchType: 'version',
        });
      } else {
        // Fallback to base version if specific version not found
        const baseTool = versionTools.get('__base__');
        if (baseTool) {
          results.push({
            tool: baseTool,
            score: 0.7,
            matchType: 'parent-fallback',
          });
        }
      }
    } else {
      // No version specified, prefer base
      const baseTool = versionTools.get('__base__');
      if (baseTool) {
        results.push({
          tool: baseTool,
          score: 0.85,
          matchType: 'version',
        });
      }
    }

    return results;
  }

  private findPathMatches(normalized: string): MatchResult[] {
    const results: MatchResult[] = [];
    const tokens = normalized.split(/\s+/).filter(t => t.length >= 2);

    // Try to traverse the trie based on tokens
    let current = this.root;
    let matchedDepth = 0;
    let lastMatchedNode: TrieNode | null = null;

    for (const token of tokens) {
      // Look for direct child match
      if (current.children.has(token)) {
        current = current.children.get(token)!;
        matchedDepth++;
        lastMatchedNode = current;
      } else {
        // Look for partial match in children
        for (const [key, child] of current.children) {
          if (key.includes(token) || token.includes(key)) {
            current = child;
            matchedDepth++;
            lastMatchedNode = current;
            break;
          }
        }
      }
    }

    // If we found a node with a tool, add it
    if (lastMatchedNode?.tool) {
      results.push({
        tool: lastMatchedNode.tool,
        score: 0.6 + (0.1 * matchedDepth),
        matchType: 'partial',
      });
    }

    // Also check parent nodes for fallback
    if (lastMatchedNode) {
      let parent = lastMatchedNode.parent;
      while (parent && parent !== this.root) {
        if (parent.tool) {
          results.push({
            tool: parent.tool,
            score: 0.4 + (0.05 * parent.depth),
            matchType: 'parent-fallback',
          });
        }
        parent = parent.parent;
      }
    }

    return results;
  }

  private findPartialMatches(normalized: string): MatchResult[] {
    const results: MatchResult[] = [];
    const tokens = normalized.split(/\s+/).filter(t => t.length >= 3);

    const toolScores = new Map<BrandToolData, number>();

    for (const token of tokens) {
      const tools = this.keywordIndex.get(token);
      if (tools) {
        for (const tool of tools) {
          const currentScore = toolScores.get(tool) || 0;
          toolScores.set(tool, currentScore + 0.2);
        }
      }
    }

    for (const [tool, score] of toolScores) {
      if (score >= 0.2) {
        results.push({
          tool,
          score: Math.min(score, 0.6),
          matchType: 'partial',
        });
      }
    }

    return results;
  }

  private findFuzzyMatches(normalized: string): MatchResult[] {
    const results: MatchResult[] = [];

    for (const tool of this.tools) {
      const toolName = this.normalizeKeyword(tool.name);
      const similarity = this.calculateSimilarity(normalized, toolName);

      if (similarity >= 0.6) {
        results.push({
          tool,
          score: similarity * 0.5, // Fuzzy matches get lower scores
          matchType: 'fuzzy',
        });
      }
    }

    return results;
  }

  private deduplicateResults(results: MatchResult[]): MatchResult[] {
    const seen = new Map<string, MatchResult>();

    for (const result of results) {
      const key = result.tool.id;
      const existing = seen.get(key);
      
      if (!existing || result.score > existing.score) {
        seen.set(key, result);
      }
    }

    return Array.from(seen.values());
  }

  // --------------------------------------------------------------------------
  // UTILITY
  // --------------------------------------------------------------------------

  clearCache(): void {
    this.cache.clear();
  }

  getToolCount(): number {
    return this.tools.length;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: SmartLinkMatcher | null = null;

export function getSmartLinkMatcher(): SmartLinkMatcher {
  if (!instance) {
    instance = new SmartLinkMatcher({ cacheSize: 200, cacheMaxAge: 5 * 60 * 1000 });
  }
  return instance;
}

export function initializeSmartMatcher(tools: BrandToolData[], domain: string): void {
  const matcher = getSmartLinkMatcher();
  matcher.initialize(tools, domain);
}

export function smartFindLinks(keyword: string, maxResults: number = 10): LinkMatch[] {
  return getSmartLinkMatcher().findLinks(keyword, maxResults);
}
