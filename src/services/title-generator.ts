import { openai } from '@/lib/openai';
import { getTemplate, getTitlePatterns } from '@/lib/templates';
import { BlogType } from '@/types';
import { logger } from '@/lib/logger';

export interface TitleGeneratorInput {
  keyword: string;
  blogType: BlogType;
}

export interface TitleGeneratorOutput {
  titles: string[];
  patterns: string[];
}

export async function generateTitles(input: TitleGeneratorInput): Promise<TitleGeneratorOutput> {
  const { keyword, blogType } = input;
  const template = getTemplate(blogType);
  const patterns = getTitlePatterns(blogType);

  logger.info('Generating titles', { keyword, blogType });

  const prompt = `Generate 5 SEO-optimized titles for a ${template.name} blog about "${keyword}".

Follow these title patterns:
${patterns.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Requirements:
- Include the year 2026 where appropriate
- Keep under 60 characters when possible
- Include the primary keyword naturally
- Use power words: Ultimate, Complete, Best, How to, Guide
- Make titles compelling and click-worthy

Return ONLY a JSON object in this exact format:
{"titles": ["title1", "title2", "title3", "title4", "title5"]}`;

  try {
    const response = await openai.generateJSON<{ titles: string[] }>({
      prompt,
      model: 'gpt-4o-mini',
      temperature: 0.8,
    });

    logger.info('Titles generated successfully', { count: response.titles.length });

    return {
      titles: response.titles,
      patterns,
    };
  } catch (error) {
    logger.error('Title generation failed', { error: String(error) });

    // Fallback: generate simple titles based on patterns
    const fallbackTitles = patterns.slice(0, 5).map((pattern) =>
      pattern
        .replace('{tool}', keyword)
        .replace('{topic}', keyword)
        .replace('{action}', 'Use ' + keyword)
        .replace('{year}', '2026')
        .replace('{benefit}', 'Complete Guide')
        .replace('{number}', '50+')
        .replace('{use_case}', 'Professionals')
        .replace('{audience}', 'Beginners')
    );

    return {
      titles: fallbackTitles,
      patterns,
    };
  }
}
