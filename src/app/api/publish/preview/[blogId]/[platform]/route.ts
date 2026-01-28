import { NextRequest, NextResponse } from 'next/server';
import { previewForPlatform } from '@/services/publish-orchestrator';
import { Platform } from '@/types';

const VALID_PLATFORMS: Platform[] = ['medium', 'devto', 'linkedin', 'wordpress', 'hashnode', 'ghost', 'quora', 'reddit'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ blogId: string; platform: string }> }
) {
  try {
    const { blogId, platform } = await params;

    if (!VALID_PLATFORMS.includes(platform as Platform)) {
      return NextResponse.json(
        { success: false, error: 'Invalid platform' },
        { status: 400 }
      );
    }

    const result = await previewForPlatform(blogId, platform as Platform);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Preview error:', error);

    const message = error instanceof Error ? error.message : 'Failed to generate preview';
    const status = message.includes('not found') ? 404 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
