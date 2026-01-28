import { Platform } from '@/types';
import { BasePlatformConverter, BlogData, ConvertedContent, registerConverter } from './base-converter';

class WordPressConverter extends BasePlatformConverter {
  platform: Platform = 'wordpress';

  convert(blog: BlogData): ConvertedContent {
    // Convert to WordPress-compatible HTML
    const content = this.toWordPressHTML(blog.content);

    const metadata = {
      title: blog.title,
      excerpt: this.getExcerpt(blog.content, 300),
      status: 'draft',
      format: 'standard',
      categories: this.getCategoryFromType(blog.blogType),
      tags: this.generateTags(blog.keyword, blog.blogType, 10),
      featured_media: this.extractFirstImage(blog),
      meta: {
        _yoast_wpseo_title: blog.title,
        _yoast_wpseo_metadesc: blog.metaDescription,
        _yoast_wpseo_focuskw: blog.keyword,
        _yoast_wpseo_canonical: blog.canonicalUrl,
      },
    };

    return {
      content,
      metadata,
      platform: this.platform,
    };
  }

  private toWordPressHTML(markdown: string): string {
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Formatting
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Images with WordPress classes
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
        return `<figure class="wp-block-image size-large">
  <img src="${src}" alt="${alt}" title="${alt}">
  ${alt ? `<figcaption>${alt}</figcaption>` : ''}
</figure>`;
      })
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Code blocks as WordPress code block
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<!-- wp:code ${lang ? `{"language":"${lang}"}` : ''} -->
<pre class="wp-block-code"><code${lang ? ` class="language-${lang}"` : ''}>${code.trim()}</code></pre>
<!-- /wp:code -->`;
      })
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Lists
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
      // Blockquotes
      .replace(/^>\s*(.*$)/gim, '<blockquote><p>$1</p></blockquote>');

    // Wrap list items in ul/ol
    html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, (match) => {
      return `<!-- wp:list -->\n<ul class="wp-block-list">${match}</ul>\n<!-- /wp:list -->`;
    });

    // Wrap paragraphs
    html = html
      .split('\n\n')
      .map(para => {
        if (para.startsWith('<') || para.startsWith('<!--')) return para;
        if (para.trim()) {
          return `<!-- wp:paragraph -->\n<p>${para.trim()}</p>\n<!-- /wp:paragraph -->`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');

    return html;
  }

  private getCategoryFromType(blogType: string): string[] {
    const categoryMap: Record<string, string> = {
      guide: 'Tutorials',
      prompt: 'AI & Technology',
      comparison: 'Reviews',
      tips: 'Tips & Tricks',
      usecase: 'Case Studies',
      api: 'Development',
      upcoming: 'News',
      troubleshoot: 'Troubleshooting',
      tools: 'Tools',
      review: 'Reviews',
    };
    return [categoryMap[blogType] || 'Uncategorized'];
  }
}

const wordPressConverter = new WordPressConverter();
registerConverter(wordPressConverter);

export { wordPressConverter };
