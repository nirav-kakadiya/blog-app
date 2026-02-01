export type BlogType =
  | 'guide'
  | 'prompt'
  | 'comparison'
  | 'tips'
  | 'usecase'
  | 'api'
  | 'upcoming'
  | 'troubleshoot'
  | 'tools'
  | 'review';

export type BlogStatus = 'draft' | 'review' | 'published';

export type Platform =
  | 'medium'
  | 'devto'
  | 'linkedin'
  | 'wordpress'
  | 'ghost'
  | 'hashnode'
  | 'quora'
  | 'reddit';

export interface BlogInput {
  keyword: string;
  blogType: BlogType;
  targetPlatforms?: Platform[];
}

export interface SEOData {
  title: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  canonicalUrl?: string;
}

export interface LinkData {
  id?: string;
  anchor: string;
  url: string;
  type: 'internal' | 'external';
  nofollow?: boolean;
}

export interface ImageData {
  id?: string;
  prompt: string;
  s3Url?: string;
  altText: string;
  placement: 'hero' | 'after_intro' | 'in_section';
}

export interface BlogOutput {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: BlogStatus;

  input: BlogInput;
  seo: SEOData;

  content: {
    markdown: string;
    html?: string;
  };

  links: LinkData[];
  images: ImageData[];

  searchScore?: number;
  aeoScore?: number;
  schemaJsonLd?: string;

  publishRecords?: {
    platform: Platform;
    publishedUrl?: string;
    publishedAt?: string;
    status: string;
  }[];
}

export interface GenerateTitlesInput {
  keyword: string;
  blogType: BlogType;
}

export interface GenerateTitlesOutput {
  titles: string[];
}

export interface GenerateContentInput {
  keyword: string;
  blogType: BlogType;
  title: string;
}

export interface GenerateContentOutput {
  content: string;
  metaDescription: string;
  faqs: { question: string; answer: string }[];
}
