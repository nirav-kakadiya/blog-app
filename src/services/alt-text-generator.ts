import { openai } from '@/lib/openai';

interface AltTextContext {
  imagePrompt: string;
  keyword: string;
  blogTitle: string;
  placement: string;
  sectionTitle?: string;
}

export async function generateAltText(context: AltTextContext): Promise<string> {
  const { imagePrompt, keyword, blogTitle, placement, sectionTitle } = context;

  const systemPrompt = `You are an SEO expert who writes accessible, descriptive alt text for images.

Alt text guidelines:
- Be descriptive but concise (under 125 characters)
- Naturally include the focus keyword when relevant
- Describe what's actually in the image
- Be useful for screen reader users
- Don't start with "Image of" or "Picture of"
- Don't be keyword-stuffed`;

  const response = await openai.generate({
    model: 'gpt-4o-mini',
    systemPrompt,
    prompt: `Create SEO-friendly alt text for an image with these details:

Image prompt: "${imagePrompt}"
Focus keyword: "${keyword}"
Blog title: "${blogTitle}"
Placement: ${placement}
${sectionTitle ? `Section: ${sectionTitle}` : ''}

Return only the alt text, nothing else. Keep it under 125 characters.`,
    temperature: 0.5,
    maxTokens: 100,
  });

  const altText = response.content.trim();

  if (!altText) {
    // Fallback alt text
    return `${keyword} ${placement === 'hero' ? 'featured' : ''} illustration`;
  }

  // Ensure it's not too long
  if (altText.length > 125) {
    return altText.slice(0, 122) + '...';
  }

  return altText;
}

export async function generateBulkAltText(
  contexts: AltTextContext[]
): Promise<Map<number, string>> {
  const results = new Map<number, string>();

  // Process in parallel with rate limiting
  const batchSize = 5;
  for (let i = 0; i < contexts.length; i += batchSize) {
    const batch = contexts.slice(i, i + batchSize);
    const promises = batch.map(async (context, idx) => {
      const altText = await generateAltText(context);
      return { index: i + idx, altText };
    });

    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ index, altText }) => {
      results.set(index, altText);
    });

    // Small delay between batches to avoid rate limits
    if (i + batchSize < contexts.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

export function validateAltText(altText: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!altText || altText.trim().length === 0) {
    issues.push('Alt text is empty');
    return { valid: false, issues };
  }

  if (altText.length > 125) {
    issues.push(`Alt text is too long (${altText.length}/125 chars)`);
  }

  if (altText.toLowerCase().startsWith('image of') || altText.toLowerCase().startsWith('picture of')) {
    issues.push('Avoid starting with "Image of" or "Picture of"');
  }

  // Check for excessive keyword repetition (more than 2 times in short text)
  const words = altText.toLowerCase().split(/\s+/);
  const wordCounts = new Map<string, number>();
  words.forEach((word) => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });
  const hasRepetition = Array.from(wordCounts.values()).some((count) => count > 2);
  if (hasRepetition) {
    issues.push('Possible keyword stuffing detected');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function improveAltText(altText: string, keyword: string): string {
  let improved = altText;

  // Remove "Image of" or "Picture of" prefix
  improved = improved.replace(/^(image of|picture of|photo of)\s+/i, '');

  // Trim to 125 characters if needed
  if (improved.length > 125) {
    improved = improved.slice(0, 122) + '...';
  }

  // Ensure keyword is present if not already (only add if it fits naturally)
  if (!improved.toLowerCase().includes(keyword.toLowerCase())) {
    const withKeyword = `${keyword}: ${improved}`;
    if (withKeyword.length <= 125) {
      improved = withKeyword;
    }
  }

  return improved;
}
