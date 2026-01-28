import { prisma } from '@/lib/prisma';
import { generateTitles, TitleGeneratorOutput } from './title-generator';
import { generateContent, ContentGeneratorOutput } from './content-generator';
import { analyzeSEO, SEOAnalysis } from './seo-optimizer';
import { insertTOC } from '@/lib/toc-generator';
import { BlogType, BlogOutput, Platform } from '@/types';
import { logger } from '@/lib/logger';

export interface CreateBlogInput {
  keyword: string;
  blogType: BlogType;
}

export interface GenerateBlogInput {
  blogId: string;
  title: string;
}

export interface BlogOrchestrationResult {
  blog: BlogOutput;
  seoAnalysis: SEOAnalysis;
}

// Step 1: Create initial blog draft
export async function createBlogDraft(input: CreateBlogInput): Promise<{ id: string; titles: TitleGeneratorOutput }> {
  const { keyword, blogType } = input;

  logger.info('Creating blog draft', { keyword, blogType });

  // Create blog in database
  const blog = await prisma.blog.create({
    data: {
      keyword,
      blogType,
      title: '',
      content: '',
      status: 'draft',
    },
  });

  // Generate title options
  const titles = await generateTitles({ keyword, blogType });

  logger.info('Blog draft created', { blogId: blog.id, titleCount: titles.titles.length });

  return {
    id: blog.id,
    titles,
  };
}

// Step 2: Generate content for blog
export async function generateBlogContent(input: GenerateBlogInput): Promise<BlogOrchestrationResult> {
  const { blogId, title } = input;

  logger.info('Generating blog content', { blogId, title });

  // Get blog from database
  const blog = await prisma.blog.findUnique({
    where: { id: blogId },
  });

  if (!blog) {
    throw new Error(`Blog not found: ${blogId}`);
  }

  // Generate content
  const contentResult = await generateContent({
    keyword: blog.keyword,
    blogType: blog.blogType as BlogType,
    title,
  });

  // Insert TOC after intro
  const contentWithTOC = insertTOC(contentResult.content, 'TL;DR');

  // Analyze SEO
  const seoAnalysis = analyzeSEO(contentWithTOC, blog.keyword, title);

  // Update blog in database
  const updatedBlog = await prisma.blog.update({
    where: { id: blogId },
    data: {
      title,
      content: contentWithTOC,
      metaDescription: contentResult.metaDescription,
      focusKeyword: blog.keyword,
      status: 'review',
    },
    include: {
      images: true,
      links: true,
      publishRecords: true,
    },
  });

  logger.info('Blog content generated', { blogId, seoScore: seoAnalysis.score });

  const blogOutput: BlogOutput = {
    id: updatedBlog.id,
    createdAt: updatedBlog.createdAt.toISOString(),
    updatedAt: updatedBlog.updatedAt.toISOString(),
    status: updatedBlog.status as 'draft' | 'review' | 'published',
    input: {
      keyword: updatedBlog.keyword,
      blogType: updatedBlog.blogType as BlogType,
    },
    seo: {
      title: updatedBlog.title,
      metaDescription: updatedBlog.metaDescription || '',
      focusKeyword: updatedBlog.focusKeyword || '',
      secondaryKeywords: updatedBlog.secondaryKeywords,
      canonicalUrl: updatedBlog.canonicalUrl || undefined,
    },
    content: {
      markdown: updatedBlog.content,
    },
    links: updatedBlog.links.map((l) => ({
      id: l.id,
      anchor: l.anchor,
      url: l.url,
      type: l.type as 'internal' | 'external',
      nofollow: l.nofollow,
    })),
    images: updatedBlog.images.map((i) => ({
      id: i.id,
      prompt: i.prompt,
      s3Url: i.s3Url,
      altText: i.altText,
      placement: i.placement as 'hero' | 'after_intro' | 'in_section',
    })),
    publishRecords: updatedBlog.publishRecords.map((p) => ({
      platform: p.platform as Platform,
      publishedUrl: p.publishedUrl || undefined,
      publishedAt: p.publishedAt?.toISOString(),
      status: p.status,
    })),
  };

  return {
    blog: blogOutput,
    seoAnalysis,
  };
}

// Get blog by ID
export async function getBlog(blogId: string): Promise<BlogOutput | null> {
  const blog = await prisma.blog.findUnique({
    where: { id: blogId },
    include: {
      images: true,
      links: true,
      publishRecords: true,
    },
  });

  if (!blog) {
    return null;
  }

  return {
    id: blog.id,
    createdAt: blog.createdAt.toISOString(),
    updatedAt: blog.updatedAt.toISOString(),
    status: blog.status as 'draft' | 'review' | 'published',
    input: {
      keyword: blog.keyword,
      blogType: blog.blogType as BlogType,
    },
    seo: {
      title: blog.title,
      metaDescription: blog.metaDescription || '',
      focusKeyword: blog.focusKeyword || '',
      secondaryKeywords: blog.secondaryKeywords,
      canonicalUrl: blog.canonicalUrl || undefined,
    },
    content: {
      markdown: blog.content,
    },
    links: blog.links.map((l) => ({
      id: l.id,
      anchor: l.anchor,
      url: l.url,
      type: l.type as 'internal' | 'external',
      nofollow: l.nofollow,
    })),
    images: blog.images.map((i) => ({
      id: i.id,
      prompt: i.prompt,
      s3Url: i.s3Url,
      altText: i.altText,
      placement: i.placement as 'hero' | 'after_intro' | 'in_section',
    })),
  };
}

// Update blog
export async function updateBlog(
  blogId: string,
  data: Partial<{
    title: string;
    content: string;
    metaDescription: string;
    canonicalUrl: string;
    secondaryKeywords: string[];
    status: 'draft' | 'review' | 'published';
  }>
): Promise<BlogOutput> {
  const updated = await prisma.blog.update({
    where: { id: blogId },
    data,
    include: {
      images: true,
      links: true,
      publishRecords: true,
    },
  });

  return {
    id: updated.id,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    status: updated.status as 'draft' | 'review' | 'published',
    input: {
      keyword: updated.keyword,
      blogType: updated.blogType as BlogType,
    },
    seo: {
      title: updated.title,
      metaDescription: updated.metaDescription || '',
      focusKeyword: updated.focusKeyword || '',
      secondaryKeywords: updated.secondaryKeywords,
      canonicalUrl: updated.canonicalUrl || undefined,
    },
    content: {
      markdown: updated.content,
    },
    links: updated.links.map((l) => ({
      id: l.id,
      anchor: l.anchor,
      url: l.url,
      type: l.type as 'internal' | 'external',
      nofollow: l.nofollow,
    })),
    images: updated.images.map((i) => ({
      id: i.id,
      prompt: i.prompt,
      s3Url: i.s3Url,
      altText: i.altText,
      placement: i.placement as 'hero' | 'after_intro' | 'in_section',
    })),
  };
}

// Delete blog
export async function deleteBlog(blogId: string): Promise<void> {
  await prisma.blog.delete({
    where: { id: blogId },
  });
}
