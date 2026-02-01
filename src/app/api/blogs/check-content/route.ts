import { NextRequest, NextResponse } from 'next/server';
import { handleError } from '@/lib/errors';
import { checkContent } from '@/services/content-checker';
import { BlogType } from '@/types';
import { z } from 'zod';

const CheckContentSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  keyword: z.string().min(1, 'Keyword is required'),
  title: z.string().min(1, 'Title is required'),
  blogType: z.string().min(1, 'Blog type is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CheckContentSchema.parse(body);

    const result = checkContent(
      validated.content,
      validated.keyword,
      validated.title,
      validated.blogType as BlogType
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(error);
  }
}
