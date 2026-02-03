import { BlogType } from '@/types';
import { logger } from '@/lib/logger';

export interface AEOAnalysis {
  score: number;
  checks: AEOCheck[];
  suggestions: string[];
}

export interface AEOCheck {
  id: string;
  name: string;
  passed: boolean;
  message: string;
  importance: 'critical' | 'important' | 'optional';
}

/**
 * Analyze content for Answer Engine Optimization (AEO).
 * Checks how well content is structured for LLM/AI search citations
 * (ChatGPT, Perplexity, Gemini, Copilot).
 */
export function analyzeAEO(
  content: string,
  keyword: string,
  title: string,
  blogType: BlogType
): AEOAnalysis {
  const checks: AEOCheck[] = [];
  const suggestions: string[] = [];

  const lowerContent = content.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  // === CRITICAL CHECKS (50%) ===

  // 1. Direct answer under H2
  const directAnswerResult = checkDirectAnswerUnderH2(content);
  checks.push({
    id: 'direct_answer_under_h2',
    name: 'Direct Answer Under H2',
    passed: directAnswerResult.passed,
    message: directAnswerResult.message,
    importance: 'critical',
  });
  if (!directAnswerResult.passed) {
    suggestions.push(directAnswerResult.suggestion);
  }

  // 2. Has TL;DR
  const hasTldr =
    lowerContent.includes('## tl;dr') ||
    lowerContent.includes('## quick summary') ||
    lowerContent.includes('## quick verdict') ||
    lowerContent.includes('## key takeaways') ||
    lowerContent.includes('## quick fix');
  checks.push({
    id: 'has_tldr',
    name: 'TL;DR Section',
    passed: hasTldr,
    message: hasTldr
      ? 'TL;DR / Quick Summary section present'
      : 'Missing TL;DR section — LLMs extract this for quick answers',
    importance: 'critical',
  });
  if (!hasTldr) {
    suggestions.push('Add a TL;DR or Quick Summary section with 3-5 bullet points near the top');
  }

  // 3. FAQ with direct answers
  const faqResult = checkFAQDirectAnswers(content);
  checks.push({
    id: 'faq_direct_answers',
    name: 'FAQ Direct Answers',
    passed: faqResult.passed,
    message: faqResult.message,
    importance: 'critical',
  });
  if (!faqResult.passed) {
    suggestions.push(faqResult.suggestion);
  }

  // === IMPORTANT CHECKS (35%) ===

  // 4. Snippable sentences
  const snippableResult = checkSnippableSentences(content, keyword);
  checks.push({
    id: 'snippable_sentences',
    name: 'Snippable Sentences',
    passed: snippableResult.passed,
    message: snippableResult.message,
    importance: 'important',
  });
  if (!snippableResult.passed) {
    suggestions.push(snippableResult.suggestion);
  }

  // 5. Table presence
  const tableCount = (content.match(/^\|.+\|$/gm) || []).length;
  const hasTable = tableCount >= 3; // header + separator + at least 1 data row
  checks.push({
    id: 'table_presence',
    name: 'Data Table',
    passed: hasTable,
    message: hasTable
      ? 'Content includes structured table(s)'
      : 'No data table found — tables get 2.5x more AI citations',
    importance: 'important',
  });
  if (!hasTable) {
    suggestions.push('Add at least one comparison or data table — LLMs cite tables 2.5x more than prose');
  }

  // 6. List density
  const wordCount = content.split(/\s+/).length;
  const listItems =
    (content.match(/^\s*[-*]\s+/gm) || []).length +
    (content.match(/^\s*\d+\.\s+/gm) || []).length;
  const expectedLists = Math.max(1, Math.floor(wordCount / 500));
  const hasEnoughLists = listItems >= expectedLists * 3; // ~3 items per list
  checks.push({
    id: 'list_density',
    name: 'List Usage',
    passed: hasEnoughLists,
    message: hasEnoughLists
      ? `${listItems} list items (good density for ${wordCount} words)`
      : `${listItems} list items for ${wordCount} words — need more structured lists`,
    importance: 'important',
  });
  if (!hasEnoughLists) {
    suggestions.push('Add more bullet/numbered lists — aim for at least 1 list per 500 words');
  }

  // 7. Concise paragraphs
  const paragraphs = content
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0 && !p.trim().startsWith('#') && !p.trim().startsWith('|') && !p.trim().startsWith('!'));
  const longParagraphs = paragraphs.filter((p) => p.split(/\s+/).length > 100);
  const conciseRatio = paragraphs.length > 0 ? (paragraphs.length - longParagraphs.length) / paragraphs.length : 1;
  const isConcise = conciseRatio >= 0.9;
  checks.push({
    id: 'concise_paragraphs',
    name: 'Concise Paragraphs',
    passed: isConcise,
    message: isConcise
      ? `${Math.round(conciseRatio * 100)}% of paragraphs are concise (<100 words)`
      : `${longParagraphs.length} paragraph(s) exceed 100 words — LLMs parse shorter paragraphs better`,
    importance: 'important',
  });
  if (!isConcise) {
    suggestions.push('Break up long paragraphs — keep under 100 words each for better LLM extraction');
  }

  // 8. Entity clarity
  const first200Words = content.split(/\s+/).slice(0, 200).join(' ');
  const definitionPatterns = [
    new RegExp(`${escapeRegex(lowerKeyword)}\\s+(is|are|refers to|means|involves)\\b`, 'i'),
    new RegExp(`(what is|defined as|known as)\\s+.*${escapeRegex(lowerKeyword)}`, 'i'),
  ];
  const hasEntityDefinition = definitionPatterns.some((p) => p.test(first200Words));
  checks.push({
    id: 'entity_clarity',
    name: 'Entity Clarity',
    passed: hasEntityDefinition,
    message: hasEntityDefinition
      ? 'Primary entity is clearly defined early in the content'
      : `"${keyword}" is not defined in the first 200 words — LLMs need clear entity definitions`,
    importance: 'important',
  });
  if (!hasEntityDefinition) {
    suggestions.push(
      `Add a definitional sentence like "${keyword} is/are..." within the first 200 words`
    );
  }

  // === OPTIONAL CHECKS (15%) ===

  // 9. Question headings
  const h2h3Matches = content.match(/^#{2,3}\s+.+$/gm) || [];
  const questionHeadings = h2h3Matches.filter((h) =>
    /\?\s*$/.test(h) ||
    /^#{2,3}\s+(what|how|why|when|where|which|can|does|is|are|should|do)\b/i.test(h)
  );
  const questionRatio = h2h3Matches.length > 0 ? questionHeadings.length / h2h3Matches.length : 0;
  const hasEnoughQuestions = questionRatio >= 0.3;
  checks.push({
    id: 'question_headings',
    name: 'Question-Based Headings',
    passed: hasEnoughQuestions,
    message: hasEnoughQuestions
      ? `${questionHeadings.length}/${h2h3Matches.length} headings are questions (${Math.round(questionRatio * 100)}%)`
      : `Only ${questionHeadings.length}/${h2h3Matches.length} headings are questions — LLMs match question-answer pairs`,
    importance: 'optional',
  });
  if (!hasEnoughQuestions) {
    suggestions.push('Rephrase more H2/H3 headings as questions (e.g., "What is X?", "How does X work?") — aim for 30%+');
  }

  // 10. Citation-worthy claims
  const statPatterns = [
    /\d+%/g,
    /\$[\d,.]+/g,
    /\d+x\s/gi,
    /\d+\s*(million|billion|thousand|times|percent)/gi,
    /(?:in|since|by)\s+20\d{2}/gi,
    /\d+\.\d+/g,
    /\d+\s*(users|downloads|companies|people|customers)/gi,
  ];
  let statCount = 0;
  for (const pattern of statPatterns) {
    const matches = content.match(pattern);
    if (matches) statCount += matches.length;
  }
  // Deduplicate rough count
  statCount = Math.min(statCount, Math.ceil(statCount * 0.7));
  const hasEnoughStats = statCount >= 5;
  checks.push({
    id: 'citation_worthy_claims',
    name: 'Citation-Worthy Data',
    passed: hasEnoughStats,
    message: hasEnoughStats
      ? `~${statCount} specific data points found — good for AI citations`
      : `Only ~${statCount} data points — LLMs prefer content with specific statistics`,
    importance: 'optional',
  });
  if (!hasEnoughStats) {
    suggestions.push('Add more specific numbers, statistics, and data points (aim for 5+) — LLMs cite factual claims');
  }

  // 11. No-fluff intro
  const introEnd = content.indexOf('\n## ');
  const introText = introEnd > 0 ? content.slice(0, introEnd) : content.slice(0, 500);
  const introWords = introText.split(/\s+/).filter((w) => w.length > 0).length;
  // Check if keyword appears within first 100 words of actual text (not headings)
  const introPlainText = introText.replace(/^#.*$/gm, '').replace(/!\[.*?\]\(.*?\)/g, '').trim();
  const introPlainWords = introPlainText.split(/\s+/).filter((w) => w.length > 0);
  const hasNoFluffIntro = introPlainWords.length <= 120 && introPlainWords.length > 0;
  checks.push({
    id: 'no_fluff_intro',
    name: 'No-Fluff Introduction',
    passed: hasNoFluffIntro,
    message: hasNoFluffIntro
      ? `Introduction is ${introPlainWords.length} words — concise and direct`
      : `Introduction is ${introPlainWords.length} words — trim to under 120 words before first H2`,
    importance: 'optional',
  });
  if (!hasNoFluffIntro && introPlainWords.length > 120) {
    suggestions.push('Shorten introduction to under 120 words — get to the main content quickly');
  }

  // 12. Structured conclusion
  const conclusionMatch = content.match(
    /## (?:conclusion|final (?:thoughts|verdict)|our recommendation|my recommendation)([\s\S]*?)(?=\n## |\n*$)/i
  );
  let hasStructuredConclusion = false;
  if (conclusionMatch) {
    const conclusionText = conclusionMatch[1];
    // Check for a list in conclusion
    const hasList =
      /^\s*[-*]\s+/m.test(conclusionText) ||
      /^\s*\d+\.\s+/m.test(conclusionText);
    hasStructuredConclusion = hasList;
  }
  checks.push({
    id: 'structured_conclusion',
    name: 'Structured Conclusion',
    passed: hasStructuredConclusion,
    message: hasStructuredConclusion
      ? 'Conclusion uses a structured recap (list/bullets)'
      : 'Conclusion is prose-only — add a numbered recap list for better LLM extraction',
    importance: 'optional',
  });
  if (!hasStructuredConclusion) {
    suggestions.push('Add a numbered recap list in your conclusion — LLMs extract structured summaries better than prose');
  }

  // Calculate score
  const criticalChecks = checks.filter((c) => c.importance === 'critical');
  const importantChecks = checks.filter((c) => c.importance === 'important');
  const optionalChecks = checks.filter((c) => c.importance === 'optional');

  const criticalScore = criticalChecks.length > 0
    ? criticalChecks.filter((c) => c.passed).length / criticalChecks.length : 1;
  const importantScore = importantChecks.length > 0
    ? importantChecks.filter((c) => c.passed).length / importantChecks.length : 1;
  const optionalScore = optionalChecks.length > 0
    ? optionalChecks.filter((c) => c.passed).length / optionalChecks.length : 1;

  const score = Math.round((criticalScore * 0.5 + importantScore * 0.35 + optionalScore * 0.15) * 100);

  // Log which checks failed for debugging
  const failedChecks = checks.filter(c => !c.passed);
  if (failedChecks.length > 0) {
    logger.info('AEO failed checks', {
      failedIds: failedChecks.map(c => c.id),
      failedDetails: failedChecks.map(c => `${c.id} (${c.importance}): ${c.message}`),
    });
  }

  logger.info('AEO analysis complete', {
    score,
    passedChecks: checks.filter((c) => c.passed).length,
    totalChecks: checks.length,
  });

  return { score, checks, suggestions };
}

/**
 * Check if H2 sections start with a direct answer (40-60 words)
 */
function checkDirectAnswerUnderH2(content: string): { passed: boolean; message: string; suggestion: string } {
  const sections = content.split(/^## /gm).slice(1); // Skip content before first H2
  if (sections.length === 0) {
    return {
      passed: false,
      message: 'No H2 sections found',
      suggestion: 'Add H2 sections with direct answers in the first 1-2 sentences',
    };
  }

  // Skip TOC, TL;DR (these are short by design)
  const skipPatterns = /^(table of contents|tl;dr|quick summary|quick verdict|key takeaways|faq|frequently asked)/i;
  const contentSections = sections.filter((s) => !skipPatterns.test(s.trim()));

  let directAnswerCount = 0;
  let totalChecked = 0;

  for (const section of contentSections) {
    const lines = section.split('\n');
    // Get first paragraph text after heading
    const textLines: string[] = [];
    let foundText = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0 && foundText) break;
      if (line.length > 0 && !line.startsWith('#') && !line.startsWith('|') && !line.startsWith('!') && !line.startsWith('-') && !line.startsWith('*')) {
        textLines.push(line);
        foundText = true;
      }
      if (foundText && (line.startsWith('#') || line.startsWith('|'))) break;
    }

    if (textLines.length === 0) continue;

    totalChecked++;
    const firstParagraph = textLines.join(' ');
    const wordCount = firstParagraph.split(/\s+/).length;

    // Good: first paragraph is 20-80 words (direct answer range)
    if (wordCount >= 20 && wordCount <= 80) {
      directAnswerCount++;
    }
  }

  if (totalChecked === 0) {
    return { passed: true, message: 'No content sections to check', suggestion: '' };
  }

  const ratio = directAnswerCount / totalChecked;
  const passed = ratio >= 0.6;

  return {
    passed,
    message: passed
      ? `${directAnswerCount}/${totalChecked} sections start with a direct answer`
      : `Only ${directAnswerCount}/${totalChecked} sections start with a direct answer (need 60%+)`,
    suggestion: 'Start each H2 section with a 40-60 word direct answer before expanding with details',
  };
}

/**
 * Check if FAQ section has direct, concise answers
 */
function checkFAQDirectAnswers(content: string): { passed: boolean; message: string; suggestion: string } {
  const faqMatch = content.match(/## (?:FAQ|Frequently Asked)[\s\S]*?(?=\n## [^#]|\n*$)/i);
  if (!faqMatch) {
    return {
      passed: false,
      message: 'No FAQ section found — LLMs directly extract FAQ question-answer pairs',
      suggestion: 'Add a FAQ section with 5-10 questions and 1-2 sentence direct answers',
    };
  }

  const faqContent = faqMatch[0];
  const questions = faqContent.match(/### .+/g) || [];

  if (questions.length < 5) {
    return {
      passed: false,
      message: `FAQ has ${questions.length} questions (need 5+)`,
      suggestion: 'Add more FAQ questions — aim for 5-10 with direct 1-2 sentence answers',
    };
  }

  // Check answer conciseness by looking at text between H3s
  const h3Sections = faqContent.split(/### /).slice(1);
  let conciseAnswers = 0;

  for (const section of h3Sections) {
    const lines = section.split('\n').slice(1); // Skip heading line
    const answerText = lines
      .filter((l) => l.trim().length > 0 && !l.trim().startsWith('#'))
      .join(' ')
      .trim();
    const answerWords = answerText.split(/\s+/).length;

    // Good FAQ answer: 10-60 words (1-2 sentences)
    if (answerWords >= 10 && answerWords <= 60) {
      conciseAnswers++;
    }
  }

  const ratio = questions.length > 0 ? conciseAnswers / questions.length : 0;
  const passed = ratio >= 0.6;

  return {
    passed,
    message: passed
      ? `${conciseAnswers}/${questions.length} FAQ answers are concise and direct`
      : `Only ${conciseAnswers}/${questions.length} FAQ answers are concise — answers should be 1-2 sentences`,
    suggestion: 'Make FAQ answers 1-2 sentences each — no preamble, just the direct answer',
  };
}

/**
 * Check for self-contained definitional sentences that LLMs can extract
 */
function checkSnippableSentences(content: string, keyword: string): { passed: boolean; message: string; suggestion: string } {
  const snippablePatterns = [
    /[A-Z][^.]*?\b(?:is|are|refers to|means|involves|provides|offers|enables|allows)\b[^.]*\./g,
    /[A-Z][^.]*?\b(?:defined as|known as|described as|considered)\b[^.]*\./g,
    /[A-Z][^.]*?\b(?:the (?:process|method|technique|approach|practice) of)\b[^.]*\./g,
  ];

  // Strip markdown formatting for clean text analysis
  const plainText = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#{1,6}\s+.*$/gm, '')
    .replace(/^\|.*$/gm, '');

  let snippableCount = 0;
  const seen = new Set<string>();

  for (const pattern of snippablePatterns) {
    const matches = plainText.match(pattern) || [];
    for (const match of matches) {
      const words = match.split(/\s+/).length;
      // Self-contained sentence: 8-40 words
      if (words >= 8 && words <= 40 && !seen.has(match)) {
        snippableCount++;
        seen.add(match);
      }
    }
  }

  const passed = snippableCount >= 3;

  return {
    passed,
    message: passed
      ? `${snippableCount} snippable definitional sentences found`
      : `Only ${snippableCount} snippable sentences — LLMs need self-contained definitions to cite`,
    suggestion: `Add more definitional sentences like "${keyword} is..." or "${keyword} refers to..." — at least 3 per article`,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
