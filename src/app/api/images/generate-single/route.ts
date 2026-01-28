import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { processingleImage } from '@/services/image-pipeline';
import { BlogType } from '@/types';

const generateSingleSchema = z.object({
  blogId: z.string().uuid(),
  prompt: z.string().min(10),
  placement: z.enum(['hero', 'after_intro', 'in_section', 'before_cta']).optional().default('in_section'),
  altText: z.string().max(125).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { blogId, prompt, placement, altText } = generateSingleSchema.parse(body);

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

    // Process single image
    const image = await processingleImage(
      {
        id: blog.id,
        title: blog.title || blog.keyword,
        keyword: blog.keyword,
        blogType: blog.blogType as BlogType,
        content: blog.content || '',
      },
      {
        prompt,
        placement,
        altText: altText || `${blog.keyword} illustration`,
      }
    );

    return NextResponse.json({
      success: true,
      data: { image },
    });
  } catch (error) {
    console.error('Generate single image error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
}
