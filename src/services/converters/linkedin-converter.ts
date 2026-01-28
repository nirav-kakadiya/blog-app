import { Platform } from '@/types';
import { BasePlatformConverter, BlogData, ConvertedContent, registerConverter } from './base-converter';

class LinkedInConverter extends BasePlatformConverter {
  platform: Platform = 'linkedin';

  convert(blog: BlogData): ConvertedContent {
    // LinkedIn supports two formats: posts (short) and articles (long)
    const isArticle = blog.content.length > 3000;

    if (isArticle) {
      return this.convertArticle(blog);
    }
    return this.convertPost(blog);
  }

  private convertPost(blog: BlogData): ConvertedContent {
    // LinkedIn posts are plain text, max ~3000 characters
    const maxLength = 2800; // Leave room for hashtags

    // Convert to plain text
    let content = this.stripMarkdown(blog.content);

    // Keep TL;DR section if exists
    const tldrMatch = blog.content.match(/##\s*TL;?DR[\s\S]*?(?=##|$)/i);
    if (tldrMatch) {
      content = this.stripMarkdown(tldrMatch[0]) + '\n\n' + content;
    }

    // Truncate if needed
    if (content.length > maxLength) {
      content = this.truncate(content, maxLength - 100);
      content += '\n\nRead more in the full article...';
    }

    // Add hashtags
    const hashtags = this.generateTags(blog.keyword, blog.blogType, 5)
      .map(tag => `#${tag.replace(/\s+/g, '')}`)
      .join(' ');

    content = content + '\n\n' + hashtags;

    // Add canonical URL if present
    if (blog.canonicalUrl) {
      content += `\n\n${blog.canonicalUrl}`;
    }

    const metadata = {
      title: blog.title,
      format: 'post',
      characterCount: content.length,
      hasLink: !!blog.canonicalUrl,
    };

    return {
      content,
      metadata,
      platform: this.platform,
    };
  }

  private convertArticle(blog: BlogData): ConvertedContent {
    // LinkedIn articles support rich text (similar to HTML)
    let content = `<h1>${blog.title}</h1>\n\n`;

    // Convert markdown to LinkedIn-compatible HTML
    content += this.toLinkedInHTML(blog.content);

    // Add canonical attribution
    if (blog.canonicalUrl) {
      content += `\n\n<p><em>Originally published at <a href="${blog.canonicalUrl}">${new URL(blog.canonicalUrl).hostname}</a></em></p>`;
    }

    const metadata = {
      title: blog.title,
      format: 'article',
      description: blog.metaDescription,
      coverImage: this.extractFirstImage(blog),
    };

    return {
      content,
      metadata,
      platform: this.platform,
    };
  }

  private toLinkedInHTML(markdown: string): string {
    // LinkedIn articles have limited HTML support
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h2>$1</h2>') // LinkedIn doesn't use h1 in body
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure><img src="$2" alt="$1"><figcaption>$1</figcaption></figure>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/```[\s\S]*?```/g, (match) => {
        const code = match.replace(/```\w*\n?/g, '').trim();
        return `<pre>${code}</pre>`;
      })
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^([^<].*[^>])$/gim, '<p>$1</p>');
  }
}

const linkedInConverter = new LinkedInConverter();
registerConverter(linkedInConverter);

export { linkedInConverter };
