import { NextRequest, NextResponse } from 'next/server';
import { handleError, NotFoundError } from '@/lib/errors';
import { generateBlogContent } from '@/services/blog-orchestrator';
import { z } from 'zod';

const GenerateContentSchema = z.object({
  blogId: z.string().uuid(),
  title: z.string().min(10, 'Title must be at least 10 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = GenerateContentSchema.parse(body);

    const result = await generateBlogContent({
      blogId: validated.blogId,
      title: validated.title,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return handleError(new NotFoundError('Blog not found'));
    }
    return handleError(error);
  }
}
