import { BlogType } from '@/types';
import { getTemplate } from '@/lib/templates';
import { logger } from '@/lib/logger';

export interface ContentCheckResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  checks: ContentCheck[];
  suggestions: string[];
  summary: string;
}

export interface ContentCheck {
  id: string;
  name: string;
  category: 'structure' | 'quality' | 'readability' | 'completeness';
  passed: boolean;
  message: string;
  importance: 'critical' | 'important' | 'optional';
  details?: string;
}

interface ContentMetrics {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgSentenceLength: number;
  avgParagraphLength: number;
  h2Count: number;
  h3Count: number;
  h2Texts: string[];
  hasFAQ: boolean;
  faqCount: number;
  hasIntro: boolean;
  hasTLDR: boolean;
  hasConclusion: boolean;
  hasCTA: boolean;
  imageCount: number;
  linkCount: number;
  codeBlockCount: number;
  listCount: number;
  tableCount: number;
  duplicateH2s: string[];
  emptyH2s: number;
  shortSections: string[];
  longParagraphs: number;
  plainText: string;
}

/**
 * Run comprehensive content checks on generated blog content
 */
export function checkContent(
  content: string,
  keyword: string,
  title: string,
  blogType: BlogType
): ContentCheckResult {
  const checks: ContentCheck[] = [];
  const suggestions: string[] = [];

  const metrics = analyzeContent(content);
  const template = getTemplateOrNull(blogType);

  // === STRUCTURE CHECKS ===
  checks.push(...runStructureChecks(content, metrics, template, blogType));

  // === QUALITY CHECKS ===
  checks.push(...runQualityChecks(content, metrics, keyword, title));

  // === READABILITY CHECKS ===
  checks.push(...runReadabilityChecks(content, metrics));

  // === COMPLETENESS CHECKS ===
  checks.push(...runCompletenessChecks(content, metrics, template, blogType));

  // Collect suggestions from failed checks
  for (const check of checks) {
    if (!check.passed && check.details) {
      suggestions.push(check.details);
    }
  }

  // Calculate score
  const score = calculateScore(checks);
  const grade = getGrade(score);
  const summary = generateSummary(score, grade, checks, metrics);

  logger.info('Content check complete', {
    score,
    grade,
    totalChecks: checks.length,
    passed: checks.filter((c) => c.passed).length,
    failed: checks.filter((c) => !c.passed).length,
  });

  return { score, grade, checks, suggestions, summary };
}

function getTemplateOrNull(blogType: BlogType) {
  try {
    return getTemplate(blogType);
  } catch {
    return null;
  }
}

/**
 * Extract content metrics from markdown
 */
function analyzeContent(content: string): ContentMetrics {
  const lines = content.split('\n');
  const textOnly = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+.*$/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^\|.*$/gm, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim();

  const words = textOnly.split(/\s+/).filter((w) => w.length > 0);
  const sentences = textOnly.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const paragraphs = textOnly.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  const h2Matches = content.match(/^## .+$/gm) || [];
  const h2Texts = h2Matches.map((h) => h.replace(/^## /, '').trim());
  const h3Matches = content.match(/^### .+$/gm) || [];

  // Detect duplicate H2s
  const h2Lower = h2Texts.map((t) => t.toLowerCase());
  const duplicateH2s = h2Lower.filter((item, index) => h2Lower.indexOf(item) !== index);

  // Count empty-ish H2s (H2 followed immediately by another heading or nothing)
  let emptyH2s = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      const nextNonEmpty = lines.slice(i + 1).find((l) => l.trim().length > 0);
      if (!nextNonEmpty || /^#{1,3} /.test(nextNonEmpty)) {
        emptyH2s++;
      }
    }
  }

  // Short sections: H2 sections with fewer than 50 words
  const shortSections: string[] = [];
  const sectionRegex = /^## (.+)$/gm;
  let match;
  const sectionStarts: { name: string; index: number }[] = [];
  while ((match = sectionRegex.exec(content)) !== null) {
    sectionStarts.push({ name: match[1], index: match.index });
  }
  for (let i = 0; i < sectionStarts.length; i++) {
    const start = sectionStarts[i].index;
    const end = i + 1 < sectionStarts.length ? sectionStarts[i + 1].index : content.length;
    const sectionContent = content.slice(start, end);
    const sectionWords = sectionContent.split(/\s+/).length;
    if (sectionWords < 50) {
      shortSections.push(sectionStarts[i].name);
    }
  }

  // Long paragraphs: > 200 words
  const longParagraphs = paragraphs.filter((p) => p.split(/\s+/).length > 200).length;

  // FAQ count
  const faqSection = content.match(/## (?:FAQ|Frequently Asked)[\s\S]*?(?=\n## |\n*$)/i);
  const faqCount = faqSection ? (faqSection[0].match(/### /g) || []).length : 0;

  const lowerContent = content.toLowerCase();

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    avgSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0,
    avgParagraphLength: paragraphs.length > 0 ? words.length / paragraphs.length : 0,
    h2Count: h2Matches.length,
    h3Count: h3Matches.length,
    h2Texts,
    hasFAQ: lowerContent.includes('## faq') || lowerContent.includes('## frequently asked'),
    faqCount,
    hasIntro: words.length > 50, // Content has at least an intro paragraph
    hasTLDR:
      lowerContent.includes('## tl;dr') ||
      lowerContent.includes('## quick summary') ||
      lowerContent.includes('## quick verdict') ||
      lowerContent.includes('## key takeaways') ||
      lowerContent.includes('## quick fix'),
    hasConclusion:
      lowerContent.includes('## conclusion') ||
      lowerContent.includes('## final thoughts') ||
      lowerContent.includes('## final verdict') ||
      lowerContent.includes('## our recommendation'),
    hasCTA:
      lowerContent.includes('get started') ||
      lowerContent.includes('try it') ||
      lowerContent.includes('sign up') ||
      lowerContent.includes('download') ||
      lowerContent.includes('start using'),
    imageCount: (content.match(/!\[.*?\]\(.*?\)/g) || []).length,
    linkCount: (content.match(/\[.*?\]\(.*?\)/g) || []).length,
    codeBlockCount: (content.match(/```/g) || []).length / 2,
    listCount: (content.match(/^\s*[-*]\s+/gm) || []).length + (content.match(/^\s*\d+\.\s+/gm) || []).length,
    tableCount: (content.match(/^\|/gm) || []).length > 0 ? 1 : 0,
    duplicateH2s,
    emptyH2s,
    shortSections,
    longParagraphs,
    plainText: textOnly,
  };
}

function runStructureChecks(
  content: string,
  metrics: ContentMetrics,
  template: ReturnType<typeof getTemplateOrNull>,
  blogType: BlogType
): ContentCheck[] {
  const checks: ContentCheck[] = [];

  // S1: Has H1 title
  const hasH1 = /^# [^#]/m.test(content);
  checks.push({
    id: 'has_h1',
    name: 'H1 Title Present',
    category: 'structure',
    passed: hasH1,
    message: hasH1 ? 'Content has an H1 title' : 'Content is missing an H1 title',
    importance: 'critical',
    details: hasH1 ? undefined : 'Add an H1 title at the beginning of the blog post',
  });

  // S2: Proper heading hierarchy (no skipped levels)
  const headingLevels: number[] = [];
  const headingRegex = /^(#{1,6})\s/gm;
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    headingLevels.push(match[1].length);
  }
  let hierarchyOk = true;
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] > headingLevels[i - 1] + 1) {
      hierarchyOk = false;
      break;
    }
  }
  checks.push({
    id: 'heading_hierarchy',
    name: 'Heading Hierarchy',
    category: 'structure',
    passed: hierarchyOk,
    message: hierarchyOk ? 'Headings follow proper hierarchy' : 'Heading levels are skipped (e.g. H2 to H4)',
    importance: 'important',
    details: hierarchyOk ? undefined : 'Fix heading hierarchy - do not skip levels (H1 > H2 > H3)',
  });

  // S3: Minimum H2 sections
  const minH2 = 4;
  checks.push({
    id: 'min_h2',
    name: 'Section Count',
    category: 'structure',
    passed: metrics.h2Count >= minH2,
    message: `${metrics.h2Count} H2 sections (minimum: ${minH2})`,
    importance: 'important',
    details: metrics.h2Count < minH2 ? `Add more sections - currently ${metrics.h2Count}, need at least ${minH2}` : undefined,
  });

  // S4: No duplicate H2 headings
  checks.push({
    id: 'no_duplicate_h2',
    name: 'No Duplicate Headings',
    category: 'structure',
    passed: metrics.duplicateH2s.length === 0,
    message:
      metrics.duplicateH2s.length === 0
        ? 'All H2 headings are unique'
        : `Duplicate H2 headings found: ${metrics.duplicateH2s.join(', ')}`,
    importance: 'important',
    details:
      metrics.duplicateH2s.length > 0
        ? `Remove or rename duplicate headings: ${metrics.duplicateH2s.join(', ')}`
        : undefined,
  });

  // S5: No empty sections
  checks.push({
    id: 'no_empty_sections',
    name: 'No Empty Sections',
    category: 'structure',
    passed: metrics.emptyH2s === 0,
    message: metrics.emptyH2s === 0 ? 'All sections have content' : `${metrics.emptyH2s} empty section(s) found`,
    importance: 'critical',
    details: metrics.emptyH2s > 0 ? 'Add content to all sections - empty sections hurt user experience' : undefined,
  });

  // S6: Template required sections present
  if (template) {
    const requiredSections = template.sections.required.filter((s) => s.h2);
    const contentLower = content.toLowerCase();
    const missingSections: string[] = [];

    for (const section of requiredSections) {
      // Check if a matching H2 exists (fuzzy match on key words)
      const sectionName = section.name.toLowerCase();
      const sectionH2 = (section.h2 || '').toLowerCase().replace(/\{.*?\}/g, '').trim();

      const hasSection =
        metrics.h2Texts.some(
          (h2) =>
            h2.toLowerCase().includes(sectionName) ||
            (sectionH2 && h2.toLowerCase().includes(sectionH2)) ||
            sectionName.includes(h2.toLowerCase())
        ) ||
        // Also check for common aliases
        (section.id === 'tldr' && metrics.hasTLDR) ||
        (section.id === 'conclusion' && metrics.hasConclusion) ||
        (section.id === 'faqs' && metrics.hasFAQ) ||
        (section.id === 'recommendation' && metrics.hasConclusion) ||
        (section.id === 'verdict' && metrics.hasConclusion);

      if (!hasSection) {
        missingSections.push(section.name);
      }
    }

    checks.push({
      id: 'template_sections',
      name: 'Required Sections',
      category: 'structure',
      passed: missingSections.length === 0,
      message:
        missingSections.length === 0
          ? `All required sections for ${blogType} blog present`
          : `Missing sections: ${missingSections.join(', ')}`,
      importance: 'important',
      details:
        missingSections.length > 0
          ? `Add missing sections for ${blogType} blog: ${missingSections.join(', ')}`
          : undefined,
    });
  }

  return checks;
}

function runQualityChecks(
  content: string,
  metrics: ContentMetrics,
  keyword: string,
  title: string
): ContentCheck[] {
  const checks: ContentCheck[] = [];
  const lowerContent = content.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  // Q1: Keyword presence in content
  const keywordCount = (lowerContent.match(new RegExp(escapeRegex(lowerKeyword), 'g')) || []).length;
  checks.push({
    id: 'keyword_present',
    name: 'Keyword Usage',
    category: 'quality',
    passed: keywordCount >= 3,
    message: `Keyword "${keyword}" appears ${keywordCount} times`,
    importance: 'critical',
    details: keywordCount < 3 ? `Use keyword "${keyword}" at least 3 times in the content` : undefined,
  });

  // Q2: No placeholder text
  const placeholderPatterns = [
    /\[insert.*?\]/i,
    /\[your.*?\]/i,
    /\[add.*?\]/i,
    /\[todo\]/i,
    /\[placeholder\]/i,
    /lorem ipsum/i,
    /\{keyword\}/i,
    /\{topic\}/i,
    /\{tool\}/i,
    /\{year\}/i,
    /\[SECTION\]/i,
    /\[LINK\]/i,
    /\[URL\]/i,
    /\[IMAGE\]/i,
  ];
  const foundPlaceholders = placeholderPatterns.filter((p) => p.test(content));
  checks.push({
    id: 'no_placeholders',
    name: 'No Placeholder Text',
    category: 'quality',
    passed: foundPlaceholders.length === 0,
    message:
      foundPlaceholders.length === 0
        ? 'No placeholder text detected'
        : `Found ${foundPlaceholders.length} placeholder pattern(s)`,
    importance: 'critical',
    details:
      foundPlaceholders.length > 0
        ? 'Replace all placeholder text like [insert...], {keyword}, etc. with actual content'
        : undefined,
  });

  // Q3: No repetitive content (same paragraph repeated)
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 50);
  const seen = new Set<string>();
  let duplicateParagraphs = 0;
  for (const p of paragraphs) {
    const normalized = p.trim().toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(normalized)) {
      duplicateParagraphs++;
    }
    seen.add(normalized);
  }
  checks.push({
    id: 'no_repetition',
    name: 'No Repeated Content',
    category: 'quality',
    passed: duplicateParagraphs === 0,
    message:
      duplicateParagraphs === 0
        ? 'No repeated paragraphs detected'
        : `${duplicateParagraphs} duplicate paragraph(s) found`,
    importance: 'critical',
    details: duplicateParagraphs > 0 ? 'Remove or rewrite duplicate paragraphs' : undefined,
  });

  // Q4: Has lists or structured content (not just walls of text)
  const hasStructuredContent = metrics.listCount >= 3 || metrics.tableCount > 0 || metrics.codeBlockCount > 0;
  checks.push({
    id: 'structured_content',
    name: 'Structured Content',
    category: 'quality',
    passed: hasStructuredContent,
    message: hasStructuredContent
      ? `Content uses lists (${metrics.listCount}), tables (${metrics.tableCount}), code blocks (${Math.floor(metrics.codeBlockCount)})`
      : 'Content lacks structured elements (lists, tables, code blocks)',
    importance: 'important',
    details: hasStructuredContent ? undefined : 'Add bullet points, numbered lists, or tables to break up text',
  });

  // Q5: Short sections check
  const maxShortSections = 2;
  checks.push({
    id: 'no_thin_sections',
    name: 'Section Depth',
    category: 'quality',
    passed: metrics.shortSections.length <= maxShortSections,
    message:
      metrics.shortSections.length <= maxShortSections
        ? 'All sections have adequate depth'
        : `${metrics.shortSections.length} sections are too short (<50 words)`,
    importance: 'optional',
    details:
      metrics.shortSections.length > maxShortSections
        ? `Expand thin sections: ${metrics.shortSections.slice(0, 3).join(', ')}`
        : undefined,
  });

  // Q6: No broken markdown links
  const brokenLinkPatterns = [
    /\[.*?\]\(\s*\)/g, // Empty URL
    /\[.*?\]\(undefined\)/g,
    /\[.*?\]\(null\)/g,
    /\[\s*\]\(.*?\)/g, // Empty link text
  ];
  let brokenLinks = 0;
  for (const pattern of brokenLinkPatterns) {
    const matches = content.match(pattern);
    if (matches) brokenLinks += matches.length;
  }
  checks.push({
    id: 'no_broken_links',
    name: 'No Broken Links',
    category: 'quality',
    passed: brokenLinks === 0,
    message: brokenLinks === 0 ? 'No broken links detected' : `${brokenLinks} broken link(s) found`,
    importance: 'important',
    details: brokenLinks > 0 ? 'Fix or remove broken markdown links (empty URLs or link text)' : undefined,
  });

  return checks;
}

function runReadabilityChecks(content: string, metrics: ContentMetrics): ContentCheck[] {
  const checks: ContentCheck[] = [];

  // R1: Average sentence length
  const idealSentenceLength = metrics.avgSentenceLength >= 10 && metrics.avgSentenceLength <= 25;
  checks.push({
    id: 'sentence_length',
    name: 'Sentence Length',
    category: 'readability',
    passed: idealSentenceLength,
    message: `Average sentence: ${Math.round(metrics.avgSentenceLength)} words (ideal: 10-25)`,
    importance: 'optional',
    details: !idealSentenceLength
      ? metrics.avgSentenceLength > 25
        ? 'Break up long sentences for better readability'
        : 'Sentences may be too short - add more detail'
      : undefined,
  });

  // R2: No wall-of-text paragraphs
  checks.push({
    id: 'no_long_paragraphs',
    name: 'Paragraph Length',
    category: 'readability',
    passed: metrics.longParagraphs === 0,
    message:
      metrics.longParagraphs === 0
        ? 'No overly long paragraphs'
        : `${metrics.longParagraphs} paragraph(s) exceed 200 words`,
    importance: 'important',
    details: metrics.longParagraphs > 0 ? 'Break up paragraphs longer than 200 words' : undefined,
  });

  // R3: Uses formatting variety (bold, italic, etc.)
  const hasBold = /\*\*[^*]+\*\*/.test(content);
  const hasItalic = /(?<!\*)\*[^*]+\*(?!\*)/.test(content) || /_[^_]+_/.test(content);
  const formattingVariety = hasBold || hasItalic;
  checks.push({
    id: 'formatting_variety',
    name: 'Text Formatting',
    category: 'readability',
    passed: formattingVariety,
    message: formattingVariety
      ? 'Content uses bold/italic formatting for emphasis'
      : 'Content lacks text formatting (bold, italic)',
    importance: 'optional',
    details: formattingVariety ? undefined : 'Use **bold** or *italic* to emphasize key points',
  });

  // R4: Flesch-Kincaid approximation (on plain text, markdown stripped)
  // FK Grade Level = 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
  const syllableCount = estimateSyllables(metrics.plainText);
  const wordsCount = Math.max(metrics.wordCount, 1);
  const sentCount = Math.max(metrics.sentenceCount, 1);
  const fkGradeRaw = 0.39 * (wordsCount / sentCount) + 11.8 * (syllableCount / wordsCount) - 15.59;
  const fkGrade = Math.round(fkGradeRaw);
  const fkOk = fkGrade >= 6 && fkGrade <= 14;
  checks.push({
    id: 'readability_score',
    name: 'Reading Level',
    category: 'readability',
    passed: fkOk,
    message: `Reading level: grade ${fkGrade} (ideal: 6-14)`,
    importance: 'optional',
    details: !fkOk
      ? fkGrade > 14
        ? 'Content may be too complex - use simpler language'
        : 'Content may be too simple - add more depth'
      : undefined,
  });

  return checks;
}

function runCompletenessChecks(
  content: string,
  metrics: ContentMetrics,
  template: ReturnType<typeof getTemplateOrNull>,
  blogType: BlogType
): ContentCheck[] {
  const checks: ContentCheck[] = [];

  // C1: Minimum word count
  const minWords = 800;
  checks.push({
    id: 'min_word_count',
    name: 'Content Length',
    category: 'completeness',
    passed: metrics.wordCount >= minWords,
    message: `${metrics.wordCount} words (minimum: ${minWords})`,
    importance: 'critical',
    details: metrics.wordCount < minWords ? `Add more content - currently ${metrics.wordCount} words, need at least ${minWords}` : undefined,
  });

  // C2: Has TL;DR / Quick Summary
  checks.push({
    id: 'has_tldr',
    name: 'TL;DR Section',
    category: 'completeness',
    passed: metrics.hasTLDR,
    message: metrics.hasTLDR ? 'TL;DR / Quick Summary present' : 'Missing TL;DR section',
    importance: 'important',
    details: metrics.hasTLDR ? undefined : 'Add a TL;DR or Quick Summary section for skimmers',
  });

  // C3: Has FAQ section
  checks.push({
    id: 'has_faq',
    name: 'FAQ Section',
    category: 'completeness',
    passed: metrics.hasFAQ,
    message: metrics.hasFAQ ? `FAQ section present (${metrics.faqCount} questions)` : 'Missing FAQ section',
    importance: 'important',
    details: metrics.hasFAQ ? undefined : 'Add a Frequently Asked Questions section with 5+ questions',
  });

  // C4: FAQ has enough questions
  if (metrics.hasFAQ) {
    const minFAQ = 5;
    checks.push({
      id: 'faq_count',
      name: 'FAQ Question Count',
      category: 'completeness',
      passed: metrics.faqCount >= minFAQ,
      message: `${metrics.faqCount} FAQ questions (recommended: ${minFAQ}+)`,
      importance: 'optional',
      details: metrics.faqCount < minFAQ ? `Add more FAQ questions - currently ${metrics.faqCount}, target ${minFAQ}+` : undefined,
    });
  }

  // C5: Has conclusion/verdict
  checks.push({
    id: 'has_conclusion',
    name: 'Conclusion Section',
    category: 'completeness',
    passed: metrics.hasConclusion,
    message: metrics.hasConclusion ? 'Conclusion section present' : 'Missing conclusion section',
    importance: 'important',
    details: metrics.hasConclusion ? undefined : 'Add a Conclusion or Final Thoughts section',
  });

  // C6: Has CTA
  checks.push({
    id: 'has_cta',
    name: 'Call to Action',
    category: 'completeness',
    passed: metrics.hasCTA,
    message: metrics.hasCTA ? 'Call to action present' : 'No clear call to action found',
    importance: 'optional',
    details: metrics.hasCTA ? undefined : 'Add a clear call to action (e.g., "Get started", "Try it now")',
  });

  // C7: Has images
  checks.push({
    id: 'has_images',
    name: 'Images Present',
    category: 'completeness',
    passed: metrics.imageCount >= 1,
    message: `${metrics.imageCount} image(s) in content`,
    importance: 'optional',
    details: metrics.imageCount < 1 ? 'Add at least one image to make the content more engaging' : undefined,
  });

  return checks;
}

function calculateScore(checks: ContentCheck[]): number {
  const byImportance = {
    critical: checks.filter((c) => c.importance === 'critical'),
    important: checks.filter((c) => c.importance === 'important'),
    optional: checks.filter((c) => c.importance === 'optional'),
  };

  const criticalScore =
    byImportance.critical.length > 0
      ? byImportance.critical.filter((c) => c.passed).length / byImportance.critical.length
      : 1;
  const importantScore =
    byImportance.important.length > 0
      ? byImportance.important.filter((c) => c.passed).length / byImportance.important.length
      : 1;
  const optionalScore =
    byImportance.optional.length > 0
      ? byImportance.optional.filter((c) => c.passed).length / byImportance.optional.length
      : 1;

  // Weighted: critical 50%, important 35%, optional 15%
  return Math.round((criticalScore * 0.5 + importantScore * 0.35 + optionalScore * 0.15) * 100);
}

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function generateSummary(
  score: number,
  grade: string,
  checks: ContentCheck[],
  metrics: ContentMetrics
): string {
  const failed = checks.filter((c) => !c.passed);
  const criticalFailed = failed.filter((c) => c.importance === 'critical');

  if (criticalFailed.length > 0) {
    return `Content has ${criticalFailed.length} critical issue(s) that need attention. ${metrics.wordCount} words, ${metrics.h2Count} sections.`;
  }

  if (score >= 90) {
    return `Content is well-structured and comprehensive. ${metrics.wordCount} words, ${metrics.h2Count} sections.`;
  }

  if (score >= 75) {
    return `Content is good with ${failed.length} minor improvement(s) suggested. ${metrics.wordCount} words, ${metrics.h2Count} sections.`;
  }

  return `Content needs improvement in ${failed.length} area(s). ${metrics.wordCount} words, ${metrics.h2Count} sections.`;
}

/**
 * Simple syllable estimation for readability scoring
 */
function estimateSyllables(text: string): number {
  const words = text
    .replace(/[^a-zA-Z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  let total = 0;
  for (const word of words) {
    total += countSyllables(word);
  }
  return total;
}

function countSyllables(word: string): number {
  const w = word.toLowerCase();
  if (w.length <= 3) return 1;

  let count = 0;
  const vowels = 'aeiouy';
  let prevVowel = false;

  for (let i = 0; i < w.length; i++) {
    const isVowel = vowels.includes(w[i]);
    if (isVowel && !prevVowel) {
      count++;
    }
    prevVowel = isVowel;
  }

  // Adjust for silent e
  if (w.endsWith('e') && count > 1) {
    count--;
  }
  // Ensure at least 1
  return Math.max(count, 1);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
