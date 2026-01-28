import { BlogType, Platform } from '@/types';

export interface BlogData {
  id: string;
  title: string;
  content: string;
  metaDescription: string;
  keyword: string;
  blogType: BlogType;
  canonicalUrl?: string;
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
}

export abstract class BasePlatformConverter {
  abstract platform: Platform;
  abstract convert(blog: BlogData): ConvertedContent;

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

  protected toHTML(markdown: string): string {
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
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
