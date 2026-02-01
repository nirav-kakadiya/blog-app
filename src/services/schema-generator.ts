import { BlogType } from '@/types';
import { logger } from '@/lib/logger';

export interface SchemaOutput {
  schemas: SchemaItem[];
  jsonLd: string;
}

export interface SchemaItem {
  type: string;
  data: Record<string, unknown>;
}

interface SchemaInput {
  content: string;
  keyword: string;
  title: string;
  metaDescription: string;
  blogType: BlogType;
  canonicalUrl?: string;
  images?: { url: string; altText: string }[];
  authorName?: string;
  siteName?: string;
}

/**
 * Generate Schema.org JSON-LD structured data from blog content.
 * Parses markdown deterministically (no LLM call).
 */
export function generateSchema(input: SchemaInput): SchemaOutput {
  const schemas: SchemaItem[] = [];

  const wordCount = input.content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);
  const now = new Date().toISOString();
  const author = input.authorName || 'BlogForge';
  const siteName = input.siteName || 'BlogForge';

  // 1. BlogPosting or TechArticle (always generated)
  const articleType = input.blogType === 'api' ? 'TechArticle' : 'BlogPosting';
  const articleSchema = buildArticleSchema({
    type: articleType,
    title: input.title,
    description: input.metaDescription,
    keyword: input.keyword,
    wordCount,
    readingTime,
    canonicalUrl: input.canonicalUrl,
    images: input.images,
    author,
    siteName,
    datePublished: now,
  });
  schemas.push({ type: articleType, data: articleSchema });

  // 2. FAQPage (if FAQ section exists)
  const faqPairs = extractFAQPairs(input.content);
  if (faqPairs.length > 0) {
    const faqSchema = buildFAQSchema(faqPairs);
    schemas.push({ type: 'FAQPage', data: faqSchema });
  }

  // 3. HowTo (for guide, tips, troubleshoot)
  if (['guide', 'tips', 'troubleshoot'].includes(input.blogType)) {
    const steps = extractHowToSteps(input.content);
    if (steps.length >= 2) {
      const howToSchema = buildHowToSchema(input.title, input.metaDescription, steps, input.images);
      schemas.push({ type: 'HowTo', data: howToSchema });
    }
  }

  // 4. Review (for review type)
  if (input.blogType === 'review') {
    const reviewData = extractReviewData(input.content, input.title, input.keyword);
    if (reviewData) {
      schemas.push({ type: 'Review', data: reviewData });
    }
  }

  // Combine all schemas into a single JSON-LD string
  const jsonLd = schemas.length === 1
    ? JSON.stringify(schemas[0].data, null, 2)
    : JSON.stringify(schemas.map((s) => s.data), null, 2);

  logger.info('Schema generated', {
    types: schemas.map((s) => s.type),
    faqCount: faqPairs.length,
  });

  return { schemas, jsonLd };
}

function buildArticleSchema(opts: {
  type: string;
  title: string;
  description: string;
  keyword: string;
  wordCount: number;
  readingTime: number;
  canonicalUrl?: string;
  images?: { url: string; altText: string }[];
  author: string;
  siteName: string;
  datePublished: string;
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': opts.type,
    headline: opts.title,
    description: opts.description,
    keywords: opts.keyword,
    wordCount: opts.wordCount,
    timeRequired: `PT${opts.readingTime}M`,
    author: {
      '@type': 'Organization',
      name: opts.author,
    },
    publisher: {
      '@type': 'Organization',
      name: opts.siteName,
    },
    datePublished: opts.datePublished,
    dateModified: opts.datePublished,
    inLanguage: 'en',
  };

  if (opts.canonicalUrl) {
    schema.url = opts.canonicalUrl;
    schema.mainEntityOfPage = {
      '@type': 'WebPage',
      '@id': opts.canonicalUrl,
    };
  }

  if (opts.images && opts.images.length > 0) {
    schema.image = opts.images.map((img) => ({
      '@type': 'ImageObject',
      url: img.url,
      description: img.altText,
    }));
  }

  return schema;
}

/**
 * Extract FAQ question-answer pairs from markdown
 */
function extractFAQPairs(content: string): { question: string; answer: string }[] {
  const faqMatch = content.match(/## (?:FAQ|Frequently Asked)[^\n]*([\s\S]*?)(?=\n## [^#]|\n*$)/i);
  if (!faqMatch) return [];

  const faqContent = faqMatch[1];
  const pairs: { question: string; answer: string }[] = [];

  // Split by H3 headings
  const h3Sections = faqContent.split(/^### /gm).slice(1);

  for (const section of h3Sections) {
    const lines = section.split('\n');
    const question = lines[0]
      .replace(/^\d+\.\s*/, '') // Remove "1. " prefix
      .replace(/\{#.*?\}/, '') // Remove anchor tags
      .trim();

    const answerLines = lines
      .slice(1)
      .filter((l) => l.trim().length > 0 && !l.trim().startsWith('#'))
      .map((l) => l.trim());

    const answer = answerLines.join(' ').trim();

    if (question && answer) {
      pairs.push({ question, answer });
    }
  }

  return pairs;
}

function buildFAQSchema(pairs: { question: string; answer: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map((pair) => ({
      '@type': 'Question',
      name: pair.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: pair.answer,
      },
    })),
  };
}

/**
 * Extract HowTo steps from markdown (looks for H3 "Step N:" patterns)
 */
function extractHowToSteps(content: string): { name: string; text: string }[] {
  const steps: { name: string; text: string }[] = [];

  // Pattern 1: ### Step N: Name
  const stepRegex = /### (?:Step\s*\d+[:.]\s*)(.*)/gi;
  const stepSections = content.split(/### (?:Step\s*\d+[:.]\s*)/gi);

  let match;
  let i = 0;
  const stepNames: string[] = [];

  // First pass: collect step names
  const nameRegex = /### (?:Step\s*\d+[:.]\s*)(.*)/gi;
  while ((match = nameRegex.exec(content)) !== null) {
    stepNames.push(match[1].trim());
  }

  // Second pass: collect step content
  const contentParts = content.split(/### Step\s*\d+[:.]\s*.*/gi).slice(1);

  for (let j = 0; j < stepNames.length && j < contentParts.length; j++) {
    const text = contentParts[j]
      .split(/\n### /)[0] // Stop at next H3
      .split(/\n## /)[0]  // Stop at next H2
      .replace(/^\n+/, '')
      .trim();

    const plainText = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .trim();

    if (stepNames[j] && plainText) {
      steps.push({ name: stepNames[j], text: plainText.slice(0, 500) });
    }
  }

  // Pattern 2: Numbered H3 headings (### 1. Do this)
  if (steps.length < 2) {
    const numberedRegex = /### \d+\.\s*(.*)/g;
    const numberedNames: string[] = [];
    while ((match = numberedRegex.exec(content)) !== null) {
      numberedNames.push(match[1].trim());
    }

    const numberedParts = content.split(/### \d+\.\s*.*/g).slice(1);

    for (let j = 0; j < numberedNames.length && j < numberedParts.length; j++) {
      const text = numberedParts[j]
        .split(/\n### /)[0]
        .split(/\n## /)[0]
        .replace(/^\n+/, '')
        .trim()
        .slice(0, 500);

      if (numberedNames[j] && text) {
        steps.push({ name: numberedNames[j], text });
      }
    }
  }

  return steps;
}

function buildHowToSchema(
  title: string,
  description: string,
  steps: { name: string; text: string }[],
  images?: { url: string; altText: string }[]
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    description,
    step: steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };

  if (images && images.length > 0) {
    schema.image = images[0].url;
  }

  return schema;
}

/**
 * Extract review data (rating, pros, cons) from content
 */
function extractReviewData(
  content: string,
  title: string,
  keyword: string
): Record<string, unknown> | null {
  // Look for rating patterns like "⭐ 4.5/5", "Rating: 8/10", "Score: 9.2"
  const ratingPatterns = [
    /(?:rating|score|verdict)[:\s]*(?:⭐\s*)?(\d+(?:\.\d+)?)\s*\/\s*(\d+)/i,
    /(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*(\d+)\s*(?:stars?|⭐)/i,
    /⭐+\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+)/i,
  ];

  let ratingValue: number | null = null;
  let bestRating = 5;

  for (const pattern of ratingPatterns) {
    const match = content.match(pattern);
    if (match) {
      ratingValue = parseFloat(match[1]);
      bestRating = parseInt(match[2], 10);
      // Normalize to 5-star scale if needed
      if (bestRating === 10) {
        ratingValue = ratingValue / 2;
        bestRating = 5;
      }
      break;
    }
  }

  // If no explicit rating found, don't generate review schema
  if (ratingValue === null) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'SoftwareApplication',
      name: keyword,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: ratingValue,
      bestRating: bestRating,
      worstRating: 1,
    },
    name: title,
    author: {
      '@type': 'Organization',
      name: 'BlogForge',
    },
  };
}
