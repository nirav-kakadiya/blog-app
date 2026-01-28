import { Platform } from '@/types';
import { BasePlatformConverter, BlogData, ConvertedContent, registerConverter } from './base-converter';

class DevToConverter extends BasePlatformConverter {
  platform: Platform = 'devto';

  convert(blog: BlogData): ConvertedContent {
    return this.safeConvert(blog, (normalizedBlog) => this.doConvert(normalizedBlog));
  }

  private doConvert(blog: BlogData): ConvertedContent {
    const tags = this.generateTags(blog.keyword || '', blog.blogType, 4);
    const coverImage = this.extractFirstImage(blog);

    // Escape special characters in frontmatter values
    const escapeYaml = (str: string): string => {
      if (!str) return '';
      // If contains special chars, wrap in quotes
      if (str.includes(':') || str.includes('#') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
      }
      return str;
    };

    // Dev.to uses frontmatter
    const frontmatter = [
      '---',
      `title: ${escapeYaml(blog.title || blog.keyword || 'Untitled')}`,
      `published: false`,
      `description: ${escapeYaml(this.truncate(blog.metaDescription || '', 200))}`,
      `tags: ${tags.join(', ')}`,
      coverImage ? `cover_image: ${coverImage}` : null,
      blog.canonicalUrl ? `canonical_url: ${blog.canonicalUrl}` : null,
      '---',
    ].filter(Boolean).join('\n');

    // Dev.to supports markdown but has some specific syntax
    let content = blog.content || '';

    // Handle code blocks with proper language hints
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'text';
      const trimmedCode = (code || '').trim();
      return '```' + language + '\n' + trimmedCode + '\n```';
    });

    // Dev.to supports liquid tags for embeds - we leave those as-is

    const fullContent = frontmatter + '\n\n' + content;

    const metadata = {
      title: blog.title || blog.keyword || 'Untitled',
      description: blog.metaDescription || '',
      tags,
      coverImage: coverImage || null,
      canonicalUrl: blog.canonicalUrl || null,
      published: false,
    };

    return {
      content: fullContent,
      metadata,
      platform: this.platform,
    };
  }
}

const devToConverter = new DevToConverter();
registerConverter(devToConverter);

export { devToConverter };
