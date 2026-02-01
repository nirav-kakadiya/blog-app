import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/errors';
import { z } from 'zod';

const CreateToolSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1).startsWith('/'),
  category: z.string().min(1),
  keywords: z.array(z.string()).min(1),
  description: z.string().optional().nullable(),
  priority: z.number().int().min(1).max(10).optional(),
});

const BulkCreateSchema = z.object({
  tools: z.array(CreateToolSchema),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tools = await prisma.brandTool.findMany({
      where: { brandProfileId: id },
      orderBy: { priority: 'asc' },
    });

    return NextResponse.json({ success: true, data: tools });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Support both single tool and bulk creation
    if (body.tools && Array.isArray(body.tools)) {
      const validated = BulkCreateSchema.parse(body);
      const created = await prisma.brandTool.createMany({
        data: validated.tools.map(t => ({
          brandProfileId: id,
          name: t.name,
          path: t.path,
          category: t.category,
          keywords: t.keywords,
          description: t.description || null,
          priority: t.priority || 5,
          isAutoDetected: false,
        })),
      });
      const tools = await prisma.brandTool.findMany({
        where: { brandProfileId: id },
        orderBy: { priority: 'asc' },
      });
      return NextResponse.json({ success: true, data: tools, created: created.count }, { status: 201 });
    }

    const validated = CreateToolSchema.parse(body);
    const tool = await prisma.brandTool.create({
      data: {
        brandProfileId: id,
        name: validated.name,
        path: validated.path,
        category: validated.category,
        keywords: validated.keywords,
        description: validated.description || null,
        priority: validated.priority || 5,
        isAutoDetected: false,
      },
    });

    return NextResponse.json({ success: true, data: tool }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
