import {
  BookOpen,
  Sparkles,
  Scale,
  Lightbulb,
  Target,
  Plug,
  Rocket,
  Wrench,
  Hammer,
  Star,
  FileEdit,
  Image,
  Search,
  CheckCircle,
  Send,
  FileText,
  Eye,
  ClipboardList,
  Newspaper,
  Code2,
  Linkedin,
  Globe,
  Hash,
  MessageCircle,
  CircleHelp,
  CircleDot,
  type LucideIcon,
} from 'lucide-react';

// Blog type → icon mapping
export const BLOG_TYPE_ICONS: Record<string, LucideIcon> = {
  guide: BookOpen,
  prompt: Sparkles,
  comparison: Scale,
  tips: Lightbulb,
  usecase: Target,
  api: Plug,
  upcoming: Rocket,
  troubleshoot: Wrench,
  tools: Hammer,
  review: Star,
};

// Edit page tab icons
export const TAB_ICONS: Record<string, LucideIcon> = {
  editor: FileEdit,
  images: Image,
  search: Search,
  quality: CheckCircle,
  publish: Send,
};

// Dashboard stat card icons
export const STAT_ICONS: Record<string, LucideIcon> = {
  total: FileText,
  published: CheckCircle,
  review: Eye,
  draft: ClipboardList,
};

// Platform icons for publishing / analytics
export const PLATFORM_ICONS: Record<string, LucideIcon> = {
  medium: Newspaper,
  devto: Code2,
  linkedin: Linkedin,
  wordpress: Globe,
  ghost: Globe,
  hashnode: Hash,
  quora: CircleHelp,
  reddit: CircleDot,
};

export {
  BookOpen,
  Sparkles,
  Scale,
  Lightbulb,
  Target,
  Plug,
  Rocket,
  Wrench,
  Hammer,
  Star,
  FileEdit,
  Image,
  Search,
  CheckCircle,
  Send,
  FileText,
  Eye,
  ClipboardList,
};
