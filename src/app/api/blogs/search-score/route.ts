import { NextRequest, NextResponse } from 'next/server';
import { handleError } from '@/lib/errors';
import { analyzeSEO } from '@/services/seo-optimizer';
import { analyzeAEO } from '@/services/aeo-optimizer';
import { generateSchema } from '@/services/schema-generator';
import { calculateUnifiedScore } from '@/services/unified-search-score';
import { BlogType } from '@/types';
import { z } from 'zod';

const SearchScoreSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  keyword: z.string().min(1, 'Keyword is required'),
  title: z.string().min(1, 'Title is required'),
  blogType: z.string().min(1, 'Blog type is required'),
  metaDescription: z.string().optional().default(''),
  canonicalUrl: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = SearchScoreSchema.parse(body);

    const seo = analyzeSEO(validated.content, validated.keyword, validated.title);
    const aeo = analyzeAEO(
      validated.content,
      validated.keyword,
      validated.title,
      validated.blogType as BlogType
    );
    const schemas = generateSchema({
      content: validated.content,
      keyword: validated.keyword,
      title: validated.title,
      metaDescription: validated.metaDescription,
      blogType: validated.blogType as BlogType,
      canonicalUrl: validated.canonicalUrl,
    });
    const result = calculateUnifiedScore(seo, aeo, schemas);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(error);
  }
}
