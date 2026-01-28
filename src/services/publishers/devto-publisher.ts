import { prisma } from '@/lib/prisma';
import { devToConverter } from '../converters';
import type { BlogData } from '../converters/base-converter';

interface DevToPublishOptions {
  published?: boolean;
  series?: string;
  organizationId?: number;
}

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  slug: string;
  published: boolean;
  published_at?: string;
  tags: string[];
}

interface DevToPublishResult {
  success: boolean;
  publishedUrl?: string;
  articleId?: number;
  error?: string;
}

const DEVTO_API_BASE = 'https://dev.to/api';

/**
 * Validate Dev.to API key by fetching user info
 */
async function validateDevToKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${DEVTO_API_BASE}/users/me`, {
      headers: {
        'api-key': apiKey,
        Accept: 'application/vnd.forem.api-v1+json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Publish content to Dev.to
 */
export async function publishToDevTo(
  blog: BlogData,
  apiKey: string,
  options: DevToPublishOptions = {}
): Promise<DevToPublishResult> {
  try {
    // Convert content for Dev.to
    const converted = devToConverter.convert(blog);

    // Extract hero image for cover
    const coverImage = blog.images?.find(img => img.placement === 'hero')?.url;

    // Prepare article payload
    const payload = {
      article: {
        title: blog.title,
        body_markdown: converted.content,
        published: options.published ?? false,
        main_image: coverImage,
        canonical_url: blog.canonicalUrl,
        description: blog.metaDescription?.slice(0, 150),
        tags: converted.metadata.tags || [],
        series: options.series,
        organization_id: options.organizationId,
      },
    };

    // Post to Dev.to
    const response = await fetch(`${DEVTO_API_BASE}/articles`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.forem.api-v1+json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to publish to Dev.to: ${error.error || response.statusText}`);
    }

    const article: DevToArticle = await response.json();

    // Save publish record to database
    await prisma.publishRecord.upsert({
      where: {
        blogId_platform: {
          blogId: blog.id,
          platform: 'devto',
        },
      },
      create: {
        blogId: blog.id,
        platform: 'devto',
        publishedUrl: article.url,
        publishedAt: article.published_at ? new Date(article.published_at) : null,
        status: article.published ? 'published' : 'draft',
      },
      update: {
        publishedUrl: article.url,
        publishedAt: article.published_at ? new Date(article.published_at) : null,
        status: article.published ? 'published' : 'draft',
      },
    });

    return {
      success: true,
      publishedUrl: article.url,
      articleId: article.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Save failed publish record
    try {
      await prisma.publishRecord.upsert({
        where: {
          blogId_platform: {
            blogId: blog.id,
            platform: 'devto',
          },
        },
        create: {
          blogId: blog.id,
          platform: 'devto',
          status: 'failed',
        },
        update: {
          status: 'failed',
        },
      });
    } catch {
      // Ignore database errors
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Update an existing Dev.to article
 */
export async function updateDevToArticle(
  blog: BlogData,
  apiKey: string,
  articleId: number,
  options: DevToPublishOptions = {}
): Promise<DevToPublishResult> {
  try {
    // Convert content for Dev.to
    const converted = devToConverter.convert(blog);

    // Extract hero image for cover
    const coverImage = blog.images?.find(img => img.placement === 'hero')?.url;

    // Prepare update payload
    const payload = {
      article: {
        title: blog.title,
        body_markdown: converted.content,
        published: options.published,
        main_image: coverImage,
        canonical_url: blog.canonicalUrl,
        description: blog.metaDescription?.slice(0, 150),
        tags: converted.metadata.tags || [],
        series: options.series,
      },
    };

    // Update on Dev.to
    const response = await fetch(`${DEVTO_API_BASE}/articles/${articleId}`, {
      method: 'PUT',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.forem.api-v1+json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to update Dev.to article: ${error.error || response.statusText}`);
    }

    const article: DevToArticle = await response.json();

    // Update publish record
    await prisma.publishRecord.updateMany({
      where: {
        blogId: blog.id,
        platform: 'devto',
      },
      data: {
        publishedUrl: article.url,
        publishedAt: article.published_at ? new Date(article.published_at) : null,
        status: article.published ? 'published' : 'draft',
      },
    });

    return {
      success: true,
      publishedUrl: article.url,
      articleId: article.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get user's Dev.to articles
 */
export async function getDevToArticles(
  apiKey: string,
  page = 1,
  perPage = 30
): Promise<DevToArticle[]> {
  const response = await fetch(
    `${DEVTO_API_BASE}/articles/me?page=${page}&per_page=${perPage}`,
    {
      headers: {
        'api-key': apiKey,
        Accept: 'application/vnd.forem.api-v1+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get Dev.to articles');
  }

  return response.json();
}

/**
 * Get a specific Dev.to article by ID
 */
export async function getDevToArticle(
  apiKey: string,
  articleId: number
): Promise<DevToArticle> {
  const response = await fetch(`${DEVTO_API_BASE}/articles/${articleId}`, {
    headers: {
      'api-key': apiKey,
      Accept: 'application/vnd.forem.api-v1+json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Dev.to article');
  }

  return response.json();
}

/**
 * Check if Dev.to API key is valid
 */
export { validateDevToKey };
