import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { regenerateImage } from '@/services/image-pipeline';
import { logger } from '@/lib/logger';

const regenerateSchema = z.object({
  prompt: z.string().min(10).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { prompt } = regenerateSchema.parse(body);

    const image = await regenerateImage(id, prompt);

    return NextResponse.json({
      success: true,
      data: { image },
    });
  } catch (error) {
    logger.error('Regenerate image error', { error: String(error) });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to regenerate image';
    const status = message === 'Image not found' ? 404 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
