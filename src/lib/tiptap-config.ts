import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlock from '@tiptap/extension-code-block';
import Placeholder from '@tiptap/extension-placeholder';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import Dropcursor from '@tiptap/extension-dropcursor';
import { marked, Renderer } from 'marked';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

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
  Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        alt: {
          default: '',
        },
      };
    },
    draggable: true,
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('imageSelect'),
          props: {
            decorations: (state) => {
              const { doc, selection } = state;
              const decorations: Decoration[] = [];

              doc.descendants((node, pos) => {
                if (node.type.name === 'image') {
                  const isSelected = selection.from <= pos && selection.to >= pos + node.nodeSize;
                  if (isSelected) {
                    decorations.push(
                      Decoration.node(pos, pos + node.nodeSize, {
                        class: 'selected-image',
                      })
                    );
                  }
                }
              });

              return DecorationSet.create(state.doc, decorations);
            },
          },
        }),
      ];
    },
  }).configure({
    inline: false,
    allowBase64: true,
    HTMLAttributes: {
      class: 'max-w-full h-auto rounded-lg my-4 cursor-pointer',
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
  Dropcursor.configure({
    color: '#3b82f6',
    width: 2,
  }),
  BubbleMenu.configure({
    element: document.createElement('div'),
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
    transition: all 0.2s;
  }

  .ProseMirror img:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .ProseMirror .selected-image img {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .ProseMirror .ProseMirror-selectednode {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
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
  if (!markdown) return '';

  const anchorCounts: Record<string, number> = {};
  const renderer = new Renderer();

  // Add id attributes to headings for TOC anchor links
  renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
    const plainText = text.replace(/<[^>]+>/g, '');
    const base = slugify(plainText);
    const count = anchorCounts[base] || 0;
    anchorCounts[base] = count + 1;
    const id = count > 0 ? `${base}-${count}` : base;
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };

  // Block dangerous URL protocols (XSS prevention)
  renderer.link = ({ href, text }: { href: string; text: string }) => {
    if (/^\s*(javascript|data|vbscript):/i.test(href)) return text;
    return `<a href="${href}">${text}</a>`;
  };

  return marked(markdown, { renderer, async: false }) as string;
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
