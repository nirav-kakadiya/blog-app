import { logger } from '@/lib/logger';

export interface SEOAnalysis {
  score: number;
  checks: SEOCheck[];
  suggestions: string[];
}

export interface SEOCheck {
  id: string;
  name: string;
  passed: boolean;
  message: string;
  importance: 'critical' | 'important' | 'optional';
}

export function analyzeSEO(content: string, keyword: string, title: string): SEOAnalysis {
  const checks: SEOCheck[] = [];
  const suggestions: string[] = [];

  const lowerContent = content.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const lowerTitle = title.toLowerCase();

  // 1. Keyword in title
  const keywordInTitle = lowerTitle.includes(lowerKeyword);
  checks.push({
    id: 'keyword_in_title',
    name: 'Keyword in Title',
    passed: keywordInTitle,
    message: keywordInTitle
      ? 'Keyword found in title'
      : 'Add keyword to title for better SEO',
    importance: 'critical',
  });
  if (!keywordInTitle) {
    suggestions.push(`Add "${keyword}" to the title`);
  }

  // 2. Title length
  const titleLength = title.length;
  const titleLengthOk = titleLength >= 30 && titleLength <= 60;
  checks.push({
    id: 'title_length',
    name: 'Title Length',
    passed: titleLengthOk,
    message: `Title is ${titleLength} characters (recommended: 30-60)`,
    importance: 'important',
  });
  if (titleLength > 60) {
    suggestions.push('Shorten title to under 60 characters');
  }

  // 3. Keyword in first 100 words
  const first100Words = content.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
  const keywordInFirst100 = first100Words.includes(lowerKeyword);
  checks.push({
    id: 'keyword_in_first_100',
    name: 'Keyword in First 100 Words',
    passed: keywordInFirst100,
    message: keywordInFirst100
      ? 'Keyword found in first 100 words'
      : 'Add keyword to the introduction',
    importance: 'critical',
  });
  if (!keywordInFirst100) {
    suggestions.push(`Include "${keyword}" in the first paragraph`);
  }

  // 4. Keyword in H2
  const h2Matches = content.match(/^## .+$/gm) || [];
  const keywordInH2 = h2Matches.some((h2) => h2.toLowerCase().includes(lowerKeyword));
  checks.push({
    id: 'keyword_in_h2',
    name: 'Keyword in H2 Heading',
    passed: keywordInH2,
    message: keywordInH2
      ? 'Keyword found in at least one H2 heading'
      : 'Add keyword to at least one H2 heading',
    importance: 'important',
  });
  if (!keywordInH2) {
    suggestions.push(`Add "${keyword}" to at least one section heading`);
  }

  // 5. H2 count
  const h2Count = h2Matches.length;
  const h2CountOk = h2Count >= 4;
  checks.push({
    id: 'h2_count',
    name: 'H2 Headings Count',
    passed: h2CountOk,
    message: `Found ${h2Count} H2 headings (recommended: 4+)`,
    importance: 'important',
  });

  // 6. Word count
  const wordCount = content.split(/\s+/).length;
  const wordCountOk = wordCount >= 1000;
  checks.push({
    id: 'word_count',
    name: 'Content Length',
    passed: wordCountOk,
    message: `${wordCount} words (recommended: 1000+)`,
    importance: 'important',
  });
  if (!wordCountOk) {
    suggestions.push(`Add more content (current: ${wordCount} words, target: 1000+)`);
  }

  // 7. Keyword density
  const keywordCount = (lowerContent.match(new RegExp(lowerKeyword, 'g')) || []).length;
  const keywordDensity = (keywordCount / wordCount) * 100;
  const keywordDensityOk = keywordDensity >= 0.5 && keywordDensity <= 2.5;
  checks.push({
    id: 'keyword_density',
    name: 'Keyword Density',
    passed: keywordDensityOk,
    message: `${keywordDensity.toFixed(1)}% (recommended: 0.5-2.5%)`,
    importance: 'optional',
  });

  // 8. Has FAQ section
  const hasFAQ = lowerContent.includes('## faq') || lowerContent.includes('## frequently asked');
  checks.push({
    id: 'has_faq',
    name: 'FAQ Section',
    passed: hasFAQ,
    message: hasFAQ ? 'FAQ section found' : 'Add an FAQ section',
    importance: 'important',
  });
  if (!hasFAQ) {
    suggestions.push('Add a Frequently Asked Questions section');
  }

  // 9. Has internal links
  const internalLinks = (content.match(/\[.+?\]\(\/.+?\)/g) || []).length;
  const hasInternalLinks = internalLinks >= 1;
  checks.push({
    id: 'internal_links',
    name: 'Internal Links',
    passed: hasInternalLinks,
    message: `Found ${internalLinks} internal links (recommended: 1+)`,
    importance: 'optional',
  });

  // 10. Has images
  const imageCount = (content.match(/!\[.+?\]\(.+?\)/g) || []).length;
  const hasImages = imageCount >= 1;
  checks.push({
    id: 'has_images',
    name: 'Images',
    passed: hasImages,
    message: `Found ${imageCount} images (recommended: 1+)`,
    importance: 'optional',
  });

  // Calculate score
  const criticalChecks = checks.filter((c) => c.importance === 'critical');
  const importantChecks = checks.filter((c) => c.importance === 'important');
  const optionalChecks = checks.filter((c) => c.importance === 'optional');

  const criticalScore = criticalChecks.filter((c) => c.passed).length / criticalChecks.length;
  const importantScore = importantChecks.filter((c) => c.passed).length / importantChecks.length;
  const optionalScore = optionalChecks.filter((c) => c.passed).length / optionalChecks.length;

  const score = Math.round((criticalScore * 0.5 + importantScore * 0.35 + optionalScore * 0.15) * 100);

  logger.info('SEO analysis complete', { score, passedChecks: checks.filter((c) => c.passed).length });

  return {
    score,
    checks,
    suggestions,
  };
}

export function getKeywordDensity(content: string, keyword: string): number {
  const words = content.split(/\s+/).length;
  const keywordCount = (content.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || [])
    .length;
  return (keywordCount / words) * 100;
}

export function getWordCount(content: string): number {
  return content.split(/\s+/).filter((w) => w.length > 0).length;
}

export function getReadingTime(content: string): number {
  const words = getWordCount(content);
  return Math.ceil(words / 200); // Average reading speed: 200 words/min
}
