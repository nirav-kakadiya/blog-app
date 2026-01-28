import { Platform } from '@/types';
import { BasePlatformConverter, BlogData, ConvertedContent, registerConverter } from './base-converter';
import { truncateText, stripMarkdown } from './utils';

class QuoraConverter extends BasePlatformConverter {
  platform: Platform = 'quora';

  convert(blog: BlogData): ConvertedContent {
    // Quora uses its own rich text format, but content can be pasted as plain text
    // Convert to conversational, answer-style format
    const answerFormat = this.toAnswerFormat(blog);
    const questionSuggestions = this.generateQuestions(blog);

    return {
      platform: this.platform,
      content: answerFormat,
      metadata: this.getMetadata(blog),
      extra: {
        questionSuggestions,
        fullAnswer: answerFormat,
        shortAnswer: this.toShortAnswer(blog),
      },
    };
  }

  private toAnswerFormat(blog: BlogData): string {
    const lines: string[] = [];

    // Start with a conversational hook
    lines.push(this.createHook(blog));
    lines.push('');

    // Convert main content to conversational style
    const sections = this.extractSections(blog.content);

    for (const section of sections) {
      // Skip TL;DR and FAQ sections for Quora
      if (section.title.toLowerCase().includes('tl;dr') ||
          section.title.toLowerCase().includes('faq') ||
          section.title.toLowerCase().includes('frequently asked')) {
        continue;
      }

      // Convert headers to bold statements
      if (section.title) {
        lines.push(`**${section.title}**`);
        lines.push('');
      }

      // Clean up content - remove markdown formatting but keep structure
      const cleanContent = this.makeConversational(section.content);
      lines.push(cleanContent);
      lines.push('');
    }

    // Add a conversational closing
    lines.push(this.createClosing(blog));

    return lines.join('\n').trim();
  }

  private createHook(blog: BlogData): string {
    const keyword = blog.focusKeyword || blog.keyword;
    return `Great question! As someone who has worked extensively with ${keyword}, I can share what I've learned.`;
  }

  private createClosing(blog: BlogData): string {
    const keyword = blog.focusKeyword || blog.keyword;
    return `Hope this helps! If you have more questions about ${keyword}, feel free to ask.`;
  }

  private extractSections(content: string): Array<{ title: string; content: string }> {
    const sections: Array<{ title: string; content: string }> = [];
    const lines = content.split('\n');

    let currentTitle = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const headerMatch = line.match(/^#{1,3}\s+(.+)$/);

      if (headerMatch) {
        if (currentContent.length > 0) {
          sections.push({
            title: currentTitle,
            content: currentContent.join('\n').trim(),
          });
        }
        currentTitle = headerMatch[1];
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // Don't forget the last section
    if (currentContent.length > 0) {
      sections.push({
        title: currentTitle,
        content: currentContent.join('\n').trim(),
      });
    }

    return sections;
  }

  private makeConversational(content: string): string {
    let text = stripMarkdown(content);

    // Remove excessive line breaks
    text = text.replace(/\n{3,}/g, '\n\n');

    // Convert bullet points to readable format
    text = text.replace(/^[-*]\s+/gm, '- ');

    // Limit paragraph length for readability
    const paragraphs = text.split('\n\n');
    const processedParagraphs = paragraphs.map(p => {
      if (p.length > 500) {
        return truncateText(p, 500);
      }
      return p;
    });

    return processedParagraphs.join('\n\n');
  }

  private toShortAnswer(blog: BlogData): string {
    // Extract TL;DR or create a short summary
    const tldrMatch = blog.content.match(/##?\s*TL;DR[\s\S]*?(?=##|$)/i);

    if (tldrMatch) {
      return stripMarkdown(tldrMatch[0]).replace(/TL;DR:?/i, '').trim();
    }

    // Otherwise, take first meaningful paragraph
    const firstParagraph = blog.content
      .split('\n\n')
      .find(p => p.length > 100 && !p.startsWith('#'));

    if (firstParagraph) {
      return truncateText(stripMarkdown(firstParagraph), 300);
    }

    return blog.metaDescription || truncateText(stripMarkdown(blog.content), 300);
  }

  private generateQuestions(blog: BlogData): string[] {
    // Generate Quora-style questions based on the content
    const keyword = blog.focusKeyword || blog.keyword;
    const questions = [
      `What is ${keyword}?`,
      `How does ${keyword} work?`,
      `What are the best practices for ${keyword}?`,
      `What are the pros and cons of ${keyword}?`,
      `How do I get started with ${keyword}?`,
    ];

    return questions;
  }

  private getMetadata(blog: BlogData): Record<string, unknown> {
    return {
      title: blog.title,
      keyword: blog.focusKeyword || blog.keyword,
      suggestedQuestions: this.generateQuestions(blog),
      characterCount: this.toAnswerFormat(blog).length,
      note: 'Quora does not have a public API. Content must be posted manually.',
    };
  }
}

const quoraConverter = new QuoraConverter();
registerConverter(quoraConverter);

export { quoraConverter };
