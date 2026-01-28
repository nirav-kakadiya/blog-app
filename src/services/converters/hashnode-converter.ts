import { Platform } from '@/types';
import { BasePlatformConverter, BlogData, ConvertedContent, registerConverter } from './base-converter';
import { markdownToHtml } from './utils';

class HashnodeConverter extends BasePlatformConverter {
  platform: Platform = 'hashnode';

  convert(blog: BlogData): ConvertedContent {
    const markdown = this.prepareMarkdown(blog);
    const frontmatter = this.generateFrontmatter(blog);
    const fullContent = `${frontmatter}\n\n${markdown}`;

    return {
      platform: this.platform,
      content: fullContent,
      metadata: this.getMetadata(blog),
      html: markdownToHtml(markdown),
    };
  }

  private prepareMarkdown(blog: BlogData): string {
    let content = blog.content;

    // Hashnode supports standard markdown
    // Ensure code blocks have language hints for better highlighting
    content = content.replace(/```\n/g, '```plaintext\n');

    return content;
  }

  private generateFrontmatter(blog: BlogData): string {
    const heroImage = blog.images?.find(img => img.placement === 'hero');
    const tags = this.generateTags(blog.keyword, blog.blogType, 5);
    const slug = this.generateSlug(blog.title);

    const frontmatterFields = [
      '---',
      `title: "${this.escapeYaml(blog.title)}"`,
      `slug: "${slug}"`,
      `seoTitle: "${this.escapeYaml(blog.title)}"`,
      `seoDescription: "${this.escapeYaml(blog.metaDescription || '')}"`,
    ];

    if (heroImage) {
      frontmatterFields.push(`coverImage: "${heroImage.url}"`);
      if (heroImage.altText) {
        frontmatterFields.push(`coverImageAlt: "${this.escapeYaml(heroImage.altText)}"`);
      }
    }

    frontmatterFields.push(`tags: [${tags.map(t => `"${t}"`).join(', ')}]`);
    frontmatterFields.push('published: false');
    frontmatterFields.push('enableTableOfContents: true');

    if (blog.canonicalUrl) {
      frontmatterFields.push(`canonical: "${blog.canonicalUrl}"`);
    }

    frontmatterFields.push('---');

    return frontmatterFields.join('\n');
  }

  private escapeYaml(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\n/g, ' ');
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100);
  }

  private getMetadata(blog: BlogData): Record<string, unknown> {
    const heroImage = blog.images?.find(img => img.placement === 'hero');
    const tags = this.generateTags(blog.keyword, blog.blogType, 5);

    return {
      title: blog.title,
      slug: this.generateSlug(blog.title),
      coverImage: heroImage?.url,
      tags,
      canonicalUrl: blog.canonicalUrl,
      isPublished: false,
    };
  }
}

const hashnodeConverter = new HashnodeConverter();
registerConverter(hashnodeConverter);

export { hashnodeConverter };
