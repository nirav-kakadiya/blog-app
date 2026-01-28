import { openai } from '@/lib/openai';
import { getTemplate } from '@/lib/templates';
import { BlogType } from '@/types';
import { logger } from '@/lib/logger';

export interface ContentGeneratorInput {
  keyword: string;
  blogType: BlogType;
  title: string;
}

export interface ContentGeneratorOutput {
  content: string;
  metaDescription: string;
  sections: string[];
}

export async function generateContent(input: ContentGeneratorInput): Promise<ContentGeneratorOutput> {
  const { keyword, blogType, title } = input;
  const template = getTemplate(blogType);

  logger.info('Generating content', { keyword, blogType, title });

  const requiredSections = template.sections.required
    .map((s) => `- ${s.h2 || s.name}: ${s.description}`)
    .join('\n');

  const prompt = `Write a comprehensive, SEO-optimized blog post.

Title: ${title}
Primary Keyword: ${keyword}
Blog Type: ${template.name}

REQUIRED SECTIONS (in order):
${requiredSections}

SEO REQUIREMENTS:
- Include keyword "${keyword}" in the first 100 words
- Include keyword in at least one H2 heading
- Use H2 (##) for main sections, H3 (###) for subsections
- Write 1500-2500 words total
- Make content scannable with bullet points and short paragraphs

STRUCTURE:
1. Start with a 2-4 sentence intro (problem + solution + what they'll learn)
2. Add a TL;DR section with 3-5 bullet points
3. Write each required section with proper H2 headings
4. Include 5-10 relevant FAQs at the end
5. End with a clear CTA

FORMAT:
- Write in Markdown
- Use proper heading hierarchy (## for H2, ### for H3)
- Include code blocks where relevant
- Add bullet points for lists

Write the complete blog post now:`;

  try {
    const response = await openai.generate({
      prompt,
      model: 'gpt-4o-mini',
      maxTokens: 8000,
      temperature: 0.7,
    });

    const content = response.content;

    // Generate meta description
    const metaPrompt = `Write a 150-character max meta description for this blog post:
Title: ${title}
Keyword: ${keyword}

Return ONLY the meta description text, nothing else.`;

    const metaResponse = await openai.generate({
      prompt: metaPrompt,
      model: 'gpt-4o-mini',
      maxTokens: 100,
    });

    const metaDescription = metaResponse.content.trim().slice(0, 155);

    logger.info('Content generated successfully', {
      contentLength: content.length,
      metaDescriptionLength: metaDescription.length,
    });

    return {
      content,
      metaDescription,
      sections: template.sections.required.map((s) => s.id),
    };
  } catch (error) {
    logger.error('Content generation failed', { error: String(error) });
    throw error;
  }
}
