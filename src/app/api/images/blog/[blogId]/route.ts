import { NextRequest, NextResponse } from 'next/server';
import { getBlogImages } from '@/services/image-pipeline';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const { blogId } = await params;

    const images = await getBlogImages(blogId);

    return NextResponse.json({
      success: true,
      data: {
        images,
        count: images.length,
      },
    });
  } catch (error) {
    logger.error('Get blog images error', { error: String(error) });
    return NextResponse.json(
      { success: false, error: 'Failed to get images' },
      { status: 500 }
    );
  }
}
