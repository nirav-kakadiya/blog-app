import type { SEOAnalysis, SEOCheck } from './seo-optimizer';
import type { AEOAnalysis, AEOCheck } from './aeo-optimizer';
import type { SchemaOutput } from './schema-generator';
import { logger } from '@/lib/logger';

export interface UnifiedSearchScore {
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  seo: SEOAnalysis;
  aeo: AEOAnalysis;
  schemas: SchemaOutput;
  suggestions: UnifiedSuggestion[];
  summary: string;
}

export interface UnifiedSuggestion {
  source: 'seo' | 'aeo' | 'schema';
  importance: 'critical' | 'important' | 'optional';
  message: string;
}

/**
 * Combine SEO + AEO + Schema into a single unified search score.
 *
 * Weights:
 * - SEO: 45%
 * - AEO: 45%
 * - Schema bonus: 10% (BlogPosting=4%, FAQPage=3%, HowTo/Review/TechArticle=3%)
 */
export function calculateUnifiedScore(
  seo: SEOAnalysis,
  aeo: AEOAnalysis,
  schemas: SchemaOutput
): UnifiedSearchScore {
  // Schema bonus: what structured data is generated
  const schemaTypes = schemas.schemas.map((s) => s.type);
  let schemaBonus = 0;
  if (schemaTypes.includes('BlogPosting') || schemaTypes.includes('TechArticle')) {
    schemaBonus += 40; // 4% of 10% = 40 out of 100 schema points
  }
  if (schemaTypes.includes('FAQPage')) {
    schemaBonus += 30; // 3%
  }
  if (schemaTypes.includes('HowTo') || schemaTypes.includes('Review')) {
    schemaBonus += 30; // 3%
  }
  // Cap at 100
  schemaBonus = Math.min(schemaBonus, 100);

  const overall = Math.round(
    seo.score * 0.45 + aeo.score * 0.45 + schemaBonus * 0.10
  );

  const grade = getGrade(overall);

  // Merge suggestions from both sources, sorted by importance
  const suggestions: UnifiedSuggestion[] = [];

  // Map SEO checks to suggestions for failed ones
  for (const check of seo.checks) {
    if (!check.passed) {
      suggestions.push({
        source: 'seo',
        importance: check.importance,
        message: check.message,
      });
    }
  }

  for (const check of aeo.checks) {
    if (!check.passed) {
      suggestions.push({
        source: 'aeo',
        importance: check.importance,
        message: check.message,
      });
    }
  }

  // Schema suggestions
  if (!schemaTypes.includes('BlogPosting') && !schemaTypes.includes('TechArticle')) {
    suggestions.push({
      source: 'schema',
      importance: 'important',
      message: 'Article schema could not be generated — ensure content has a title and description',
    });
  }
  if (!schemaTypes.includes('FAQPage')) {
    suggestions.push({
      source: 'schema',
      importance: 'important',
      message: 'No FAQ schema — add a FAQ section with H3 questions for rich search results',
    });
  }

  // Sort: critical first, then important, then optional
  const importanceOrder = { critical: 0, important: 1, optional: 2 };
  suggestions.sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]);

  const summary = generateSummary(overall, grade, seo.score, aeo.score, schemaTypes);

  logger.info('Unified search score calculated', {
    overall,
    grade,
    seoScore: seo.score,
    aeoScore: aeo.score,
    schemaBonus,
    schemaTypes,
  });

  return {
    overall,
    grade,
    seo,
    aeo,
    schemas,
    suggestions,
    summary,
  };
}

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function generateSummary(
  overall: number,
  grade: string,
  seoScore: number,
  aeoScore: number,
  schemaTypes: string[]
): string {
  const parts: string[] = [];

  parts.push(`Search Score: ${grade} (${overall}%)`);
  parts.push(`SEO ${seoScore}%`);
  parts.push(`AEO ${aeoScore}%`);
  parts.push(`${schemaTypes.length} schema type(s)`);

  if (overall >= 90) {
    return `${parts.join(' | ')}. Content is well-optimized for both traditional and AI search.`;
  }
  if (overall >= 75) {
    return `${parts.join(' | ')}. Good optimization with room for improvement.`;
  }
  if (seoScore > aeoScore + 20) {
    return `${parts.join(' | ')}. Strong SEO but AEO needs attention for AI search visibility.`;
  }
  if (aeoScore > seoScore + 20) {
    return `${parts.join(' | ')}. Good AEO but traditional SEO signals need improvement.`;
  }
  return `${parts.join(' | ')}. Both SEO and AEO need improvement for maximum search visibility.`;
}
