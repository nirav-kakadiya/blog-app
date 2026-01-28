import { BlogType } from './blog';

export interface TemplateSection {
  id: string;
  name: string;
  h2?: string;
  description: string;
  guidelines?: string[];
  wordCount?: { min: number; max: number };
  minItems?: number;
  maxItems?: number;
  required?: boolean;
}

export interface ImagePromptPattern {
  placement: 'hero' | 'after_intro' | 'in_section';
  promptTemplate: string;
}

export interface BlogTemplate {
  type: BlogType;
  name: string;
  description: string;
  titlePatterns: string[];
  sections: {
    required: TemplateSection[];
    optional: TemplateSection[];
  };
  seo: {
    keywordPlacement: string[];
    internalLinks: { min: number; recommended: number };
    externalLinks: { min: number; recommended: number };
  };
  images: {
    hero: {
      required: boolean;
      promptTemplate: string;
    };
    inContent?: {
      recommended: number;
      placements: string[];
    };
  };
}

export interface TemplateConfig {
  templates: Record<BlogType, BlogTemplate>;
}
