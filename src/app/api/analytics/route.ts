import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const blogs = await prisma.blog.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    const analytics = blogs.map((blog) => ({
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
    }));

    return NextResponse.json({ data: analytics });
  } catch (error) {
    logger.error('Analytics fetch error', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
