import { retry, isRetryableError } from './retry';
import { APIError } from './errors';
import { logger } from './logger';
import { vertexAI, type ImageModel, type AspectRatio } from './vertex-ai';

export interface GenerateImageOptions {
  prompt: string;
  model?: ImageModel;
  aspectRatio?: AspectRatio;
  width?: number;
  height?: number;
}

interface GenerateImageResponse {
  imageData: Buffer;
  mimeType: string;
}

/**
 * Unified Image Generation Client
 *
 * Primary:  Vertex AI with service account (gemini-2.5-flash-image)
 * Fallback: Gemini API with API key (same model via generativelanguage.googleapis.com)
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
   * Convert width/height to aspect ratio
   */
  private getAspectRatio(width: number, height: number): AspectRatio {
    const ratio = width / height;

    if (Math.abs(ratio - 1) < 0.1) return '1:1';
    if (Math.abs(ratio - 16 / 9) < 0.2) return '16:9';
    if (Math.abs(ratio - 9 / 16) < 0.2) return '9:16';
    if (Math.abs(ratio - 4 / 3) < 0.2) return '4:3';
    if (Math.abs(ratio - 3 / 4) < 0.2) return '3:4';
    if (Math.abs(ratio - 3 / 2) < 0.2) return '3:2';
    if (Math.abs(ratio - 2 / 3) < 0.2) return '2:3';

    return ratio > 1 ? '16:9' : '9:16';
  }

  async generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
    const {
      prompt,
      model = 'gemini-2.5-flash-image',
      width = 1024,
      height = 1024,
    } = options;

    const aspectRatio = options.aspectRatio || this.getAspectRatio(width, height);

    // Try Vertex AI first (service account auth) unless too many recent failures
    if (this.vertexAIFailCount < this.MAX_VERTEX_FAILURES) {
      try {
        const result = await vertexAI.generateImage({
          prompt,
          model,
          aspectRatio,
        });

        // Reset fail count on success
        this.vertexAIFailCount = 0;
        return result;
      } catch (vertexError) {
        this.vertexAIFailCount++;
        logger.warn('Vertex AI failed, falling back to Gemini API', {
          error: String(vertexError),
          model,
          failCount: this.vertexAIFailCount,
        });
      }
    }

    // Fallback to Gemini API (API key auth) — same model, different endpoint
    return this.generateImageWithGeminiAPI({ prompt, model, aspectRatio });
  }

  /**
   * Fallback: Generate image using Gemini API (API key auth)
   * Uses the same generateContent format as Vertex AI
   */
  private async generateImageWithGeminiAPI(options: {
    prompt: string;
    model: ImageModel;
    aspectRatio: AspectRatio;
  }): Promise<GenerateImageResponse> {
    const { prompt, model, aspectRatio } = options;

    logger.info('Gemini API image generation (fallback)', { model, prompt: prompt.substring(0, 100) });

    try {
      const response = await retry(
        async () => {
          const apiKey = this.getApiKey();

          // Gemini API endpoint (same generateContent format as Vertex AI)
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
                      text: `Generate a high-quality professional image: ${prompt}. Do not include any text, watermarks, or logos in the image.`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
                imageConfig: {
                  aspectRatio,
                },
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

      // Same response format as Vertex AI: candidates[0].content.parts[]
      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(
        (p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData?.data
      );

      if (!imagePart?.inlineData) {
        const partTypes = parts.map(
          (p: { text?: string; inlineData?: unknown }) =>
            p.text ? 'text' : p.inlineData ? 'image' : 'unknown'
        );
        logger.error('No image data in Gemini API response', { partTypes, model });
        throw new APIError(`No image data in Gemini response (got: ${partTypes.join(', ')})`, 'gemini');
      }

      logger.info('Gemini API image generation success', { model });

      return {
        imageData: Buffer.from(imagePart.inlineData.data, 'base64'),
        mimeType: imagePart.inlineData.mimeType || 'image/png',
      };
    } catch (error) {
      logger.error('Gemini API image generation error', { error: String(error), model });
      throw new APIError(
        error instanceof Error ? error.message : 'Gemini image generation failed',
        'gemini'
      );
    }
  }
}

export const gemini = new GeminiClient();

// Re-export types for external use
export type { ImageModel, AspectRatio, GenerateImageResponse };
