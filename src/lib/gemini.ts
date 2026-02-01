import { retry, isRetryableError } from './retry';
import { APIError } from './errors';
import { logger } from './logger';
import { vertexAI } from './vertex-ai';

interface GenerateImageOptions {
  prompt: string;
  width?: number;
  height?: number;
}

interface GenerateImageResponse {
  imageData: Buffer;
  mimeType: string;
}

/**
 * Unified Image Generation Client
 * Uses Vertex AI (Imagen) by default, falls back to Gemini API if needed
 */
class GeminiClient {
  private apiKey: string | null = null;
  private vertexAIFailCount: number = 0;
  private readonly MAX_VERTEX_FAILURES = 5;

  private getApiKey(): string {
    if (!this.apiKey) {
      this.apiKey = process.env.GEMINI_API_KEY || null;
      if (!this.apiKey) {
        throw new APIError('Gemini API key not configured', 'gemini');
      }
    }
    return this.apiKey;
  }

  /**
   * Convert width/height to aspect ratio for Vertex AI
   */
  private getAspectRatio(width: number, height: number): '1:1' | '16:9' | '9:16' | '4:3' | '3:4' {
    const ratio = width / height;

    if (Math.abs(ratio - 1) < 0.1) return '1:1';
    if (Math.abs(ratio - 16 / 9) < 0.2) return '16:9';
    if (Math.abs(ratio - 9 / 16) < 0.2) return '9:16';
    if (Math.abs(ratio - 4 / 3) < 0.2) return '4:3';
    if (Math.abs(ratio - 3 / 4) < 0.2) return '3:4';

    // Default to 16:9 for wider images, 9:16 for taller
    return ratio > 1 ? '16:9' : '9:16';
  }

  async generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
    const {
      prompt,
      width = 1024,
      height = 1024,
    } = options;

    // Try Vertex AI first (uses service account credentials) unless too many recent failures
    if (this.vertexAIFailCount < this.MAX_VERTEX_FAILURES) {
      try {
        logger.info('Using Vertex AI (Imagen) for image generation', {
          prompt: prompt.substring(0, 100),
        });

        const aspectRatio = this.getAspectRatio(width, height);

        const result = await vertexAI.generateImage({
          prompt,
          aspectRatio,
          negativePrompt: 'blurry, low quality, distorted, watermark, text, logo',
        });

        // Reset fail count on success
        this.vertexAIFailCount = 0;
        return result;
      } catch (vertexError) {
        this.vertexAIFailCount++;
        logger.warn('Vertex AI failed, falling back to Gemini API', {
          error: String(vertexError),
          failCount: this.vertexAIFailCount,
        });
      }
    }

    // Fallback to Gemini API with image-capable model
    return this.generateImageWithGeminiAPI({ prompt, width, height });
  }

  /**
   * Generate image using Gemini API (fallback method)
   * Uses gemini-2.0-flash-exp which supports native image generation
   */
  private async generateImageWithGeminiAPI(options: { prompt: string; width?: number; height?: number }): Promise<GenerateImageResponse> {
    const {
      prompt,
      width = 1024,
      height = 1024,
    } = options;

    // gemini-2.0-flash-exp supports image output via responseModalities
    const model = 'gemini-2.0-flash-exp';

    logger.info('Gemini API image generation request', { model, prompt: prompt.substring(0, 100) });

    try {
      const response = await retry(
        async () => {
          const apiKey = this.getApiKey();

          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Generate a high-quality professional image: ${prompt}. Do not include any text or watermarks in the image.`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
                temperature: 1,
              },
            }),
          });

          if (!res.ok) {
            const error = await res.text();
            throw new Error(`Gemini API error: ${res.status} ${error}`);
          }

          return res.json();
        },
        {
          maxAttempts: 3,
          retryOn: isRetryableError,
        }
      );

      // Extract image data from response — may be in any part
      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData?.data);

      if (!imagePart?.inlineData) {
        logger.error('No image data in Gemini response', { parts: parts.map((p: { text?: string; inlineData?: unknown }) => p.text ? 'text' : p.inlineData ? 'image' : 'unknown') });
        throw new APIError('No image data in Gemini response', 'gemini');
      }

      logger.info('Gemini image generation success');

      return {
        imageData: Buffer.from(imagePart.inlineData.data, 'base64'),
        mimeType: imagePart.inlineData.mimeType || 'image/png',
      };
    } catch (error) {
      logger.error('Gemini image generation error', { error: String(error) });
      throw new APIError(
        error instanceof Error ? error.message : 'Gemini image generation failed',
        'gemini'
      );
    }
  }
}

export const gemini = new GeminiClient();

// Model aliases for user-friendly names
export const IMAGE_MODELS = {
  'gemini-flash': 'gemini-2.0-flash-exp',
  'imagen-3': 'imagen-3.0-generate-001',
} as const;
