/**
 * Generic keyword/phrase to URL mapping for content interlinking.
 * These are applied AFTER tool-specific links, catching common phrases
 * that appear in content regardless of the main blog keyword.
 * 
 * Rules are processed in order - put more specific phrases first.
 */

export interface KeywordRule {
  phrase: string;
  url: string;
  /** Optional: only apply this rule for certain blog types */
  blogTypes?: string[];
}

/**
 * NOTE: We no longer use hardcoded generic keyword links.
 * All keyword rules are now built dynamically from the brand tools database
 * to ensure only valid URLs from the sitemap are used.
 * 
 * Use buildKeywordRulesFromTools() to generate rules from your actual tools.
 */
export const GENERIC_KEYWORD_LINKS: KeywordRule[] = [];

/**
 * Build keyword rules from brand tools data.
 * This creates rules from the tool keywords stored in the database.
 */
export function buildKeywordRulesFromTools(
  tools: { name: string; path: string; keywords: string[] }[],
  domain: string
): KeywordRule[] {
  const rules: KeywordRule[] = [];
  const cleanDomain = domain.replace(/\/$/, '');
  
  for (const tool of tools) {
    // Add the tool name as a rule
    rules.push({
      phrase: tool.name.toLowerCase(),
      url: `${cleanDomain}${tool.path}`,
    });
    
    // Add each keyword as a rule (if long enough)
    for (const keyword of tool.keywords) {
      if (keyword.length >= 4) {
        rules.push({
          phrase: keyword.toLowerCase(),
          url: `${cleanDomain}${tool.path}`,
        });
      }
    }
  }
  
  return rules;
}
