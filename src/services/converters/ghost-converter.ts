import { Platform } from '@/types';
import { BasePlatformConverter, BlogData, ConvertedContent, registerConverter } from './base-converter';
import { truncateText, markdownToHtml } from './utils';

class GhostConverter extends BasePlatformConverter {
  platform: Platform = 'ghost';

  convert(blog: BlogData): ConvertedContent {
    const markdown = this.prepareMarkdown(blog);
    const mobiledoc = this.toMobiledoc(blog);

    return {
      platform: this.platform,
      content: markdown,
      metadata: this.getMetadata(blog),
      html: markdownToHtml(markdown),
      extra: { mobiledoc },
    };
  }

  private prepareMarkdown(blog: BlogData): string {
    let content = blog.content;

    // Add featured image at top if available
    const heroImage = blog.images?.find(img => img.placement === 'hero');
    if (heroImage) {
      content = `![${heroImage.altText || blog.title}](${heroImage.url})\n\n${content}`;
    }

    return content;
  }

  private toMobiledoc(blog: BlogData): string {
    // Convert to Ghost's mobiledoc format
    const cards: Array<[string, { markdown?: string }]> = [];
    const sections: Array<[number, number]> = [];

    // Add markdown card with full content
    cards.push(['markdown', { markdown: blog.content }]);
    sections.push([10, 0]); // card section referencing first card

    const mobiledoc = {
      version: '0.3.1',
      ghostVersion: '4.0',
      markups: [],
      atoms: [],
      cards,
      sections,
    };

    return JSON.stringify(mobiledoc);
  }

  private getMetadata(blog: BlogData): Record<string, unknown> {
    const heroImage = blog.images?.find(img => img.placement === 'hero');
    const tags = this.generateTags(blog.keyword, blog.blogType, 5);

    return {
      title: blog.title,
      slug: this.generateSlug(blog.title),
      custom_excerpt: blog.metaDescription || truncateText(blog.content, 300),
      meta_title: blog.title,
      meta_description: blog.metaDescription,
      feature_image: heroImage?.url,
      feature_image_alt: heroImage?.altText,
      canonical_url: blog.canonicalUrl,
      tags: tags.map(tag => ({ name: tag })),
      status: 'draft',
      visibility: 'public',
    };
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 191);
  }
}

const ghostConverter = new GhostConverter();
registerConverter(ghostConverter);

export { ghostConverter };
