import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { publishBlog } from '@/services/publish-orchestrator';
import { Platform } from '@/types';
import { logger } from '@/lib/logger';

const publishSchema = z.object({
  platforms: z.array(z.enum(['medium', 'devto', 'linkedin', 'wordpress', 'hashnode', 'ghost', 'quora', 'reddit'])),
  publishStatus: z.enum(['draft', 'public']).optional().default('draft'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const { blogId } = await params;
    const body = await req.json();
    const { platforms, publishStatus } = publishSchema.parse(body);

    const result = await publishBlog(blogId, {
      platforms: platforms as Platform[],
      publishStatus,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Publish error', { error: String(error) });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to publish';
    const status = message.includes('not found') ? 404 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
