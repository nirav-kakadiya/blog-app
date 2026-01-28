import { BlogType } from '@/types';
import { BlogTemplate } from '@/types/template';

// Template cache
const templateCache: Map<BlogType, BlogTemplate> = new Map();

// Load all templates
const templates: Record<BlogType, BlogTemplate> = {
  guide: {
    type: 'guide',
    name: 'Guide',
    description: 'How-to tutorials and comprehensive guides',
    titlePatterns: [
      'How to {action} with {tool} ({year}): {benefit}',
      '{tool} Guide: How to {action} (Step-by-Step)',
      'Complete Guide to {topic} for {audience} ({year})',
      'How to {action} Using {tool} (Beginner Guide)',
    ],
    sections: {
      required: [
        { id: 'intro', name: 'Intro', description: 'Problem + Solution + what they will learn', wordCount: { min: 50, max: 150 } },
        { id: 'tldr', name: 'TL;DR', h2: 'Quick Summary', description: '3-5 bullets for skimmers' },
        { id: 'toc', name: 'Table of Contents', description: 'All H2 links' },
        { id: 'what_is', name: 'What is [Topic]?', h2: 'What is {topic}?', description: 'Definition and why it matters', wordCount: { min: 100, max: 300 } },
        { id: 'step_by_step', name: 'Step-by-Step Guide', h2: 'How to {action}: Step-by-Step', description: 'Numbered steps with details', wordCount: { min: 500, max: 1500 } },
        { id: 'tips', name: 'Best Tips', h2: 'Best Practices & Tips', description: '5-10 actionable tips' },
        { id: 'examples', name: 'Examples', h2: 'Examples', description: '3-10 practical examples' },
        { id: 'faqs', name: 'FAQs', h2: 'Frequently Asked Questions', description: '5-10 questions', minItems: 5, maxItems: 10 },
        { id: 'conclusion', name: 'Conclusion', h2: 'Final Thoughts', description: 'Recap + recommendation', wordCount: { min: 100, max: 200 } },
        { id: 'cta', name: 'CTA', description: 'One main action' },
      ],
      optional: [
        { id: 'mistakes', name: 'Common Mistakes', h2: 'Common Mistakes to Avoid', description: 'What users do wrong' },
        { id: 'troubleshooting', name: 'Troubleshooting', h2: 'Troubleshooting', description: 'Quick fixes' },
      ],
    },
    seo: {
      keywordPlacement: ['H1', 'first 100 words', 'one H2', 'meta description'],
      internalLinks: { min: 1, recommended: 3 },
      externalLinks: { min: 0, recommended: 2 },
    },
    images: {
      hero: { required: true, promptTemplate: '{topic}, professional tutorial style, clean modern design' },
      inContent: { recommended: 3, placements: ['after_intro', 'steps', 'examples'] },
    },
  },

  prompt: {
    type: 'prompt',
    name: 'Prompt Library',
    description: 'Collections of ready-to-use prompts for AI tools',
    titlePatterns: [
      '{number}+ {tool} Prompts for {use_case} ({year})',
      'Best {tool} Prompts for {use_case}: Copy & Paste',
      '{tool} Prompt Pack: {number} {style} Prompts ({year})',
    ],
    sections: {
      required: [
        { id: 'intro', name: 'Intro', description: 'Why these prompts', wordCount: { min: 50, max: 150 } },
        { id: 'tldr', name: 'TL;DR', h2: 'Quick Summary', description: 'Best prompts at a glance' },
        { id: 'formula', name: 'Prompt Formula', h2: 'Prompt Formula', description: 'Structure for effective prompts' },
        { id: 'prompt_list', name: 'Prompt List', h2: '{tool} Prompts by Category', description: 'Categorized prompts', minItems: 20 },
        { id: 'variations', name: 'Variations', h2: 'Prompt Variations', description: 'Same idea, different styles' },
        { id: 'settings', name: 'Settings', h2: 'Best Settings', description: 'Optimal tool settings' },
        { id: 'faqs', name: 'FAQs', h2: 'FAQs', description: '5-10 questions', minItems: 5 },
        { id: 'cta', name: 'CTA', description: 'Try tool / Get more prompts' },
      ],
      optional: [
        { id: 'negative_prompts', name: 'Negative Prompts', h2: 'Negative Prompts', description: 'What to avoid' },
        { id: 'mistakes', name: 'Mistakes', h2: 'Common Prompt Mistakes', description: 'What makes prompts fail' },
      ],
    },
    seo: {
      keywordPlacement: ['H1', 'first 100 words', 'category headers'],
      internalLinks: { min: 1, recommended: 3 },
      externalLinks: { min: 0, recommended: 1 },
    },
    images: {
      hero: { required: true, promptTemplate: 'AI generated {style} showcase, grid layout' },
    },
  },

  comparison: {
    type: 'comparison',
    name: 'Comparison',
    description: 'Tool or model comparisons and alternatives',
    titlePatterns: [
      '{tool_a} vs {tool_b} vs {tool_c}: Which is Best?',
      '{tool_a} vs {tool_b} ({year}): Honest Comparison',
      'Best {category} Alternatives: Complete Comparison',
    ],
    sections: {
      required: [
        { id: 'intro', name: 'Intro', description: 'What is compared + who it is for', wordCount: { min: 100, max: 200 } },
        { id: 'tldr', name: 'Quick Verdict', h2: 'Quick Verdict', description: 'Winner summary' },
        { id: 'overviews', name: 'Overviews', h2: 'The Contenders', description: 'Each tool overview' },
        { id: 'comparison_table', name: 'Comparison Table', h2: 'Head-to-Head', description: 'Feature comparison table' },
        { id: 'best_for', name: 'Best For', h2: 'Which Should You Choose?', description: 'Winner by use case' },
        { id: 'recommendation', name: 'Recommendation', h2: 'Our Recommendation', description: 'Final verdict' },
        { id: 'faqs', name: 'FAQs', h2: 'FAQs', description: '5-10 questions', minItems: 5 },
        { id: 'cta', name: 'CTA', description: 'Try winner' },
      ],
      optional: [
        { id: 'real_outputs', name: 'Output Examples', h2: 'Real Output Comparison', description: 'Same prompt, different tools' },
      ],
    },
    seo: {
      keywordPlacement: ['H1 with vs', 'comparison table', 'verdict'],
      internalLinks: { min: 2, recommended: 4 },
      externalLinks: { min: 1, recommended: 3 },
    },
    images: {
      hero: { required: true, promptTemplate: 'Split screen comparison, {tool_a} vs {tool_b}, versus style' },
    },
  },

  tips: {
    type: 'tips',
    name: 'Tips & Tricks',
    description: 'Quick tutorials and pro tips',
    titlePatterns: [
      '{number} {tool} Tips & Tricks for {outcome} ({year})',
      '{tool} Tips: How to {achieve_goal} Like a Pro',
      'Pro Tips for {tool}: {number} Tricks You Need',
    ],
    sections: {
      required: [
        { id: 'intro', name: 'Intro', description: 'What you will learn', wordCount: { min: 50, max: 150 } },
        { id: 'tldr', name: 'TL;DR', h2: 'Quick Summary', description: 'Key tips at a glance' },
        { id: 'goal', name: 'Goal', h2: 'What You Will Achieve', description: 'Clear outcome' },
        { id: 'requirements', name: 'Requirements', h2: 'What You Need', description: 'Tools and assets needed' },
        { id: 'tutorial', name: 'Tutorial', h2: 'Step-by-Step', description: 'Main how-to content' },
        { id: 'pro_tips', name: 'Pro Tips', h2: 'Pro Tips', description: 'Advanced tricks' },
        { id: 'faqs', name: 'FAQs', h2: 'FAQs', description: '5+ questions', minItems: 5 },
        { id: 'cta', name: 'CTA', description: 'Next steps' },
      ],
      optional: [],
    },
    seo: {
      keywordPlacement: ['H1', 'goal section', 'tip headers'],
      internalLinks: { min: 1, recommended: 2 },
      externalLinks: { min: 0, recommended: 1 },
    },
    images: {
      hero: { required: true, promptTemplate: '{tool} tips, lightbulb concept, tutorial thumbnail' },
    },
  },

  usecase: {
    type: 'usecase',
    name: 'Use Cases',
    description: 'Industry-specific use cases',
    titlePatterns: [
      '{tool} for {industry}: How to {achieve_goal}',
      'How {audience} Use {tool} for {outcome}',
      '{tool} Use Cases: {number} Ways to {benefit}',
    ],
    sections: {
      required: [
        { id: 'intro', name: 'Intro', description: 'Overview', wordCount: { min: 100, max: 200 } },
        { id: 'tldr', name: 'TL;DR', h2: 'Quick Summary', description: 'Key points' },
        { id: 'problem', name: 'Problem', h2: 'The Problem', description: 'What problem this solves' },
        { id: 'workflow', name: 'Workflow', h2: 'Step-by-Step Workflow', description: 'How to solve it' },
        { id: 'examples', name: 'Examples', h2: 'Templates & Examples', description: 'Ready-to-use templates' },
        { id: 'tools', name: 'Tools', h2: 'Recommended Tools', description: 'Best tools for this use case' },
        { id: 'faqs', name: 'FAQs', h2: 'FAQs', description: '5+ questions', minItems: 5 },
        { id: 'cta', name: 'CTA', description: 'Get started' },
      ],
      optional: [],
    },
    seo: {
      keywordPlacement: ['H1 with industry', 'problem section', 'tool names'],
      internalLinks: { min: 2, recommended: 4 },
      externalLinks: { min: 0, recommended: 2 },
    },
    images: {
      hero: { required: true, promptTemplate: '{industry} professional using AI tools' },
    },
  },

  api: {
    type: 'api',
    name: 'API Related',
    description: 'API documentation and integration guides',
    titlePatterns: [
      '{tool} API Guide: How to Integrate ({year})',
      'Getting Started with {tool} API: Tutorial',
      '{tool} API: Authentication & Examples',
    ],
    sections: {
      required: [
        { id: 'intro', name: 'Intro', description: 'What you will build', wordCount: { min: 100, max: 200 } },
        { id: 'tldr', name: 'TL;DR', h2: 'Quick Summary', description: 'Key points' },
        { id: 'what_api', name: 'What is API', h2: 'What is {tool} API?', description: 'Capabilities overview' },
        { id: 'auth', name: 'Authentication', h2: 'Authentication', description: 'API key setup' },
        { id: 'base_request', name: 'First Request', h2: 'Your First Request', description: 'Basic request example' },
        { id: 'parameters', name: 'Parameters', h2: 'API Parameters', description: 'All parameters explained' },
        { id: 'errors', name: 'Errors', h2: 'Error Handling', description: 'Common errors and fixes' },
        { id: 'faqs', name: 'FAQs', h2: 'FAQs', description: '5+ questions', minItems: 5 },
        { id: 'cta', name: 'CTA', description: 'Get API key' },
      ],
      optional: [],
    },
    seo: {
      keywordPlacement: ['H1 with API', 'code examples', 'parameters'],
      internalLinks: { min: 1, recommended: 2 },
      externalLinks: { min: 1, recommended: 2 },
    },
    images: {
      hero: { required: true, promptTemplate: 'API documentation, code editor, developer workspace' },
    },
  },

  upcoming: {
    type: 'upcoming',
    name: 'Upcoming / Trends',
    description: 'News about upcoming releases and trends',
    titlePatterns: [
      '{tool} {version}: Everything We Know ({year})',
      'Upcoming AI {category} to Watch in {year}',
      '{tool}: Release Date, Features & Expectations',
    ],
    sections: {
      required: [
        { id: 'intro', name: 'Intro', description: 'Overview', wordCount: { min: 100, max: 200 } },
        { id: 'tldr', name: 'Key Takeaways', h2: 'Key Takeaways', description: 'Main points' },
        { id: 'whats_coming', name: 'What is Coming', h2: 'What is Coming', description: 'Overview of what is new' },
        { id: 'timeline', name: 'Timeline', h2: 'Release Timeline', description: 'When to expect' },
        { id: 'features', name: 'Features', h2: 'Expected Features', description: 'What is included' },
        { id: 'alternatives', name: 'Alternatives', h2: 'What You Can Use Now', description: 'Current options' },
        { id: 'faqs', name: 'FAQs', h2: 'FAQs', description: '5+ questions', minItems: 5 },
        { id: 'cta', name: 'CTA', description: 'Join waitlist' },
      ],
      optional: [],
    },
    seo: {
      keywordPlacement: ['H1 with year', 'timeline', 'feature names'],
      internalLinks: { min: 2, recommended: 3 },
      externalLinks: { min: 0, recommended: 2 },
    },
    images: {
      hero: { required: true, promptTemplate: 'Futuristic {tool} concept, upcoming technology' },
    },
  },

  troubleshoot: {
    type: 'troubleshoot',
    name: 'Troubleshooting',
    description: 'Error fixes and debugging guides',
    titlePatterns: [
      'How to Fix {error} in {tool}',
      '{tool} {error}: Causes & Solutions ({year})',
      '{tool} Not Working? How to Fix It',
    ],
    sections: {
      required: [
        { id: 'intro', name: 'Intro', description: 'Acknowledge problem', wordCount: { min: 50, max: 150 } },
        { id: 'tldr', name: 'Quick Fix', h2: 'Quick Fix', description: 'Fastest solution' },
        { id: 'error_meaning', name: 'Error Meaning', h2: 'What Does {error} Mean?', description: 'Explanation' },
        { id: 'quick_checklist', name: 'Checklist', h2: 'Quick Checklist', description: 'Fast things to try' },
        { id: 'fixes', name: 'Fixes', h2: 'Detailed Fixes', description: '3-5 step-by-step fixes', minItems: 3 },
        { id: 'root_cause', name: 'Root Cause', h2: 'Why This Happens', description: 'Technical explanation' },
        { id: 'prevention', name: 'Prevention', h2: 'How to Prevent', description: 'Avoid future issues' },
        { id: 'faqs', name: 'FAQs', h2: 'FAQs', description: '5+ questions', minItems: 5 },
        { id: 'cta', name: 'CTA', description: 'Related guides' },
      ],
      optional: [],
    },
    seo: {
      keywordPlacement: ['H1 with error', 'fix headers', 'root cause'],
      internalLinks: { min: 1, recommended: 3 },
      externalLinks: { min: 0, recommended: 1 },
    },
    images: {
      hero: { required: false, promptTemplate: 'Error fix concept, troubleshooting, problem solved' },
    },
  },

  tools: {
    type: 'tools',
    name: 'Tools & Models',
    description: 'Deep-dive articles on specific tools',
    titlePatterns: [
      '{tool}: Complete Guide ({year})',
      'What is {tool}? Everything You Need to Know',
      '{tool} Review: Features, Pros, Cons & More',
    ],
    sections: {
      required: [
        { id: 'intro', name: 'Intro', description: 'Overview', wordCount: { min: 100, max: 200 } },
        { id: 'tldr', name: 'TL;DR', h2: 'Quick Summary', description: 'Key points' },
        { id: 'what_is', name: 'What is', h2: 'What is {tool}?', description: 'Definition' },
        { id: 'features', name: 'Features', h2: 'Key Features', description: 'Main capabilities' },
        { id: 'how_works', name: 'How it Works', h2: 'How {tool} Works', description: 'Technical overview' },
        { id: 'how_to_use', name: 'How to Use', h2: 'How to Use {tool}', description: 'Getting started' },
        { id: 'pricing', name: 'Pricing', h2: 'Pricing & Plans', description: 'Free and paid tiers' },
        { id: 'alternatives', name: 'Alternatives', h2: 'Best Alternatives', description: 'Competing options' },
        { id: 'faqs', name: 'FAQs', h2: 'FAQs', description: '5-10 questions', minItems: 5 },
        { id: 'cta', name: 'CTA', description: 'Try tool' },
      ],
      optional: [],
    },
    seo: {
      keywordPlacement: ['H1 with tool name', 'features', 'pricing'],
      internalLinks: { min: 2, recommended: 4 },
      externalLinks: { min: 1, recommended: 2 },
    },
    images: {
      hero: { required: true, promptTemplate: '{tool} interface showcase, product screenshot style' },
    },
  },

  review: {
    type: 'review',
    name: 'Review',
    description: 'In-depth tool or model reviews',
    titlePatterns: [
      '{tool} Review ({year}): Is It Worth It?',
      'Honest {tool} Review: Pros, Cons & Verdict',
      'I Tried {tool}: Here is My Verdict',
    ],
    sections: {
      required: [
        { id: 'intro', name: 'Intro', description: 'Why reviewing', wordCount: { min: 100, max: 200 } },
        { id: 'tldr', name: 'Quick Verdict', h2: 'Quick Verdict', description: 'Rating + one-line verdict' },
        { id: 'overview', name: 'Overview', h2: 'What is {tool}?', description: 'Brief explanation' },
        { id: 'testing', name: 'Testing', h2: 'How I Tested', description: 'Methodology' },
        { id: 'pros', name: 'Pros', h2: 'What I Liked', description: '5-8 positive aspects' },
        { id: 'cons', name: 'Cons', h2: 'What Could Be Better', description: '3-5 negative aspects' },
        { id: 'verdict', name: 'Verdict', h2: 'Final Verdict', description: 'Overall recommendation' },
        { id: 'faqs', name: 'FAQs', h2: 'FAQs', description: '5+ questions', minItems: 5 },
        { id: 'cta', name: 'CTA', description: 'Try it yourself' },
      ],
      optional: [],
    },
    seo: {
      keywordPlacement: ['H1 with review', 'verdict', 'pros/cons headers'],
      internalLinks: { min: 2, recommended: 4 },
      externalLinks: { min: 1, recommended: 2 },
    },
    images: {
      hero: { required: true, promptTemplate: '{tool} review, rating stars, verdict style' },
    },
  },
};

export function getTemplate(blogType: BlogType): BlogTemplate {
  if (templateCache.has(blogType)) {
    return templateCache.get(blogType)!;
  }

  const template = templates[blogType];
  if (!template) {
    throw new Error(`Template not found for blog type: ${blogType}`);
  }

  templateCache.set(blogType, template);
  return template;
}

export function getTitlePatterns(blogType: BlogType): string[] {
  const template = getTemplate(blogType);
  return template.titlePatterns;
}

export function getSections(blogType: BlogType): { required: string[]; optional: string[] } {
  const template = getTemplate(blogType);
  return {
    required: template.sections.required.map((s) => s.id),
    optional: template.sections.optional.map((s) => s.id),
  };
}

export function getImagePromptPattern(blogType: BlogType): string {
  const template = getTemplate(blogType);
  return template.images.hero.promptTemplate;
}

export function getAllTemplates(): BlogTemplate[] {
  return Object.values(templates);
}

export function getBlogTypes(): BlogType[] {
  return Object.keys(templates) as BlogType[];
}
