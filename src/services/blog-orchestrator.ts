import { prisma } from '@/lib/prisma';
import { generateTitles, TitleGeneratorOutput } from './title-generator';
import { generateContent, ContentGeneratorOutput } from './content-generator';
import { conductResearch, ResearchData } from './content-researcher';
import { analyzeSEO, SEOAnalysis } from './seo-optimizer';
import { analyzeAEO, AEOAnalysis } from './aeo-optimizer';
import { checkContent, ContentCheckResult } from './content-checker';
import { generateSchema, SchemaOutput } from './schema-generator';
import { calculateUnifiedScore, UnifiedSearchScore } from './unified-search-score';
import { processImages } from './image-pipeline';
import { insertTOC } from '@/lib/toc-generator';
import { insertImagesIntoMarkdown } from '@/lib/image-inserter';
import { findRelevantLinks, injectPlatformLinks } from '@/lib/platform-links';
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
  aeoAnalysis: AEOAnalysis;
  contentCheck: ContentCheckResult;
  unifiedSearchScore: UnifiedSearchScore;
  schemas: SchemaOutput;
  imageError?: string;
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

// Step 2: Generate content for blog (with auto image generation)
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

  // Step 2a: Research topic (web search for real data)
  logger.info('Step 2a: Researching topic', { blogId });
  let researchData: ResearchData | undefined;
  try {
    researchData = await conductResearch(blog.keyword, blog.blogType as BlogType, title);
    logger.info('Research complete', {
      blogId,
      factCount: researchData.keyFacts.length,
      statCount: researchData.statistics.length,
    });
  } catch (researchError) {
    // Research is non-blocking — continue without it
    logger.warn('Research failed, continuing without research data', {
      blogId,
      error: String(researchError),
    });
  }

  // Step 2b: Fetch brand profile for platform integration
  logger.info('Step 2b: Fetching brand profile', { blogId });
  const brandProfile = await prisma.brandProfile.findFirst({
    where: { isDefault: true },
    include: { tools: { orderBy: { priority: 'asc' } } },
  });

  if (brandProfile) {
    logger.info('Brand profile found', {
      blogId,
      brand: brandProfile.name,
      toolCount: brandProfile.tools.length,
    });
  }

  // Step 2c: Generate content with research data + brand context
  logger.info('Step 2c: Generating text content', { blogId, hasResearch: !!researchData, hasBrand: !!brandProfile });
  const contentResult = await generateContent({
    keyword: blog.keyword,
    blogType: blog.blogType as BlogType,
    title,
    research: researchData,
    brandProfile: brandProfile
      ? {
          name: brandProfile.name,
          domain: brandProfile.domain,
          description: brandProfile.description,
          tools: brandProfile.tools.map(t => ({
            id: t.id,
            name: t.name,
            path: t.path,
            category: t.category,
            keywords: t.keywords,
            description: t.description,
            priority: t.priority,
          })),
        }
      : undefined,
  });

  // Insert TOC after intro
  let finalContent = insertTOC(contentResult.content, 'TL;DR');

  // Post-process: inject any missing platform links
  if (brandProfile && brandProfile.tools.length > 0) {
    const matches = findRelevantLinks(
      blog.keyword,
      blog.blogType,
      brandProfile.tools.map(t => ({
        id: t.id,
        name: t.name,
        path: t.path,
        category: t.category,
        keywords: t.keywords,
        description: t.description,
        priority: t.priority,
      })),
      brandProfile.domain
    );
    const injection = injectPlatformLinks(finalContent, matches);
    finalContent = injection.content;
    logger.info('Platform links injected', {
      blogId,
      injected: injection.injectedCount,
      existing: injection.existingCount,
    });
  }

  // Step 2c: Auto-generate images based on keyword, title, and content
  logger.info('Step 2c: Auto-generating images', { blogId });
  let generatedImages: {
    id: string;
    prompt: string;
    s3Url: string;
    altText: string;
    placement: string;
    sectionId?: string;
  }[] = [];
  let imageGenerationError: string | undefined;

  try {
    generatedImages = await processImages(
      {
        id: blogId,
        title,
        keyword: blog.keyword,
        blogType: blog.blogType as BlogType,
        content: finalContent,
      },
      3 // Generate 3 images: hero, after_intro, in_section
    );

    logger.info('Images generated successfully', {
      blogId,
      imageCount: generatedImages.length,
    });

    // Step 2c: Insert images into the markdown content at the right positions
    if (generatedImages.length > 0) {
      finalContent = insertImagesIntoMarkdown(
        finalContent,
        generatedImages.map((img) => ({
          url: img.s3Url,
          altText: img.altText,
          placement: img.placement,
          sectionId: img.sectionId,
        }))
      );

      logger.info('Images inserted into content', { blogId });
    }
  } catch (imageError) {
    // Image generation is non-blocking - log error and continue with content
    imageGenerationError = imageError instanceof Error ? imageError.message : String(imageError);
    logger.error('Auto image generation failed (continuing without images)', {
      blogId,
      error: imageGenerationError,
    });
  }

  // Analyze SEO (on final content with images)
  const seoAnalysis = analyzeSEO(finalContent, blog.keyword, title);

  // Step 2d: Check content quality
  logger.info('Step 2d: Running content checks (SEO + quality)', { blogId });
  const contentCheck = checkContent(finalContent, blog.keyword, title, blog.blogType as BlogType);
  logger.info('Content check complete', {
    blogId,
    score: contentCheck.score,
    grade: contentCheck.grade,
  });

  // Step 2e: AEO Analysis
  logger.info('Step 2e: Running AEO + schema analysis', { blogId });
  const aeoAnalysis = analyzeAEO(finalContent, blog.keyword, title, blog.blogType as BlogType);
  logger.info('AEO analysis complete', { blogId, aeoScore: aeoAnalysis.score });

  // Step 2f: Generate Schema.org JSON-LD
  logger.info('Step 2f: Generating Schema.org structured data', { blogId });
  const schemas = generateSchema({
    content: finalContent,
    keyword: blog.keyword,
    title,
    metaDescription: contentResult.metaDescription,
    blogType: blog.blogType as BlogType,
    images: generatedImages.map((img) => ({ url: img.s3Url, altText: img.altText })),
  });

  // Step 2g: Calculate unified search score
  const unifiedSearchScore = calculateUnifiedScore(seoAnalysis, aeoAnalysis, schemas);
  logger.info('Unified search score', {
    blogId,
    overall: unifiedSearchScore.overall,
    grade: unifiedSearchScore.grade,
    seo: seoAnalysis.score,
    aeo: aeoAnalysis.score,
  });

  // Update blog in database with final content (including image references)
  const updatedBlog = await prisma.blog.update({
    where: { id: blogId },
    data: {
      title,
      content: finalContent,
      metaDescription: contentResult.metaDescription,
      focusKeyword: blog.keyword,
      schemaJsonLd: schemas.jsonLd,
      aeoScore: aeoAnalysis.score,
      searchScore: unifiedSearchScore.overall,
      status: 'review',
      ...(brandProfile && { brandProfileId: brandProfile.id }),
    },
    include: {
      images: true,
      links: true,
      publishRecords: true,
    },
  });

  logger.info('Blog content generated with images', {
    blogId,
    seoScore: seoAnalysis.score,
    imageCount: updatedBlog.images.length,
  });

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
    publishRecords: (updatedBlog.publishRecords || []).map((p) => ({
      platform: p.platform as Platform,
      publishedUrl: p.publishedUrl || undefined,
      publishedAt: p.publishedAt?.toISOString(),
      status: p.status,
    })),
  };

  return {
    blog: blogOutput,
    seoAnalysis,
    aeoAnalysis,
    contentCheck,
    unifiedSearchScore,
    schemas,
    imageError: imageGenerationError,
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
