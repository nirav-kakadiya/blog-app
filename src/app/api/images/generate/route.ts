import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { processImages } from '@/services/image-pipeline';
import { BlogType } from '@/types';

const generateImagesSchema = z.object({
  blogId: z.string().uuid(),
  count: z.number().min(1).max(5).optional().default(3),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { blogId, count } = generateImagesSchema.parse(body);

    // Get blog data
    const blog = await prisma.blog.findUnique({
      where: { id: blogId },
    });

    if (!blog) {
      return NextResponse.json(
        { success: false, error: 'Blog not found' },
        { status: 404 }
      );
    }

    if (!blog.content) {
      return NextResponse.json(
        { success: false, error: 'Blog has no content' },
        { status: 400 }
      );
    }

    // Process images
    const images = await processImages(
      {
        id: blog.id,
        title: blog.title || blog.keyword,
        keyword: blog.keyword,
        blogType: blog.blogType as BlogType,
        content: blog.content,
      },
      count
    );

    return NextResponse.json({
      success: true,
      data: {
        images,
        count: images.length,
      },
    });
  } catch (error) {
    console.error('Generate images error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate images' },
      { status: 500 }
    );
  }
}
