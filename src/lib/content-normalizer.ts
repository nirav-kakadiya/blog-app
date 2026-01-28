/**
 * Content Normalizer - Handles unusual or malformed LLM output
 * Makes content safe for preview and publishing across platforms
 */

export interface NormalizationResult {
  content: string;
  warnings: string[];
  wasModified: boolean;
}

/**
 * Normalize blog content to ensure consistent markdown format
 */
export function normalizeMarkdown(rawContent: string | undefined | null): NormalizationResult {
  const warnings: string[] = [];
  let wasModified = false;

  // Handle null/undefined/non-string input
  if (rawContent == null || typeof rawContent !== 'string') {
    return {
      content: '',
      warnings: ['Content was empty or invalid'],
      wasModified: true,
    };
  }

  let content = rawContent;

  // Remove any BOM or invisible characters at the start
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
    wasModified = true;
    warnings.push('Removed BOM character');
  }

  // Remove markdown code fence wrapper if LLM wrapped entire response
  const fenceMatch = content.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/);
  if (fenceMatch) {
    content = fenceMatch[1];
    wasModified = true;
    warnings.push('Removed outer markdown code fence');
  }

  // Fix common LLM formatting issues

  // 1. Fix inconsistent header levels (ensure proper hierarchy)
  content = fixHeaderHierarchy(content);

  // 2. Normalize line endings
  const originalLength = content.length;
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (content.length !== originalLength) {
    wasModified = true;
  }

  // 3. Fix excessive blank lines (more than 2 consecutive)
  const beforeBlankFix = content;
  content = content.replace(/\n{4,}/g, '\n\n\n');
  if (content !== beforeBlankFix) {
    wasModified = true;
    warnings.push('Fixed excessive blank lines');
  }

  // 4. Fix broken markdown links [text](url with spaces)
  content = content.replace(/\[([^\]]+)\]\(([^)]*\s[^)]*)\)/g, (match, text, url) => {
    // Only fix if URL contains spaces (not properly encoded)
    if (url.includes(' ') && !url.includes('%20')) {
      const fixedUrl = url.replace(/\s+/g, '%20');
      wasModified = true;
      warnings.push('Fixed URL with spaces in markdown link');
      return `[${text}](${fixedUrl})`;
    }
    return match;
  });

  // 5. Fix unclosed code blocks
  const codeBlockCount = (content.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    content += '\n```';
    wasModified = true;
    warnings.push('Added missing code block closure');
  }

  // 6. Fix HTML entities that should be escaped in markdown
  content = content.replace(/&nbsp;/g, ' ');
  content = content.replace(/&mdash;/g, '—');
  content = content.replace(/&ndash;/g, '–');
  content = content.replace(/&hellip;/g, '...');

  // 7. Remove any HTML comments
  const beforeHtmlComments = content;
  content = content.replace(/<!--[\s\S]*?-->/g, '');
  if (content !== beforeHtmlComments) {
    wasModified = true;
    warnings.push('Removed HTML comments');
  }

  // 8. Fix tables with inconsistent columns
  content = fixMarkdownTables(content);

  // 9. Ensure content ends with newline
  if (content.length > 0 && !content.endsWith('\n')) {
    content += '\n';
    wasModified = true;
  }

  // 10. Trim leading/trailing whitespace while preserving structure
  content = content.trim() + '\n';

  return {
    content,
    warnings,
    wasModified,
  };
}

/**
 * Fix header hierarchy to prevent skipping levels
 */
function fixHeaderHierarchy(content: string): string {
  const lines = content.split('\n');
  let lastLevel = 0;
  let modified = false;

  const fixedLines = lines.map(line => {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const currentLevel = headerMatch[1].length;
      const text = headerMatch[2];

      // If we skip more than one level, fix it
      if (lastLevel > 0 && currentLevel > lastLevel + 1) {
        const newLevel = lastLevel + 1;
        modified = true;
        lastLevel = newLevel;
        return '#'.repeat(newLevel) + ' ' + text;
      }

      lastLevel = currentLevel;
    }
    return line;
  });

  return modified ? fixedLines.join('\n') : content;
}

/**
 * Fix markdown tables with inconsistent column counts
 */
function fixMarkdownTables(content: string): string {
  const tableRegex = /(\|[^\n]+\|\n)(\|[-:\s|]+\|\n)((?:\|[^\n]+\|\n)*)/g;

  return content.replace(tableRegex, (match, headerRow, separatorRow, bodyRows) => {
    try {
      const headerCols = (headerRow.match(/\|/g) || []).length - 1;
      const separatorCols = (separatorRow.match(/\|/g) || []).length - 1;

      // If they match, table is fine
      if (headerCols === separatorCols) {
        return match;
      }

      // Fix separator row to match header columns
      const targetCols = headerCols;
      const cells = separatorRow.trim().split('|').filter(Boolean);

      while (cells.length < targetCols) {
        cells.push('---');
      }
      while (cells.length > targetCols) {
        cells.pop();
      }

      const fixedSeparator = '|' + cells.join('|') + '|\n';
      return headerRow + fixedSeparator + bodyRows;
    } catch {
      // If table parsing fails, return original
      return match;
    }
  });
}

/**
 * Extract title from markdown content if missing
 */
export function extractTitle(content: string): string | null {
  // Try to find H1
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Try to find first H2
  const h2Match = content.match(/^##\s+(.+)$/m);
  if (h2Match) {
    return h2Match[1].trim();
  }

  // Try first line if it looks like a title
  const firstLine = content.split('\n')[0]?.trim();
  if (firstLine && firstLine.length > 5 && firstLine.length < 150 && !firstLine.startsWith('-') && !firstLine.startsWith('*')) {
    return firstLine;
  }

  return null;
}

/**
 * Extract meta description from content if not provided
 */
export function extractMetaDescription(content: string, maxLength: number = 155): string {
  // Try to find TL;DR section
  const tldrMatch = content.match(/##\s*TL;DR[^\n]*\n+([\s\S]*?)(?=\n##|\n---|\n\*\*|$)/i);
  if (tldrMatch) {
    const tldrContent = tldrMatch[1]
      .replace(/^[-*]\s+/gm, '')
      .replace(/\n+/g, ' ')
      .trim();
    if (tldrContent.length > 20) {
      return tldrContent.slice(0, maxLength).trim();
    }
  }

  // Try first paragraph after title
  const paraMatch = content.match(/^#[^\n]+\n+([^#\n][^\n]{50,})/m);
  if (paraMatch) {
    return paraMatch[1].slice(0, maxLength).trim();
  }

  // Fall back to first meaningful paragraph
  const paragraphs = content.split(/\n\n+/);
  for (const para of paragraphs) {
    const cleaned = para.replace(/^[#*-]\s*/gm, '').trim();
    if (cleaned.length > 50 && !cleaned.startsWith('|') && !cleaned.startsWith('```')) {
      return cleaned.slice(0, maxLength).trim();
    }
  }

  return '';
}

/**
 * Validate blog data structure for preview
 */
export function validateBlogData(data: unknown): {
  isValid: boolean;
  errors: string[];
  sanitized: Record<string, unknown>;
} {
  const errors: string[] = [];
  const sanitized: Record<string, unknown> = {};

  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: ['Blog data must be an object'],
      sanitized: {},
    };
  }

  const blog = data as Record<string, unknown>;

  // Required fields with defaults
  sanitized.id = typeof blog.id === 'string' ? blog.id : '';
  if (!sanitized.id) errors.push('Missing blog ID');

  sanitized.title = typeof blog.title === 'string' ? blog.title : '';
  sanitized.content = typeof blog.content === 'string' ? blog.content : '';
  sanitized.keyword = typeof blog.keyword === 'string' ? blog.keyword : '';
  sanitized.blogType = typeof blog.blogType === 'string' ? blog.blogType : 'guide';
  sanitized.metaDescription = typeof blog.metaDescription === 'string' ? blog.metaDescription : '';

  // Optional fields
  sanitized.canonicalUrl = typeof blog.canonicalUrl === 'string' ? blog.canonicalUrl : undefined;
  sanitized.focusKeyword = typeof blog.focusKeyword === 'string' ? blog.focusKeyword : undefined;
  sanitized.secondaryKeywords = Array.isArray(blog.secondaryKeywords)
    ? blog.secondaryKeywords.filter((k): k is string => typeof k === 'string')
    : [];
  sanitized.tags = Array.isArray(blog.tags)
    ? blog.tags.filter((t): t is string => typeof t === 'string')
    : [];

  // Handle images array
  if (Array.isArray(blog.images)) {
    sanitized.images = blog.images.map((img: unknown) => {
      if (!img || typeof img !== 'object') {
        return { url: '', altText: '', placement: 'hero' };
      }
      const imgObj = img as Record<string, unknown>;
      return {
        url: typeof imgObj.url === 'string' ? imgObj.url : (typeof imgObj.s3Url === 'string' ? imgObj.s3Url : ''),
        altText: typeof imgObj.altText === 'string' ? imgObj.altText : '',
        placement: typeof imgObj.placement === 'string' ? imgObj.placement : 'hero',
      };
    }).filter((img: { url: string }) => img.url);
  } else {
    sanitized.images = [];
  }

  // If no content, it's invalid
  if (!sanitized.content) {
    errors.push('Blog has no content');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
