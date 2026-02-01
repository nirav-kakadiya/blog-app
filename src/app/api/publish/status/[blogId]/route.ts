import { NextRequest, NextResponse } from 'next/server';
import { getPublishStatus } from '@/services/publish-orchestrator';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  try {
    const { blogId } = await params;

    const result = await getPublishStatus(blogId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get status error', { error: String(error) });

    const message = error instanceof Error ? error.message : 'Failed to get status';
    const status = message.includes('not found') ? 404 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
