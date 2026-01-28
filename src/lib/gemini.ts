import { retry, isRetryableError } from './retry';
import { APIError } from './errors';
import { logger } from './logger';

interface GenerateImageOptions {
  prompt: string;
  model?: 'gemini-2.5-flash' | 'gemini-3-pro';
  width?: number;
  height?: number;
}

interface GenerateImageResponse {
  imageData: Buffer;
  mimeType: string;
}

class GeminiClient {
  private apiKey: string | null = null;

  private getApiKey(): string {
    if (!this.apiKey) {
      this.apiKey = process.env.GEMINI_API_KEY || null;
      if (!this.apiKey) {
        throw new APIError('Gemini API key not configured', 'gemini');
      }
    }
    return this.apiKey;
  }

  async generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
    const {
      prompt,
      model = 'gemini-2.5-flash',
      width = 1024,
      height = 1024,
    } = options;

    logger.info('Gemini image generation request', { model, prompt: prompt.substring(0, 100) });

    try {
      const response = await retry(
        async () => {
          const apiKey = this.getApiKey();

          // Gemini API endpoint for image generation
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
                      text: `Generate an image: ${prompt}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ['image'],
                imageDimensions: { width, height },
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

      // Extract image data from response
      const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;

      if (!imageData) {
        throw new APIError('No image data in Gemini response', 'gemini');
      }

      logger.info('Gemini image generation success');

      return {
        imageData: Buffer.from(imageData.data, 'base64'),
        mimeType: imageData.mimeType || 'image/png',
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
  'nano-banana': 'gemini-2.5-flash',
  'nano-banana-pro': 'gemini-3-pro',
} as const;
