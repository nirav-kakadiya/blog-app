import { prisma } from '@/lib/prisma';
import { Platform, BlogType } from '@/types';
import { convertForPlatform, BlogData, ConvertedContent } from './converters';
import { logger } from '@/lib/logger';

export interface PublishOptions {
  platforms: Platform[];
  publishStatus?: 'draft' | 'public';
}

export interface PublishResult {
  platform: Platform;
  success: boolean;
  publishedUrl?: string;
  content?: ConvertedContent;
  error?: string;
}

export interface PublishBlogResult {
  blogId: string;
  results: PublishResult[];
  successCount: number;
  failureCount: number;
}

export async function publishBlog(
  blogId: string,
  options: PublishOptions
): Promise<PublishBlogResult> {
  const { platforms, publishStatus = 'draft' } = options;

  // Get blog data
  const blog = await prisma.blog.findUnique({
    where: { id: blogId },
    include: { images: true },
  });

  if (!blog) {
    throw new Error('Blog not found');
  }

  if (!blog.content) {
    throw new Error('Blog has no content');
  }

  const blogData: BlogData = {
    id: blog.id,
    title: blog.title || blog.keyword,
    content: blog.content,
    metaDescription: blog.metaDescription || '',
    keyword: blog.keyword,
    blogType: blog.blogType as BlogType,
    canonicalUrl: blog.canonicalUrl || undefined,
    tags: blog.secondaryKeywords,
    images: blog.images.map((img) => ({
      url: img.s3Url,
      altText: img.altText,
      placement: img.placement,
    })),
  };

  const results: PublishResult[] = [];

  // Process each platform in parallel
  const platformPromises = platforms.map(async (platform) => {
    try {
      logger.info('Converting for platform', { platform, blogId });

      // Convert content for this platform
      const converted = convertForPlatform(blogData, platform);

      // In a real implementation, we would call the platform's API here
      // For now, we just save the converted content and return a preview

      // Save publish record
      await prisma.publishRecord.create({
        data: {
          blogId,
          platform,
          status: publishStatus === 'public' ? 'published' : 'draft',
          publishedUrl: null, // Would be set after actual API call
        },
      });

      logger.info('Platform conversion success', { platform, blogId });

      return {
        platform,
        success: true,
        content: converted,
      };
    } catch (error) {
      logger.error('Platform conversion failed', {
        platform,
        blogId,
        error: String(error),
      });

      return {
        platform,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  const platformResults = await Promise.all(platformPromises);
  results.push(...platformResults);

  // Update blog status if any platform succeeded
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  if (successCount > 0 && publishStatus === 'public') {
    await prisma.blog.update({
      where: { id: blogId },
      data: { status: 'published' },
    });
  } else if (successCount > 0) {
    await prisma.blog.update({
      where: { id: blogId },
      data: { status: 'review' },
    });
  }

  return {
    blogId,
    results,
    successCount,
    failureCount,
  };
}

export async function previewForPlatform(
  blogId: string,
  platform: Platform
): Promise<ConvertedContent> {
  const blog = await prisma.blog.findUnique({
    where: { id: blogId },
    include: { images: true },
  });

  if (!blog) {
    throw new Error('Blog not found');
  }

  if (!blog.content) {
    throw new Error('Blog has no content');
  }

  const blogData: BlogData = {
    id: blog.id,
    title: blog.title || blog.keyword,
    content: blog.content,
    metaDescription: blog.metaDescription || '',
    keyword: blog.keyword,
    blogType: blog.blogType as BlogType,
    canonicalUrl: blog.canonicalUrl || undefined,
    tags: blog.secondaryKeywords,
    images: blog.images.map((img) => ({
      url: img.s3Url,
      altText: img.altText,
      placement: img.placement,
    })),
  };

  return convertForPlatform(blogData, platform);
}

export async function getPublishStatus(blogId: string): Promise<{
  blogStatus: string;
  platforms: {
    platform: Platform;
    status: string;
    publishedUrl: string | null;
    publishedAt: Date | null;
  }[];
}> {
  const blog = await prisma.blog.findUnique({
    where: { id: blogId },
    include: { publishRecords: true },
  });

  if (!blog) {
    throw new Error('Blog not found');
  }

  return {
    blogStatus: blog.status,
    platforms: blog.publishRecords.map((record) => ({
      platform: record.platform as Platform,
      status: record.status,
      publishedUrl: record.publishedUrl,
      publishedAt: record.publishedAt,
    })),
  };
}

export async function unpublishFromPlatform(
  blogId: string,
  platform: Platform
): Promise<void> {
  // In a real implementation, we would call the platform's API to unpublish

  await prisma.publishRecord.updateMany({
    where: {
      blogId,
      platform,
    },
    data: {
      status: 'unpublished',
    },
  });

  // Check if still published on any platform
  const remainingPublished = await prisma.publishRecord.count({
    where: {
      blogId,
      status: 'published',
    },
  });

  if (remainingPublished === 0) {
    await prisma.blog.update({
      where: { id: blogId },
      data: { status: 'review' },
    });
  }
}
