import { Platform } from '@/types';
import { BasePlatformConverter, BlogData, ConvertedContent, registerConverter } from './base-converter';
import { truncateText, stripMarkdown } from './utils';

class RedditConverter extends BasePlatformConverter {
  platform: Platform = 'reddit';

  convert(blog: BlogData): ConvertedContent {
    // Reddit uses its own markdown flavor
    const postContent = this.toRedditPost(blog);
    const commentContent = this.toRedditComment(blog);

    return {
      platform: this.platform,
      content: postContent,
      metadata: this.getMetadata(blog),
      extra: {
        postTitle: this.generatePostTitle(blog),
        postContent,
        commentContent,
        subredditSuggestions: this.suggestSubreddits(blog),
      },
    };
  }

  private generatePostTitle(blog: BlogData): string {
    // Reddit titles should be direct and engaging
    let title = blog.title;

    // Remove year if present (Reddit prefers timeless titles unless time-sensitive)
    title = title.replace(/\s*\(?20\d{2}\)?/g, '');

    // Make it more Reddit-friendly
    const prefix = this.getBlogTypePrefix(blog.blogType);

    if (title.length + prefix.length + 1 <= 300) {
      title = `${prefix} ${title}`;
    }

    return truncateText(title, 300);
  }

  private getBlogTypePrefix(blogType: string): string {
    const prefixMap: Record<string, string> = {
      guide: '[Guide]',
      prompt: '[Resource]',
      comparison: '[Comparison]',
      tips: '[Tips]',
      usecase: '[Use Case]',
      api: '[Tutorial]',
      upcoming: '[News]',
      troubleshoot: '[Help]',
      tools: '[Tools]',
      review: '[Review]',
    };
    return prefixMap[blogType] || '[Post]';
  }

  private toRedditPost(blog: BlogData): string {
    const lines: string[] = [];

    // Add TL;DR at the top (Reddit convention)
    const tldr = this.extractTldr(blog);
    if (tldr) {
      lines.push('**TL;DR:**');
      lines.push(tldr);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    // Convert main content to Reddit-friendly markdown
    const sections = this.extractSections(blog.content);

    for (const section of sections) {
      // Skip TL;DR in main body (handled above)
      if (section.title.toLowerCase().includes('tl;dr')) {
        continue;
      }

      // Use Reddit's markdown for headers
      if (section.title) {
        lines.push(`# ${section.title}`);
        lines.push('');
      }

      // Clean content for Reddit
      const cleanContent = this.cleanForReddit(section.content);
      lines.push(cleanContent);
      lines.push('');
    }

    // Remove promotional CTAs (Reddit doesn't like self-promotion)
    let result = lines.join('\n');
    result = this.removePromotionalContent(result);

    // Add closing
    result += '\n---\n\n*Feel free to ask questions in the comments!*';

    return result.trim();
  }

  private toRedditComment(blog: BlogData): string {
    // Shorter version suitable for comment replies
    const tldr = this.extractTldr(blog);
    const keyPoints = this.extractKeyPoints(blog);

    const lines: string[] = [];

    if (tldr) {
      lines.push('**Quick answer:**');
      lines.push(tldr);
      lines.push('');
    }

    if (keyPoints.length > 0) {
      lines.push('**Key points:**');
      for (const point of keyPoints.slice(0, 5)) {
        lines.push(`- ${point}`);
      }
    }

    return lines.join('\n').trim();
  }

  private extractTldr(blog: BlogData): string | null {
    const tldrMatch = blog.content.match(/##?\s*TL;DR[\s\S]*?(?=##|$)/i);

    if (tldrMatch) {
      let tldr = tldrMatch[0];
      // Remove the header
      tldr = tldr.replace(/##?\s*TL;DR:?/i, '').trim();
      // Strip markdown but keep structure
      tldr = this.cleanForReddit(tldr);
      return truncateText(tldr, 500);
    }

    return null;
  }

  private extractKeyPoints(blog: BlogData): string[] {
    const points: string[] = [];

    // Extract bullet points from content
    const bulletMatches = blog.content.match(/^[-*]\s+(.+)$/gm);
    if (bulletMatches) {
      for (const match of bulletMatches.slice(0, 10)) {
        const point = stripMarkdown(match.replace(/^[-*]\s+/, '')).trim();
        if (point.length > 10 && point.length < 200) {
          points.push(point);
        }
      }
    }

    return points;
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

    if (currentContent.length > 0) {
      sections.push({
        title: currentTitle,
        content: currentContent.join('\n').trim(),
      });
    }

    return sections;
  }

  private cleanForReddit(content: string): string {
    let text = content;

    // Reddit uses slightly different markdown
    // Convert images to links (Reddit prefers image hosting)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[$1]($2)');

    // Ensure code blocks are properly formatted
    text = text.replace(/```(\w+)?\n/g, (_, lang) => `\`\`\`${lang || ''}\n`);

    // Remove excessive whitespace
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
  }

  private removePromotionalContent(content: string): string {
    // Remove common promotional patterns
    const patterns = [
      /(?:sign up|subscribe|follow us|check out our|visit our|join our).{0,100}$/gim,
      /(?:click here|learn more|get started|try now).{0,50}$/gim,
    ];

    let result = content;
    for (const pattern of patterns) {
      result = result.replace(pattern, '');
    }

    return result.trim();
  }

  private suggestSubreddits(blog: BlogData): string[] {
    // Suggest relevant subreddits based on content
    const suggestions: string[] = [];
    const keyword = (blog.focusKeyword || blog.keyword).toLowerCase();

    // Common tech/AI subreddits
    if (keyword.includes('ai') || keyword.includes('machine learning') || keyword.includes('gpt')) {
      suggestions.push('r/artificial', 'r/MachineLearning', 'r/ChatGPT');
    }

    if (keyword.includes('coding') || keyword.includes('programming') || keyword.includes('api')) {
      suggestions.push('r/programming', 'r/learnprogramming', 'r/webdev');
    }

    if (keyword.includes('image') || keyword.includes('art') || keyword.includes('design')) {
      suggestions.push('r/StableDiffusion', 'r/midjourney', 'r/AIart');
    }

    // Blog type specific
    const typeSubreddits: Record<string, string[]> = {
      guide: ['r/coolguides', 'r/learnprogramming'],
      tips: ['r/LifeProTips', 'r/productivity'],
      tools: ['r/InternetIsBeautiful', 'r/SideProject'],
    };

    if (typeSubreddits[blog.blogType]) {
      suggestions.push(...typeSubreddits[blog.blogType]);
    }

    return [...new Set(suggestions)].slice(0, 5);
  }

  private getMetadata(blog: BlogData): Record<string, unknown> {
    return {
      title: this.generatePostTitle(blog),
      subredditSuggestions: this.suggestSubreddits(blog),
      characterCount: this.toRedditPost(blog).length,
      hasTldr: !!this.extractTldr(blog),
      note: 'Reddit does not have a public posting API. Content must be posted manually.',
    };
  }
}

const redditConverter = new RedditConverter();
registerConverter(redditConverter);

export { redditConverter };
