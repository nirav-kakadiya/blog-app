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

    // Validate blogId format
    if (!blogId || typeof blogId !== 'string' || blogId.length < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid blog ID' },
        { status: 400 }
      );
    }

    // Validate platform
    const normalizedPlatform = platform?.toLowerCase().trim();
    if (!VALID_PLATFORMS.includes(normalizedPlatform as Platform)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid platform: ${platform}. Valid platforms: ${VALID_PLATFORMS.join(', ')}`
        },
        { status: 400 }
      );
    }

    const result = await previewForPlatform(blogId, normalizedPlatform as Platform);

    // Ensure result has required fields
    const safeResult = {
      content: result?.content || '',
      metadata: result?.metadata || {},
      platform: result?.platform || normalizedPlatform,
      warnings: result?.warnings || [],
    };

    return NextResponse.json({
      success: true,
      data: safeResult,
    });
  } catch (error) {
    console.error('Preview error:', error);

    const message = error instanceof Error ? error.message : 'Failed to generate preview';

    // Determine appropriate status code
    let status = 500;
    if (message.includes('not found')) {
      status = 404;
    } else if (message.includes('Invalid') || message.includes('missing')) {
      status = 400;
    }

    // Return a structured error response with fallback content
    return NextResponse.json(
      {
        success: false,
        error: message,
        data: {
          content: `Error generating preview: ${message}`,
          metadata: { error: message },
          platform: 'unknown',
          warnings: [message],
        }
      },
      { status }
    );
  }
}
