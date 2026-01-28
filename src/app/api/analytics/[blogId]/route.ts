import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ blogId: string }> }
) {
  const { blogId } = await params;

  try {
    const blog = await prisma.blog.findUnique({
      where: { id: blogId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        publishRecords: {
          select: {
            platform: true,
            publishedUrl: true,
            publishedAt: true,
            status: true,
          },
        },
      },
    });

    if (!blog) {
      return NextResponse.json(
        { error: 'Blog not found' },
        { status: 404 }
      );
    }

    const analytics = {
      blogId: blog.id,
      title: blog.title,
      totalViews: 0, // Placeholder - actual views would require platform API integration
      platforms: blog.publishRecords.map((record) => ({
        platform: record.platform,
        publishedUrl: record.publishedUrl,
        publishedAt: record.publishedAt?.toISOString() || blog.createdAt.toISOString(),
        status: record.status,
      })),
      createdAt: blog.createdAt.toISOString(),
      updatedAt: blog.updatedAt.toISOString(),
    };

    return NextResponse.json({ data: analytics });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
