import { NextRequest, NextResponse } from 'next/server';
import { getBlogImages } from '@/services/image-pipeline';

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
    console.error('Get blog images error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get images' },
      { status: 500 }
    );
  }
}
