/**
 * Utility functions for platform converters
 */

/**
 * Truncate text to a specified length, adding ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + '...';
}

/**
 * Strip markdown formatting from text
 */
export function stripMarkdown(text: string): string {
  return text
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Convert markdown to basic HTML
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML entities first
  html = html.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert headers with id attributes for TOC anchor links
  const anchorCounts: Record<string, number> = {};
  function headingReplacer(level: number) {
    return (_match: string, text: string) => {
      const base = slugify(text);
      const count = anchorCounts[base] || 0;
      anchorCounts[base] = count + 1;
      const id = count > 0 ? `${base}-${count}` : base;
      return `<h${level} id="${id}">${text}</h${level}>`;
    };
  }

  html = html.replace(/^### (.+)$/gm, headingReplacer(3));
  html = html.replace(/^## (.+)$/gm, headingReplacer(2));
  html = html.replace(/^# (.+)$/gm, headingReplacer(1));

  // Convert bold and italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Convert links (block javascript:/data: protocols for XSS prevention)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, url: string) => {
    if (/^\s*(javascript|data|vbscript):/i.test(url)) return text;
    return `<a href="${url}">${text}</a>`;
  });

  // Convert images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Convert inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Convert code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const langAttr = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${langAttr}>${code.trim()}</code></pre>`;
  });

  // Convert blockquotes
  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  // Convert unordered lists
  const ulRegex = /(?:^[-*]\s+.+\n?)+/gm;
  html = html.replace(ulRegex, (match) => {
    const items = match.trim().split('\n')
      .map(item => item.replace(/^[-*]\s+/, ''))
      .map(item => `<li>${item}</li>`)
      .join('\n');
    return `<ul>\n${items}\n</ul>`;
  });

  // Convert ordered lists
  const olRegex = /(?:^\d+\.\s+.+\n?)+/gm;
  html = html.replace(olRegex, (match) => {
    const items = match.trim().split('\n')
      .map(item => item.replace(/^\d+\.\s+/, ''))
      .map(item => `<li>${item}</li>`)
      .join('\n');
    return `<ol>\n${items}\n</ol>`;
  });

  // Convert paragraphs (double newlines)
  html = html.replace(/\n\n+/g, '</p>\n<p>');
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>(<h[123]>)/g, '$1');
  html = html.replace(/(<\/h[123]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ol>)/g, '$1');
  html = html.replace(/(<\/ol>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote>)/g, '$1');
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');

  return html;
}

/**
 * Escape HTML entities
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate URL-friendly slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

/**
 * Extract plain text from markdown content
 */
export function extractPlainText(markdown: string): string {
  return stripMarkdown(markdown);
}
