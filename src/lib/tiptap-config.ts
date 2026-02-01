import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlock from '@tiptap/extension-code-block';
import Placeholder from '@tiptap/extension-placeholder';

/**
 * Custom Heading extension that adds id attributes based on text content,
 * enabling TOC anchor link navigation in the editor
 */
const HeadingWithId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        renderHTML(attributes) {
          // Will be set dynamically via the rendered text
          return attributes.id ? { id: attributes.id } : {};
        },
      },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level || 1;
    const text = node.textContent || '';
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return [`h${level}`, { ...HTMLAttributes, id }, 0];
  },
});

export const getTiptapExtensions = (placeholder?: string) => [
  StarterKit.configure({
    heading: false, // Disable default heading, use custom HeadingWithId
    codeBlock: false,
  }),
  HeadingWithId.configure({
    levels: [1, 2, 3],
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'text-blue-600 hover:underline cursor-pointer',
    },
  }),
  Image.configure({
    inline: false,
    allowBase64: true,
    HTMLAttributes: {
      class: 'max-w-full h-auto rounded-lg my-4',
    },
  }),
  CodeBlock.configure({
    HTMLAttributes: {
      class: 'bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4 font-mono text-sm',
    },
  }),
  Placeholder.configure({
    placeholder: placeholder || 'Start writing your blog post...',
  }),
];

export const editorStyles = `
  .ProseMirror {
    outline: none;
    min-height: 400px;
    padding: 1rem;
  }

  .ProseMirror h1 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 1rem;
    line-height: 1.2;
  }

  .ProseMirror h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    line-height: 1.3;
  }

  .ProseMirror h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }

  .ProseMirror p {
    margin-bottom: 0.75rem;
    line-height: 1.7;
  }

  .ProseMirror ul,
  .ProseMirror ol {
    padding-left: 1.5rem;
    margin-bottom: 0.75rem;
  }

  .ProseMirror li {
    margin-bottom: 0.25rem;
  }

  .ProseMirror blockquote {
    border-left: 3px solid #e5e7eb;
    padding-left: 1rem;
    margin: 1rem 0;
    color: #6b7280;
    font-style: italic;
  }

  .ProseMirror code {
    background-color: #f3f4f6;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: monospace;
    font-size: 0.875rem;
  }

  .ProseMirror pre code {
    background: none;
    padding: 0;
  }

  .ProseMirror hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 1.5rem 0;
  }

  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: #9ca3af;
    pointer-events: none;
    height: 0;
  }

  .ProseMirror a {
    color: #2563eb;
    text-decoration: underline;
    cursor: pointer;
  }

  .ProseMirror a:hover {
    color: #1d4ed8;
  }

  .ProseMirror img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 1rem 0;
  }

  .ProseMirror strong {
    font-weight: 600;
  }

  .ProseMirror em {
    font-style: italic;
  }
`;

export function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function markdownToHtml(markdown: string): string {
  // Basic markdown to HTML conversion
  // This is simplified - for production, use a proper markdown parser
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

  return markdown
    .replace(/^### (.*$)/gim, headingReplacer(3))
    .replace(/^## (.*$)/gim, headingReplacer(2))
    .replace(/^# (.*$)/gim, headingReplacer(1))
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m: string, text: string, url: string) => {
      // Block javascript: and data: protocol links (XSS prevention)
      if (/^\s*(javascript|data|vbscript):/i.test(url)) return text;
      return `<a href="${url}">${text}</a>`;
    })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gim, '<p>$1</p>')
    .replace(/<p><h/g, '<h')
    .replace(/<\/h(\d)><\/p>/g, '</h$1>')
    .replace(/<p><li>/g, '<ul><li>')
    .replace(/<\/li><\/p>/g, '</li></ul>');
}

export function htmlToMarkdown(html: string): string {
  // Basic HTML to markdown conversion
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '![$1]($2)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<ul[^>]*>|<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>|<\/ol>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
