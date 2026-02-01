import { BlogType, Platform } from '@/types';
import { normalizeMarkdown, extractTitle, extractMetaDescription } from '@/lib/content-normalizer';

export interface BlogData {
  id: string;
  title: string;
  content: string;
  metaDescription: string;
  keyword: string;
  blogType: BlogType;
  canonicalUrl?: string;
  focusKeyword?: string;
  secondaryKeywords?: string[];
  tags?: string[];
  images?: {
    url: string;
    altText: string;
    placement: string;
  }[];
}

export interface ConvertedContent {
  content: string;
  metadata: Record<string, unknown>;
  platform: Platform;
  html?: string;
  extra?: Record<string, unknown>;
  warnings?: string[];
}

export abstract class BasePlatformConverter {
  abstract platform: Platform;
  abstract convert(blog: BlogData): ConvertedContent;

  /**
   * Normalize and validate blog data before conversion
   * Call this at the start of convert() for robust handling
   */
  protected normalizeBlogData(blog: BlogData): BlogData & { _warnings: string[] } {
    const warnings: string[] = [];

    // Normalize content
    const { content: normalizedContent, warnings: contentWarnings, wasModified } = normalizeMarkdown(blog.content);
    if (wasModified) {
      warnings.push(...contentWarnings);
    }

    // Ensure title exists
    let title = blog.title?.trim() || '';
    if (!title) {
      const extractedTitle = extractTitle(normalizedContent);
      if (extractedTitle) {
        title = extractedTitle;
        warnings.push('Title was extracted from content');
      } else {
        title = blog.keyword || 'Untitled';
        warnings.push('Using keyword as fallback title');
      }
    }

    // Ensure meta description exists
    let metaDescription = blog.metaDescription?.trim() || '';
    if (!metaDescription) {
      metaDescription = extractMetaDescription(normalizedContent);
      if (metaDescription) {
        warnings.push('Meta description was extracted from content');
      }
    }

    // Ensure keyword exists
    const keyword = blog.keyword?.trim() || title.split(' ').slice(0, 3).join(' ');

    // Normalize images array
    const images = Array.isArray(blog.images)
      ? blog.images.filter(img => img && typeof img.url === 'string' && img.url)
      : [];

    // Normalize tags/keywords
    const tags = Array.isArray(blog.tags)
      ? blog.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      : [];

    const secondaryKeywords = Array.isArray(blog.secondaryKeywords)
      ? blog.secondaryKeywords.filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
      : [];

    return {
      ...blog,
      content: normalizedContent,
      title,
      metaDescription,
      keyword,
      images,
      tags,
      secondaryKeywords,
      blogType: blog.blogType || 'guide',
      _warnings: warnings,
    };
  }

  /**
   * Wrap conversion with error handling
   */
  protected safeConvert(blog: BlogData, convertFn: (normalizedBlog: BlogData) => ConvertedContent): ConvertedContent {
    try {
      const normalizedBlog = this.normalizeBlogData(blog);
      const result = convertFn(normalizedBlog);

      // Add any normalization warnings
      if (normalizedBlog._warnings.length > 0) {
        result.warnings = [...(result.warnings || []), ...normalizedBlog._warnings];
      }

      return result;
    } catch (error) {
      // Return a safe fallback on conversion error
      const errorMessage = error instanceof Error ? error.message : 'Unknown conversion error';
      return {
        content: blog.content || '',
        metadata: {
          title: blog.title || blog.keyword || 'Untitled',
          error: errorMessage,
        },
        platform: this.platform,
        warnings: [`Conversion failed: ${errorMessage}. Returning raw content.`],
      };
    }
  }

  // Common utilities
  protected stripMarkdown(text: string): string {
    return text
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/\*(.+?)\*/g, '$1') // Italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/`([^`]+)`/g, '$1') // Inline code
      .replace(/```[\s\S]*?```/g, '') // Code blocks
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Images
      .replace(/^[-*+]\s+/gm, '') // List items
      .replace(/^\d+\.\s+/gm, '') // Numbered lists
      .replace(/^>\s+/gm, '') // Blockquotes
      .replace(/---/g, '') // Horizontal rules
      .trim();
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  protected toHTML(markdown: string): string {
    const anchorCounts: Record<string, number> = {};
    const headingReplacer = (level: number) => {
      return (_match: string, text: string) => {
        const base = this.slugify(text);
        const count = anchorCounts[base] || 0;
        anchorCounts[base] = count + 1;
        const id = count > 0 ? `${base}-${count}` : base;
        return `<h${level} id="${id}">${text}</h${level}>`;
      };
    };

    return markdown
      .replace(/^### (.*$)/gim, headingReplacer(3))
      .replace(/^## (.*$)/gim, headingReplacer(2))
      .replace(/^# (.*$)/gim, headingReplacer(1))
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gim, '<p>$1</p>')
      .replace(/<p><h/g, '<h')
      .replace(/<\/h(\d)><\/p>/g, '</h$1>')
      .replace(/<p><ul>/g, '<ul>')
      .replace(/<\/ul><\/p>/g, '</ul>')
      .replace(/<p><pre>/g, '<pre>')
      .replace(/<\/pre><\/p>/g, '</pre>');
  }

  protected truncate(text: string, maxLength: number, ellipsis = '...'): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - ellipsis.length).trim() + ellipsis;
  }

  protected generateTags(keyword: string, blogType: BlogType, limit = 5): string[] {
    const baseTags = keyword.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const typeTags: Record<BlogType, string[]> = {
      guide: ['tutorial', 'howto', 'guide'],
      prompt: ['ai', 'prompts', 'aiart'],
      comparison: ['comparison', 'versus', 'review'],
      tips: ['tips', 'tricks', 'productivity'],
      usecase: ['usecase', 'casestudy', 'business'],
      api: ['api', 'developers', 'programming'],
      upcoming: ['news', 'upcoming', 'technology'],
      troubleshoot: ['troubleshooting', 'fix', 'debugging'],
      tools: ['tools', 'software', 'apps'],
      review: ['review', 'indepth', 'analysis'],
    };

    const allTags = [...new Set([...baseTags, ...typeTags[blogType]])];
    return allTags.slice(0, limit);
  }

  protected extractFirstImage(blog: BlogData): string | undefined {
    const heroImage = blog.images?.find(img => img.placement === 'hero');
    return heroImage?.url || blog.images?.[0]?.url;
  }

  protected getExcerpt(content: string, maxLength = 200): string {
    // Get first paragraph after removing markdown
    const plainText = this.stripMarkdown(content);
    const firstParagraph = plainText.split('\n\n')[0] || plainText;
    return this.truncate(firstParagraph, maxLength);
  }
}

// Converter registry
const converters = new Map<Platform, BasePlatformConverter>();

export function registerConverter(converter: BasePlatformConverter): void {
  converters.set(converter.platform, converter);
}

export function getConverter(platform: Platform): BasePlatformConverter | undefined {
  return converters.get(platform);
}

export function getAllConverters(): BasePlatformConverter[] {
  return Array.from(converters.values());
}

export function convertForPlatform(blog: BlogData, platform: Platform): ConvertedContent {
  const converter = getConverter(platform);
  if (!converter) {
    throw new Error(`No converter found for platform: ${platform}`);
  }
  return converter.convert(blog);
}
