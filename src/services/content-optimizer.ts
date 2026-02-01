import { openai } from '@/lib/openai';
import { BlogType } from '@/types';
import { logger } from '@/lib/logger';

interface FailedCheck {
  id: string;
  name: string;
  message: string;
  importance: string;
}

interface Suggestion {
  source: string;
  importance: string;
  message: string;
}

export interface OptimizeContentInput {
  content: string;
  keyword: string;
  title: string;
  blogType: BlogType;
  metaDescription: string;
  failedChecks: FailedCheck[];
  suggestions: Suggestion[];
  userNotes?: string;
}

export interface OptimizeContentResult {
  optimizedContent: string;
  changesSummary: string[];
}

const SYSTEM_PROMPT = `You are an expert SEO and AEO (Answer Engine Optimization) content optimizer. Your job is to improve existing blog content by fixing specific identified issues.

CRITICAL RULES:
1. Make TARGETED improvements only — do NOT rewrite from scratch
2. Preserve the author's voice, tone, and writing style
3. Maintain the existing heading hierarchy (H1 → H2 → H3)
4. Keep word count within ±15% of the original
5. Fix ONLY the issues listed in the failed checks and suggestions
6. Return valid markdown — no HTML tags, no raw placeholders like [insert], {keyword}, etc.
7. Keep all existing images, links, and code blocks intact
8. Do not add fake statistics or made-up data — if a check asks for data points, use general factual statements
9. Do not remove or rearrange existing sections unless a check specifically requires structural changes

OUTPUT FORMAT:
Return the improved markdown content first, then on a new line write exactly:
---CHANGES---
Then write a bullet list (using - prefix) of each specific change you made. Be concise and specific.

Example:
---CHANGES---
- Added TL;DR section with 4 bullet points after the introduction
- Rephrased 3 H2 headings as questions for better AEO
- Added keyword "cloud hosting" to the first paragraph
- Broke up 2 long paragraphs (>100 words) into shorter ones`;

function buildUserPrompt(input: OptimizeContentInput): string {
  const { content, keyword, title, blogType, metaDescription, failedChecks, suggestions, userNotes } = input;

  const failedChecksText = failedChecks.length > 0
    ? failedChecks.map(c => `- [${c.importance.toUpperCase()}] ${c.name}: ${c.message}`).join('\n')
    : '(none)';

  const suggestionsText = suggestions.length > 0
    ? suggestions.map(s => `- [${s.source.toUpperCase()} / ${s.importance}] ${s.message}`).join('\n')
    : '(none)';

  let prompt = `ORIGINAL CONTENT:
\`\`\`markdown
${content}
\`\`\`

METADATA:
- Title: ${title}
- Primary Keyword: ${keyword}
- Blog Type: ${blogType}
- Meta Description: ${metaDescription || '(none)'}

FAILED CHECKS TO FIX:
${failedChecksText}

SUGGESTIONS TO ADDRESS:
${suggestionsText}`;

  if (userNotes && userNotes.trim()) {
    prompt += `\n\nADDITIONAL USER INSTRUCTIONS:\n${userNotes.trim()}`;
  }

  prompt += `\n\nIMPORTANT: Improve the content above to fix the identified issues. Make targeted improvements while preserving the overall structure and writing style. Remember to output the improved markdown first, then ---CHANGES--- separator, then the bullet list of changes.`;

  return prompt;
}

function parseResponse(response: string): OptimizeContentResult {
  const separator = '---CHANGES---';
  const separatorIndex = response.lastIndexOf(separator);

  if (separatorIndex === -1) {
    // No separator found — treat entire response as content
    return {
      optimizedContent: response.trim(),
      changesSummary: ['Content was optimized (details not available)'],
    };
  }

  const optimizedContent = response.slice(0, separatorIndex).trim();
  const changesSection = response.slice(separatorIndex + separator.length).trim();

  const changesSummary = changesSection
    .split('\n')
    .map(line => line.replace(/^[-*]\s*/, '').trim())
    .filter(line => line.length > 0);

  if (changesSummary.length === 0) {
    changesSummary.push('Content was optimized');
  }

  return { optimizedContent, changesSummary };
}

export async function optimizeContent(input: OptimizeContentInput): Promise<OptimizeContentResult> {
  logger.info('Starting content optimization', {
    keyword: input.keyword,
    failedChecks: input.failedChecks.length,
    suggestions: input.suggestions.length,
    hasUserNotes: !!input.userNotes,
  });

  const userPrompt = buildUserPrompt(input);

  const response = await openai.generate({
    prompt: userPrompt,
    model: 'gpt-4o',
    maxTokens: 16000,
    temperature: 0.4,
    systemPrompt: SYSTEM_PROMPT,
  });

  if (!response.content || response.content.trim().length === 0) {
    throw new Error('Optimization produced empty content');
  }

  const result = parseResponse(response.content);

  // Strip markdown code fences if LLM wrapped the output
  if (result.optimizedContent.startsWith('```markdown')) {
    result.optimizedContent = result.optimizedContent
      .replace(/^```markdown\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
  } else if (result.optimizedContent.startsWith('```')) {
    result.optimizedContent = result.optimizedContent
      .replace(/^```\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
  }

  logger.info('Content optimization complete', {
    changesCount: result.changesSummary.length,
    originalLength: input.content.length,
    optimizedLength: result.optimizedContent.length,
  });

  return result;
}
