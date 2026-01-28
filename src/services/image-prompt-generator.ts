import { openai } from '@/lib/openai';
import { BlogType } from '@/types';

export interface ImagePromptResult {
  prompt: string;
  placement: 'hero' | 'after_intro' | 'in_section' | 'before_cta';
  altText: string;
  sectionId?: string;
}

interface BlogContext {
  title: string;
  keyword: string;
  blogType: BlogType;
  content: string;
  sections?: string[];
}

const IMAGE_STYLE_GUIDELINES = `
Style Guidelines:
- Modern, clean, professional aesthetic
- High contrast, vibrant colors
- Photorealistic or high-quality 3D render style
- Good lighting with soft shadows
- 16:9 aspect ratio for hero, 4:3 for in-content images
- No text overlays in the image
- Avoid generic stock photo appearance
`;

const BLOG_TYPE_PROMPTS: Record<BlogType, string> = {
  guide: 'instructional, step-by-step visual, educational, clear and organized',
  prompt: 'creative AI generation showcase, digital art style, futuristic',
  comparison: 'split-screen or side-by-side visual, comparative elements, balanced',
  tips: 'practical demonstration, quick tips visual, actionable imagery',
  usecase: 'real-world application scene, industry-specific context, professional',
  api: 'technical diagram, code visualization, developer-focused, clean interface',
  upcoming: 'futuristic, innovation-focused, new technology preview, exciting',
  troubleshoot: 'problem-solution visual, diagnostic imagery, helpful and clear',
  tools: 'product showcase, tool demonstration, feature highlight',
  review: 'hands-on testing, evaluation visual, detailed product imagery',
};

export async function generateImagePrompts(
  blogContext: BlogContext,
  count: number = 3
): Promise<ImagePromptResult[]> {
  const { title, keyword, blogType, content, sections } = blogContext;

  const systemPrompt = `You are an expert at creating detailed image generation prompts for blog posts.
Your prompts will be used with AI image generators like DALL-E, Midjourney, or Gemini.

${IMAGE_STYLE_GUIDELINES}

For ${blogType} blog posts, use this style: ${BLOG_TYPE_PROMPTS[blogType]}

Create prompts that:
1. Visually represent the blog topic: "${keyword}"
2. Match the blog type's visual style
3. Are specific and detailed (50-100 words each)
4. Include subject, setting, style, lighting, and mood
5. Are optimized for AI image generation
6. Avoid text, watermarks, or logos in the description`;

  const userPrompt = `Generate ${count} unique image prompts for a blog post with:
Title: "${title}"
Keyword: "${keyword}"
Blog Type: ${blogType}

${sections && sections.length > 0 ? `Sections: ${sections.join(', ')}` : ''}

Content excerpt: ${content.slice(0, 500)}...

Return a JSON array with this structure:
[
  {
    "prompt": "detailed image generation prompt here",
    "placement": "hero" | "after_intro" | "in_section" | "before_cta",
    "altText": "SEO-friendly alt text with keyword",
    "sectionId": "optional section name for in_section placement"
  }
]

Requirements:
- First image should be a "hero" image that captures the main topic
- Include variety in placement (at least one hero, one after_intro or in_section)
- Alt text should include the focus keyword naturally
- Alt text should be descriptive but under 125 characters`;

  try {
    const parsed = await openai.generateJSON<{ prompts?: ImagePromptResult[] } | ImagePromptResult[]>({
      model: 'gpt-4o-mini',
      systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
    });
    // Handle both array and object with prompts array
    const prompts = Array.isArray(parsed) ? parsed : parsed.prompts || [];

    return prompts.map((p) => ({
      prompt: p.prompt,
      placement: validatePlacement(p.placement),
      altText: p.altText || `${keyword} illustration`,
      sectionId: p.sectionId,
    }));
  } catch (error) {
    console.error('Failed to parse image prompts:', error);
    // Return a default hero image prompt
    return [
      {
        prompt: `Professional high-quality illustration representing ${keyword}. ${BLOG_TYPE_PROMPTS[blogType]}. Modern clean design with excellent lighting. 16:9 aspect ratio.`,
        placement: 'hero',
        altText: `${keyword} featured image`,
      },
    ];
  }
}

function validatePlacement(placement: string): ImagePromptResult['placement'] {
  const valid: ImagePromptResult['placement'][] = ['hero', 'after_intro', 'in_section', 'before_cta'];
  return valid.includes(placement as ImagePromptResult['placement'])
    ? (placement as ImagePromptResult['placement'])
    : 'in_section';
}

export async function generateHeroImagePrompt(
  blogContext: BlogContext
): Promise<ImagePromptResult> {
  const { title, keyword, blogType } = blogContext;

  const prompt = `Create a single hero image prompt for a blog titled "${title}" about ${keyword}.
The image should be:
- Eye-catching and professional
- Representative of the ${blogType} content type
- Style: ${BLOG_TYPE_PROMPTS[blogType]}
- 16:9 aspect ratio, suitable for blog header

Return JSON with:
{
  "prompt": "detailed 50-100 word prompt",
  "altText": "SEO-friendly alt text with keyword under 125 chars"
}`;

  try {
    const parsed = await openai.generateJSON<{ prompt: string; altText?: string }>({
      model: 'gpt-4o-mini',
      systemPrompt: `You create detailed, high-quality image generation prompts. ${IMAGE_STYLE_GUIDELINES}`,
      prompt,
      temperature: 0.7,
    });
    return {
      prompt: parsed.prompt,
      placement: 'hero',
      altText: parsed.altText || `${keyword} hero image`,
    };
  } catch {
    return {
      prompt: `Professional hero image for ${keyword}. ${BLOG_TYPE_PROMPTS[blogType]}. Modern, clean, high-quality. 16:9 aspect ratio.`,
      placement: 'hero',
      altText: `${keyword} hero image`,
    };
  }
}

export async function enhanceImagePrompt(
  basePrompt: string,
  style?: string
): Promise<string> {
  const response = await openai.generate({
    model: 'gpt-4o-mini',
    systemPrompt: `You enhance image generation prompts to be more detailed and effective. ${IMAGE_STYLE_GUIDELINES}`,
    prompt: `Enhance this image prompt to be more detailed and effective for AI image generation:

"${basePrompt}"

${style ? `Additional style requirement: ${style}` : ''}

Return only the enhanced prompt, no explanations.`,
    temperature: 0.5,
    maxTokens: 300,
  });

  return response.content || basePrompt;
}
