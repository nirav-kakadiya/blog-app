import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { deleteImage } from '@/services/image-pipeline';

const updateImageSchema = z.object({
  altText: z.string().max(125).optional(),
  placement: z.enum(['hero', 'after_intro', 'in_section', 'before_cta']).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const image = await prisma.image.findUnique({
      where: { id },
    });

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { image },
    });
  } catch (error) {
    console.error('Get image error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get image' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { altText, placement } = updateImageSchema.parse(body);

    const image = await prisma.image.findUnique({
      where: { id },
    });

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    const updatedImage = await prisma.image.update({
      where: { id },
      data: {
        ...(altText !== undefined && { altText }),
        ...(placement !== undefined && { placement }),
      },
    });

    return NextResponse.json({
      success: true,
      data: { image: updatedImage },
    });
  } catch (error) {
    console.error('Update image error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update image' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await deleteImage(id);

    return NextResponse.json({
      success: true,
      message: 'Image deleted',
    });
  } catch (error) {
    console.error('Delete image error:', error);

    const message = error instanceof Error ? error.message : 'Failed to delete image';
    const status = message === 'Image not found' ? 404 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
