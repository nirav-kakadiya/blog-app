import { Platform } from './blog';

export interface PlatformConfig {
  id: Platform;
  name: string;
  supportsMarkdown: boolean;
  supportsImages: boolean;
  supportsCanonical: boolean;
  maxTitleLength: number;
  hasAPI: boolean;
  apiEndpoint?: string;
}

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  medium: {
    id: 'medium',
    name: 'Medium',
    supportsMarkdown: true,
    supportsImages: true,
    supportsCanonical: true,
    maxTitleLength: 100,
    hasAPI: true,
    apiEndpoint: 'https://api.medium.com/v1',
  },
  devto: {
    id: 'devto',
    name: 'Dev.to',
    supportsMarkdown: true,
    supportsImages: true,
    supportsCanonical: true,
    maxTitleLength: 128,
    hasAPI: true,
    apiEndpoint: 'https://dev.to/api',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    supportsMarkdown: false,
    supportsImages: true,
    supportsCanonical: false,
    maxTitleLength: 150,
    hasAPI: false,
  },
  wordpress: {
    id: 'wordpress',
    name: 'WordPress',
    supportsMarkdown: true,
    supportsImages: true,
    supportsCanonical: true,
    maxTitleLength: 200,
    hasAPI: true,
  },
  ghost: {
    id: 'ghost',
    name: 'Ghost',
    supportsMarkdown: true,
    supportsImages: true,
    supportsCanonical: true,
    maxTitleLength: 255,
    hasAPI: true,
  },
  hashnode: {
    id: 'hashnode',
    name: 'Hashnode',
    supportsMarkdown: true,
    supportsImages: true,
    supportsCanonical: true,
    maxTitleLength: 130,
    hasAPI: true,
  },
  quora: {
    id: 'quora',
    name: 'Quora',
    supportsMarkdown: false,
    supportsImages: true,
    supportsCanonical: false,
    maxTitleLength: 250,
    hasAPI: false,
  },
  reddit: {
    id: 'reddit',
    name: 'Reddit',
    supportsMarkdown: true,
    supportsImages: true,
    supportsCanonical: false,
    maxTitleLength: 300,
    hasAPI: true,
  },
};
