import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/errors';
import { z } from 'zod';

const UpdateToolSchema = z.object({
  name: z.string().min(1).optional(),
  path: z.string().min(1).startsWith('/').optional(),
  category: z.string().min(1).optional(),
  keywords: z.array(z.string()).min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.number().int().min(1).max(10).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; toolId: string }> }
) {
  try {
    const { toolId } = await params;
    const body = await request.json();
    const validated = UpdateToolSchema.parse(body);

    const tool = await prisma.brandTool.update({
      where: { id: toolId },
      data: validated,
    });

    return NextResponse.json({ success: true, data: tool });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; toolId: string }> }
) {
  try {
    const { toolId } = await params;
    await prisma.brandTool.delete({ where: { id: toolId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
