import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { optimizeContent } from '@/services/content-optimizer';
import { logger } from '@/lib/logger';

const optimizeSchema = z.object({
  blogId: z.string().uuid(),
  content: z.string().min(50),
  keyword: z.string().min(1),
  title: z.string().min(1),
  blogType: z.string(),
  metaDescription: z.string().default(''),
  failedChecks: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      message: z.string(),
      importance: z.enum(['critical', 'important', 'optional']),
    })
  ),
  suggestions: z.array(
    z.object({
      source: z.enum(['seo', 'aeo', 'schema']),
      importance: z.enum(['critical', 'important', 'optional']),
      message: z.string(),
    })
  ),
  userNotes: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = optimizeSchema.parse(body);

    const result = await optimizeContent({
      content: validated.content,
      keyword: validated.keyword,
      title: validated.title,
      blogType: validated.blogType as any,
      metaDescription: validated.metaDescription,
      failedChecks: validated.failedChecks,
      suggestions: validated.suggestions,
      userNotes: validated.userNotes,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Content optimization error', { error: String(error) });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Content optimization failed',
      },
      { status: 500 }
    );
  }
}
