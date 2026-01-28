import { Platform } from '@/types';
import { BasePlatformConverter, BlogData, ConvertedContent, registerConverter } from './base-converter';

class DevToConverter extends BasePlatformConverter {
  platform: Platform = 'devto';

  convert(blog: BlogData): ConvertedContent {
    const tags = this.generateTags(blog.keyword, blog.blogType, 4);
    const coverImage = this.extractFirstImage(blog);

    // Dev.to uses frontmatter
    const frontmatter = [
      '---',
      `title: ${blog.title}`,
      `published: false`,
      `description: ${this.truncate(blog.metaDescription, 200)}`,
      `tags: ${tags.join(', ')}`,
      coverImage ? `cover_image: ${coverImage}` : null,
      blog.canonicalUrl ? `canonical_url: ${blog.canonicalUrl}` : null,
      '---',
    ].filter(Boolean).join('\n');

    // Dev.to supports markdown but has some specific syntax
    let content = blog.content;

    // Handle code blocks with proper language hints
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return '```' + (lang || 'text') + '\n' + code.trim() + '\n```';
    });

    // Dev.to supports liquid tags for embeds - we leave those as-is

    const fullContent = frontmatter + '\n\n' + content;

    const metadata = {
      title: blog.title,
      description: blog.metaDescription,
      tags,
      coverImage,
      canonicalUrl: blog.canonicalUrl,
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
