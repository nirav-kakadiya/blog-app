import { gemini, type ImageModel } from '@/lib/gemini';
import { r2 } from '@/lib/r2';
import { prisma } from '@/lib/prisma';
import { generateImagePrompts, ImagePromptResult } from './image-prompt-generator';
import { generateAltText } from './alt-text-generator';
import { BlogType } from '@/types';
import { logger } from '@/lib/logger';

/**
 * Get the appropriate model and aspect ratio for image placement
 * Hero images use 16:9 landscape, in-content images use 4:3
 */
function getImageConfig(placement: string): { model: ImageModel; aspectRatio: '16:9' | '4:3' | '3:2' } {
  if (placement === 'hero') {
    return { model: 'gemini-2.5-flash-image', aspectRatio: '16:9' };
  }
  return { model: 'gemini-2.5-flash-image', aspectRatio: '4:3' };
}

interface BlogContext {
  id: string;
  title: string;
  keyword: string;
  blogType: BlogType;
  content: string;
}

interface ProcessedImage {
  id: string;
  prompt: string;
  s3Url: string;
  altText: string;
  placement: string;
  sectionId?: string;
}

interface PipelineProgress {
  stage: 'prompts' | 'generating' | 'uploading' | 'saving' | 'complete';
  current: number;
  total: number;
  message: string;
}

type ProgressCallback = (progress: PipelineProgress) => void;

export async function processImages(
  blog: BlogContext,
  imageCount: number = 3,
  onProgress?: ProgressCallback
): Promise<ProcessedImage[]> {
  const results: ProcessedImage[] = [];
  const errors: { index: number; error: string }[] = [];

  try {
    // Stage 1: Generate image prompts
    onProgress?.({
      stage: 'prompts',
      current: 0,
      total: imageCount,
      message: 'Generating image prompts...',
    });

    const prompts = await generateImagePrompts(
      {
        title: blog.title,
        keyword: blog.keyword,
        blogType: blog.blogType,
        content: blog.content,
      },
      imageCount
    );

    logger.info('Image prompts generated', { count: prompts.length });

    // Stage 2-4: Process each image
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];

      try {
        // Stage 2: Generate image with Gemini
        onProgress?.({
          stage: 'generating',
          current: i + 1,
          total: prompts.length,
          message: `Generating image ${i + 1} of ${prompts.length}...`,
        });

        const config = getImageConfig(prompt.placement);
        const { imageData, mimeType } = await gemini.generateImage({
          prompt: prompt.prompt,
          model: config.model,
          aspectRatio: config.aspectRatio,
        });

        // Stage 3: Upload to R2
        onProgress?.({
          stage: 'uploading',
          current: i + 1,
          total: prompts.length,
          message: `Uploading image ${i + 1} of ${prompts.length}...`,
        });

        const s3Url = await r2.uploadImage(imageData, blog.id, mimeType);

        // Generate enhanced alt text if not provided
        const altText = prompt.altText || await generateAltText({
          imagePrompt: prompt.prompt,
          keyword: blog.keyword,
          blogTitle: blog.title,
          placement: prompt.placement,
          sectionTitle: prompt.sectionId,
        });

        // Stage 4: Save to database
        onProgress?.({
          stage: 'saving',
          current: i + 1,
          total: prompts.length,
          message: `Saving image ${i + 1} of ${prompts.length}...`,
        });

        const savedImage = await prisma.image.create({
          data: {
            blogId: blog.id,
            prompt: prompt.prompt,
            s3Url,
            altText,
            placement: prompt.placement,
          },
        });

        results.push({
          id: savedImage.id,
          prompt: prompt.prompt,
          s3Url,
          altText,
          placement: prompt.placement,
          sectionId: prompt.sectionId,
        });

        logger.info('Image processed successfully', { imageId: savedImage.id, placement: prompt.placement });
      } catch (error) {
        logger.error('Failed to process image', {
          index: i,
          prompt: prompt.prompt.substring(0, 50),
          error: String(error),
        });
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with remaining images
      }
    }

    onProgress?.({
      stage: 'complete',
      current: results.length,
      total: prompts.length,
      message: `Completed ${results.length} of ${prompts.length} images`,
    });

    if (errors.length > 0) {
      logger.warn('Some images failed to process', { errors });
    }

    return results;
  } catch (error) {
    logger.error('Image pipeline failed', { error: String(error) });
    throw error;
  }
}

export async function processingleImage(
  blog: BlogContext,
  promptInput: string | ImagePromptResult,
  onProgress?: ProgressCallback
): Promise<ProcessedImage> {
  const prompt: ImagePromptResult = typeof promptInput === 'string'
    ? {
        prompt: promptInput,
        placement: 'in_section',
        altText: `${blog.keyword} illustration`,
      }
    : promptInput;

  onProgress?.({
    stage: 'generating',
    current: 1,
    total: 1,
    message: 'Generating image...',
  });

  const config = getImageConfig(prompt.placement);
  const { imageData, mimeType } = await gemini.generateImage({
    prompt: prompt.prompt,
    model: config.model,
    aspectRatio: config.aspectRatio,
  });

  onProgress?.({
    stage: 'uploading',
    current: 1,
    total: 1,
    message: 'Uploading image...',
  });

  const s3Url = await r2.uploadImage(imageData, blog.id, mimeType);

  const altText = prompt.altText || await generateAltText({
    imagePrompt: prompt.prompt,
    keyword: blog.keyword,
    blogTitle: blog.title,
    placement: prompt.placement,
    sectionTitle: prompt.sectionId,
  });

  onProgress?.({
    stage: 'saving',
    current: 1,
    total: 1,
    message: 'Saving image...',
  });

  const savedImage = await prisma.image.create({
    data: {
      blogId: blog.id,
      prompt: prompt.prompt,
      s3Url,
      altText,
      placement: prompt.placement,
    },
  });

  onProgress?.({
    stage: 'complete',
    current: 1,
    total: 1,
    message: 'Image complete',
  });

  return {
    id: savedImage.id,
    prompt: prompt.prompt,
    s3Url,
    altText,
    placement: prompt.placement,
    sectionId: prompt.sectionId,
  };
}

export async function regenerateImage(
  imageId: string,
  newPrompt?: string
): Promise<ProcessedImage> {
  // Get existing image
  const existingImage = await prisma.image.findUnique({
    where: { id: imageId },
    include: { blog: true },
  });

  if (!existingImage || !existingImage.blog) {
    throw new Error('Image not found');
  }

  const prompt = newPrompt || existingImage.prompt;

  // Delete old image from R2
  if (existingImage.s3Url) {
    try {
      await r2.deleteImage(existingImage.s3Url);
    } catch {
      logger.warn('Failed to delete old image', { url: existingImage.s3Url });
    }
  }

  // Generate new image
  const config = getImageConfig(existingImage.placement);
  const { imageData, mimeType } = await gemini.generateImage({
    prompt,
    model: config.model,
    aspectRatio: config.aspectRatio,
  });

  // Upload new image
  const s3Url = await r2.uploadImage(imageData, existingImage.blogId, mimeType);

  // Generate new alt text if prompt changed
  const altText = newPrompt
    ? await generateAltText({
        imagePrompt: prompt,
        keyword: existingImage.blog.keyword,
        blogTitle: existingImage.blog.title || '',
        placement: existingImage.placement,
      })
    : existingImage.altText;

  // Update database
  const updatedImage = await prisma.image.update({
    where: { id: imageId },
    data: {
      prompt,
      s3Url,
      altText,
    },
  });

  return {
    id: updatedImage.id,
    prompt: updatedImage.prompt,
    s3Url: updatedImage.s3Url,
    altText: updatedImage.altText,
    placement: updatedImage.placement,
  };
}

export async function deleteImage(imageId: string): Promise<void> {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
  });

  if (!image) {
    throw new Error('Image not found');
  }

  // Delete from R2
  if (image.s3Url) {
    await r2.deleteImage(image.s3Url);
  }

  // Delete from database
  await prisma.image.delete({
    where: { id: imageId },
  });

  logger.info('Image deleted', { imageId });
}

export async function getBlogImages(blogId: string): Promise<ProcessedImage[]> {
  const images = await prisma.image.findMany({
    where: { blogId },
    orderBy: { createdAt: 'asc' },
  });

  return images.map((img) => ({
    id: img.id,
    prompt: img.prompt,
    s3Url: img.s3Url,
    altText: img.altText,
    placement: img.placement,
  }));
}
