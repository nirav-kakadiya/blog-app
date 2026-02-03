export { crawlSitemap, clearSitemapCache, autoCategorize, slugToKeywords } from './sitemap-crawler';
export { findRelevantLinks, findBestMatchingUrl } from './link-matcher';
export type { LinkMatch, BrandToolData } from './link-matcher';
export { injectPlatformLinks } from './link-injector';
export { buildPlatformPromptSection } from './prompt-builder';
export { injectKeywordLinks } from './keyword-link-injector';
export { GENERIC_KEYWORD_LINKS, buildKeywordRulesFromTools } from './keyword-links';
export type { KeywordRule } from './keyword-links';
export { isUnsafeLine, countWordsInLine, isInsideMarkdownLink } from './link-injector-helpers';

// Smart Link Matcher (Enterprise-grade)
export { 
  SmartLinkMatcher, 
  getSmartLinkMatcher, 
  initializeSmartMatcher, 
  smartFindLinks 
} from './smart-link-matcher';
