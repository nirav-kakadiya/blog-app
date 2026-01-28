import { Platform } from '@/types';
import { BasePlatformConverter, BlogData, ConvertedContent, registerConverter } from './base-converter';

class MediumConverter extends BasePlatformConverter {
  platform: Platform = 'medium';

  convert(blog: BlogData): ConvertedContent {
    // Medium supports markdown natively
    let content = blog.content;

    // Remove any HTML that might have slipped in
    content = content.replace(/<[^>]+>/g, '');

    // Ensure proper image markdown (Medium prefers this format)
    content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      return `![${alt || 'Image'}](${src})\n*${alt || ''}*`;
    });

    // Handle code blocks - Medium supports them
    content = content.replace(/```(\w+)\n([\s\S]*?)```/g, (match, lang, code) => {
      return '```' + (lang || '') + '\n' + code.trim() + '\n```';
    });

    // Add canonical URL notice if present
    if (blog.canonicalUrl) {
      content += `\n\n---\n\n*Originally published at [${new URL(blog.canonicalUrl).hostname}](${blog.canonicalUrl})*`;
    }

    const metadata = {
      title: blog.title,
      contentFormat: 'markdown',
      canonicalUrl: blog.canonicalUrl,
      tags: this.generateTags(blog.keyword, blog.blogType, 5),
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
