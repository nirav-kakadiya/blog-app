import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/errors';
import { z } from 'zod';

const CreateSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  domain: z.string().url('Must be a valid URL'),
  sitemapUrl: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  genuineMode: z.boolean().optional(),
});

export async function GET() {
  try {
    const profiles = await prisma.brandProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { tools: true, blogs: true } } },
    });

    return NextResponse.json({ success: true, data: profiles });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateSchema.parse(body);

    // If setting as default, unset other defaults
    if (validated.isDefault) {
      await prisma.brandProfile.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const profile = await prisma.brandProfile.create({
      data: {
        name: validated.name,
        domain: validated.domain.replace(/\/$/, ''),
        sitemapUrl: validated.sitemapUrl || null,
        description: validated.description || null,
        isDefault: validated.isDefault ?? false,
        genuineMode: validated.genuineMode ?? true,
      },
      include: { tools: true },
    });

    return NextResponse.json({ success: true, data: profile }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
