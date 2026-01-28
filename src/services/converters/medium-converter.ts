import { Platform } from '@/types';
import { BasePlatformConverter, BlogData, ConvertedContent, registerConverter } from './base-converter';

class MediumConverter extends BasePlatformConverter {
  platform: Platform = 'medium';

  convert(blog: BlogData): ConvertedContent {
    return this.safeConvert(blog, (normalizedBlog) => this.doConvert(normalizedBlog));
  }

  private doConvert(blog: BlogData): ConvertedContent {
    // Medium supports markdown natively
    let content = blog.content || '';

    // Remove any HTML that might have slipped in
    content = content.replace(/<[^>]+>/g, '');

    // Ensure proper image markdown (Medium prefers this format)
    content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      // Validate URL before using
      try {
        new URL(src);
        return `![${alt || 'Image'}](${src})\n*${alt || ''}*`;
      } catch {
        // Invalid URL, keep original or skip
        return match;
      }
    });

    // Handle code blocks - Medium supports them
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || '';
      const trimmedCode = (code || '').trim();
      return '```' + language + '\n' + trimmedCode + '\n```';
    });

    // Add canonical URL notice if present and valid
    if (blog.canonicalUrl) {
      try {
        const url = new URL(blog.canonicalUrl);
        content += `\n\n---\n\n*Originally published at [${url.hostname}](${blog.canonicalUrl})*`;
      } catch {
        // Invalid canonical URL, skip
      }
    }

    const metadata = {
      title: blog.title || blog.keyword || 'Untitled',
      contentFormat: 'markdown',
      canonicalUrl: blog.canonicalUrl || null,
      tags: this.generateTags(blog.keyword || '', blog.blogType, 5),
      publishStatus: 'draft',
    };

    return {
      content,
      metadata,
      platform: this.platform,
    };
  }
}

const mediumConverter = new MediumConverter();
registerConverter(mediumConverter);

export { mediumConverter };
