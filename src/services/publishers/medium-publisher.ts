import { prisma } from '@/lib/prisma';
import { mediumConverter } from '../converters';
import type { BlogData } from '../converters/base-converter';

interface MediumPublishOptions {
  publishStatus?: 'public' | 'draft' | 'unlisted';
  notifyFollowers?: boolean;
  license?: 'all-rights-reserved' | 'cc-40-by' | 'cc-40-by-sa' | 'cc-40-by-nd' | 'cc-40-by-nc' | 'cc-40-by-nc-nd' | 'cc-40-by-nc-sa' | 'cc-40-zero' | 'public-domain';
}

interface MediumUser {
  id: string;
  username: string;
  name: string;
  url: string;
  imageUrl: string;
}

interface MediumPublishResult {
  success: boolean;
  publishedUrl?: string;
  postId?: string;
  error?: string;
}

const MEDIUM_API_BASE = 'https://api.medium.com/v1';

/**
 * Get the authenticated Medium user
 */
async function getMediumUser(token: string): Promise<MediumUser> {
  const response = await fetch(`${MEDIUM_API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Failed to get Medium user: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Publish content to Medium
 */
export async function publishToMedium(
  blog: BlogData,
  token: string,
  options: MediumPublishOptions = {}
): Promise<MediumPublishResult> {
  try {
    // Get the authenticated user
    const user = await getMediumUser(token);

    // Convert content for Medium
    const converted = mediumConverter.convert(blog);

    // Prepare the post payload
    const payload = {
      title: blog.title,
      contentFormat: 'markdown',
      content: converted.content,
      tags: converted.metadata.tags || [],
      canonicalUrl: blog.canonicalUrl,
      publishStatus: options.publishStatus || 'draft',
      notifyFollowers: options.notifyFollowers ?? false,
      license: options.license || 'all-rights-reserved',
    };

    // Post to Medium
    const response = await fetch(`${MEDIUM_API_BASE}/users/${user.id}/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to publish to Medium: ${error.message || response.statusText}`);
    }

    const result = await response.json();
    const post = result.data;

    // Save publish record to database
    await prisma.publishRecord.upsert({
      where: {
        blogId_platform: {
          blogId: blog.id,
          platform: 'medium',
        },
      },
      create: {
        blogId: blog.id,
        platform: 'medium',
        publishedUrl: post.url,
        publishedAt: new Date(),
        status: 'published',
      },
      update: {
        publishedUrl: post.url,
        publishedAt: new Date(),
        status: 'published',
      },
    });

    return {
      success: true,
      publishedUrl: post.url,
      postId: post.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Save failed publish record
    try {
      await prisma.publishRecord.upsert({
        where: {
          blogId_platform: {
            blogId: blog.id,
            platform: 'medium',
          },
        },
        create: {
          blogId: blog.id,
          platform: 'medium',
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
 * Check if a Medium token is valid
 */
export async function validateMediumToken(token: string): Promise<boolean> {
  try {
    await getMediumUser(token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get publication info for a user
 */
export async function getMediumPublications(token: string): Promise<Array<{ id: string; name: string; url: string }>> {
  const user = await getMediumUser(token);

  const response = await fetch(`${MEDIUM_API_BASE}/users/${user.id}/publications`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get Medium publications');
  }

  const data = await response.json();
  return data.data;
}
