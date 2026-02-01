import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/errors';
import { z } from 'zod';

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().url().optional(),
  sitemapUrl: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  genuineMode: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profile = await prisma.brandProfile.findUnique({
      where: { id },
      include: { tools: { orderBy: { priority: 'asc' } } },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = UpdateSchema.parse(body);

    if (validated.isDefault) {
      await prisma.brandProfile.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const profile = await prisma.brandProfile.update({
      where: { id },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.domain && { domain: validated.domain.replace(/\/$/, '') }),
        ...(validated.sitemapUrl !== undefined && { sitemapUrl: validated.sitemapUrl }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.isDefault !== undefined && { isDefault: validated.isDefault }),
        ...(validated.genuineMode !== undefined && { genuineMode: validated.genuineMode }),
      },
      include: { tools: true },
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.brandProfile.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
