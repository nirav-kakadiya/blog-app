import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, NotFoundError } from '@/lib/errors';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const UpdateBlogSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  metaDescription: z.string().max(160).optional(),
  canonicalUrl: z.string().url().optional().or(z.literal('')),
  focusKeyword: z.string().optional(),
  secondaryKeywords: z.array(z.string()).optional(),
  status: z.enum(['draft', 'review', 'published']).optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const blog = await prisma.blog.findUnique({
      where: { id },
      include: {
        images: true,
        links: true,
        publishRecords: true,
      },
    });

    if (!blog) {
      throw new NotFoundError('Blog not found');
    }

    return NextResponse.json({ success: true, data: blog });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = UpdateBlogSchema.parse(body);

    const blog = await prisma.blog.update({
      where: { id },
      data: validated,
      include: {
        images: true,
        links: true,
        publishRecords: true,
      },
    });

    return NextResponse.json({ success: true, data: blog });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.blog.delete({ where: { id } });

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return handleError(error);
  }
}
