import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/errors';
import { z } from 'zod';

const CreateBlogSchema = z.object({
  keyword: z.string().min(2, 'Keyword must be at least 2 characters'),
  blogType: z.enum([
    'guide',
    'prompt',
    'comparison',
    'tips',
    'usecase',
    'api',
    'upcoming',
    'troubleshoot',
    'tools',
    'review',
  ]),
});

const ListQuerySchema = z.object({
  status: z.enum(['draft', 'review', 'published']).optional(),
  blogType: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = ListQuerySchema.parse(Object.fromEntries(searchParams));

    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.blogType) {
      where.blogType = query.blogType;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { keyword: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [blogs, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { select: { id: true, s3Url: true } },
          publishRecords: { select: { platform: true, status: true } },
        },
      }),
      prisma.blog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: blogs,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateBlogSchema.parse(body);

    const blog = await prisma.blog.create({
      data: {
        keyword: validated.keyword,
        blogType: validated.blogType,
        title: '',
        content: '',
        status: 'draft',
      },
    });

    return NextResponse.json({ success: true, data: blog }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
