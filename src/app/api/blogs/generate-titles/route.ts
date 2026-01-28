import { NextRequest, NextResponse } from 'next/server';
import { handleError } from '@/lib/errors';
import { generateTitles } from '@/services/title-generator';
import { z } from 'zod';

const GenerateTitlesSchema = z.object({
  keyword: z.string().min(2, 'Keyword must be at least 2 characters'),
  blogType: z.enum([
    'guide',
    'prompt',
    'comparison',
    'tips',
    'usecase',
    'api',
    'upcoming',
    'troubleshoot',
    'tools',
    'review',
  ]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = GenerateTitlesSchema.parse(body);

    const result = await generateTitles({
      keyword: validated.keyword,
      blogType: validated.blogType,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(error);
  }
}
