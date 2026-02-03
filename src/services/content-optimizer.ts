import { openai } from '@/lib/openai';
import { BlogType } from '@/types';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { findRelevantLinks } from '@/lib/platform-links';

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

=== CRITICAL: READ THE FAILED CHECKS CAREFULLY ===

Each failed check tells you EXACTLY what to fix. You MUST address each one specifically:

## FAILED CHECK: "direct_answer_under_h2" (Only X/Y sections start with a direct answer)
This means: The first paragraph after each ## H2 heading must be 20-80 words that DIRECTLY answer the heading.

HOW TO FIX:
- Go through EVERY ## H2 section
- Ensure the FIRST paragraph right after the H2 is a focused 20-80 word answer
- If the current first paragraph is too long (>80 words), SPLIT it
- If too short (<20 words), expand it to give a complete direct answer
- Skip ## TL;DR, ## FAQ, ## Table of Contents (these don't need fixing)

BEFORE (BAD - first paragraph is 150+ words):
## How to Use Veo 3
Getting started with Veo 3 requires understanding the platform's interface, which includes multiple tabs for different features. The main dashboard shows your recent projects, templates, and account settings. You'll also find the video generation tools in the sidebar. Before creating your first video, you should familiarize yourself with the various options available, including aspect ratios, duration settings, and style presets. The platform supports multiple output formats and quality levels...

AFTER (GOOD - first paragraph is 40-60 words):
## How to Use Veo 3
To use Veo 3, start by accessing the main dashboard where you'll find the video generation interface. Enter your text prompt, select your preferred style, and click generate. The AI will process your request in 2-3 minutes, after which you can preview, edit, and export your video.

The platform offers multiple tabs for different features including templates, recent projects, and account settings...

## FAILED CHECK: "concise_paragraphs" (X paragraph(s) exceed 100 words)
This means: You have paragraphs with more than 100 words. LLMs struggle with long paragraphs.

HOW TO FIX:
- Find ALL paragraphs longer than 100 words
- SPLIT them into 2-3 shorter paragraphs (40-80 words each)
- Add a line break between each new paragraph

## FAILED CHECK: "keyword_density" (X% - recommended: 0.5-2.5%)
This means: The keyword appears too frequently or not enough.

HOW TO FIX if too HIGH:
- Replace some keyword mentions with synonyms, pronouns ("it", "this tool"), or related terms
- Keep keyword in: title, first paragraph, H2s, conclusion
- Remove redundant keyword stuffing

## FAILED CHECK: "Missing TL;DR section"
HOW TO FIX:
- Add "## TL;DR" or "## Quick Summary" section near the top (after intro)
- Include 3-5 bullet points with key takeaways
- Each bullet should be 10-20 words

## FAILED CHECK: "No data table found"
HOW TO FIX:
- Add a relevant markdown table with at least 3 columns and 3 rows
- Use: | Column 1 | Column 2 | Column 3 |
- Examples: pricing comparison, feature comparison, pros/cons

## FAILED CHECK: "FAQ has X questions (need 5+)" or "No FAQ section found"
HOW TO FIX:
- Add "## FAQ" or "## Frequently Asked Questions" section
- Add 5-10 questions as ### H3 headings
- Each answer should be 1-3 sentences (20-60 words)

=== OUTPUT FORMAT ===
Return the COMPLETE improved markdown content first, then on a new line write:
---CHANGES---
Then list each specific change with a dash (-):

---CHANGES---
- Split 4 long paragraphs into shorter 40-60 word paragraphs
- Rewrote first paragraph of 5 H2 sections to be 40-60 word direct answers
- Added ## TL;DR section with 5 bullet points
- Reduced keyword density from 4.5% to 2% by using synonyms`;

function buildUserPrompt(input: OptimizeContentInput): string {
  const { content, keyword, title, blogType, metaDescription, failedChecks, suggestions, userNotes } = input;

  const failedChecksText = failedChecks.length > 0
    ? failedChecks.map(c => `- [${c.importance.toUpperCase()}] ${c.name} (id: ${c.id}): ${c.message}`).join('\n')
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

FAILED CHECKS TO FIX (MUST ADDRESS EACH ONE):
${failedChecksText}

ADDITIONAL SUGGESTIONS:
${suggestionsText}`;

  if (userNotes && userNotes.trim()) {
    prompt += `\n\nADDITIONAL USER INSTRUCTIONS:\n${userNotes.trim()}`;
  }

  prompt += `\n\nIMPORTANT: Improve the content above to fix the identified issues. Make targeted improvements while preserving the overall structure and writing style. Remember to output the improved markdown first, then ---CHANGES--- separator, then the bullet list of changes.`;

  return prompt;
}

async function appendPlatformContext(prompt: string, keyword: string, blogType: string): Promise<string> {
  try {
    const brandProfile = await prisma.brandProfile.findFirst({
      where: { isDefault: true },
      include: { tools: { orderBy: { priority: 'asc' } } },
    });

    if (!brandProfile || brandProfile.tools.length === 0) return prompt;

    const matches = findRelevantLinks(
      keyword,
      blogType,
      brandProfile.tools.map(t => ({
        id: t.id,
        name: t.name,
        path: t.path,
        category: t.category,
        keywords: t.keywords,
        description: t.description,
        priority: t.priority,
      })),
      brandProfile.domain,
      10
    );

    if (matches.length === 0) return prompt;

    const urlLines = matches
      .map(m => `- ${m.tool.name}: ${m.fullUrl}`)
      .join('\n');

    return prompt + `\n\nPLATFORM URLS (use these for adding internal/platform links):\nBrand: ${brandProfile.name} (${brandProfile.domain})\n${urlLines}`;
  } catch {
    return prompt;
  }
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

  let userPrompt = buildUserPrompt(input);

  // Append platform URLs if link-related checks failed
  const hasLinkIssues = input.failedChecks.some(c =>
    c.id === 'internal_links' || c.id === 'platform_links'
  );
  if (hasLinkIssues) {
    userPrompt = await appendPlatformContext(userPrompt, input.keyword, input.blogType);
  }

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
