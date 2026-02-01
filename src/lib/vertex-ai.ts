import { GoogleAuth } from 'google-auth-library';
import { logger } from './logger';
import { APIError } from './errors';
import { retry, isRetryableError } from './retry';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Supported Gemini image generation models via Vertex AI
 *
 * gemini-2.5-flash-image  — Nano Banana (fast, cost-effective)
 * gemini-3-pro-image-preview — Nano Banana Pro (highest quality, 4K support)
 */
export type ImageModel = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';

export type AspectRatio =
  | '1:1' | '3:2' | '2:3' | '3:4' | '4:3'
  | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';

export interface GenerateImageOptions {
  prompt: string;
  model?: ImageModel;
  aspectRatio?: AspectRatio;
}

export interface GenerateImageResponse {
  imageData: Buffer;
  mimeType: string;
}

interface VertexAIConfig {
  projectId: string;
  location: string;
}

/**
 * Vertex AI Image Generation Client
 * Uses Gemini image models (generateContent API) with service account authentication
 */
class VertexAIImageClient {
  private auth: GoogleAuth | null = null;
  private config: VertexAIConfig = {
    projectId: process.env.VERTEX_AI_PROJECT || 'tough-octane-485509-c8',
    location: process.env.VERTEX_AI_LOCATION || 'us-central1',
  };

  /**
   * Initialize Google Auth with service account credentials
   */
  private async getAuth(): Promise<GoogleAuth> {
    if (this.auth) {
      return this.auth;
    }

    const credentialsPath = this.findCredentialsFile();

    if (!credentialsPath) {
      throw new APIError(
        'Google credentials file not found. Please add google-credentials.json to the project root.',
        'vertex-ai'
      );
    }

    logger.info('Using Google credentials from', { path: credentialsPath });

    this.auth = new GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    return this.auth;
  }

  /**
   * Find the credentials file in various locations
   */
  private findCredentialsFile(): string | null {
    const possiblePaths = [
      path.join(process.cwd(), 'google-credentials.json'),
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      path.join(__dirname, '../../google-credentials.json'),
      path.join(__dirname, '../../../google-credentials.json'),
    ].filter(Boolean) as string[];

    for (const credPath of possiblePaths) {
      try {
        if (fs.existsSync(credPath)) {
          return credPath;
        }
      } catch {
        // Continue to next path
      }
    }

    return null;
  }

  /**
   * Get access token for API calls
   */
  private async getAccessToken(): Promise<string> {
    const auth = await this.getAuth();
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();

    if (!tokenResponse.token) {
      throw new APIError('Failed to obtain access token', 'vertex-ai');
    }

    return tokenResponse.token;
  }

  /**
   * Generate image using Vertex AI Gemini image models (generateContent API)
   *
   * Primary:  gemini-2.5-flash-image (Nano Banana — fast, cheap)
   * Fallback: gemini-3-pro-image-preview (Nano Banana Pro — highest quality)
   */
  async generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
    const {
      prompt,
      model = 'gemini-2.5-flash-image',
      aspectRatio = '16:9',
    } = options;

    logger.info('Vertex AI generateContent image request', {
      model,
      prompt: prompt.substring(0, 100),
      aspectRatio,
    });

    try {
      const response = await retry(
        async () => {
          const accessToken = await this.getAccessToken();

          // Vertex AI generateContent endpoint
          const endpoint = `https://${this.config.location}-aiplatform.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${model}:generateContent`;

          // Build generateContent request payload
          const payload = {
            contents: [
              {
                role: 'user',
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
          };

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const errorText = await res.text();
            logger.error('Vertex AI API error response', {
              status: res.status,
              model,
              error: errorText,
            });
            throw new Error(`Vertex AI API error: ${res.status} ${errorText}`);
          }

          return res.json();
        },
        {
          maxAttempts: 3,
          retryOn: isRetryableError,
        }
      );

      // Extract image data from generateContent response
      // Response format: candidates[0].content.parts[] → { inlineData: { mimeType, data } } or { text }
      const parts = response.candidates?.[0]?.content?.parts;

      if (!parts || !Array.isArray(parts)) {
        throw new APIError('No content parts in Vertex AI response', 'vertex-ai');
      }

      // Find the image part (there may be text parts too)
      const imagePart = parts.find(
        (p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData?.data
      );

      if (!imagePart?.inlineData) {
        const partTypes = parts.map(
          (p: { text?: string; inlineData?: unknown }) =>
            p.text ? 'text' : p.inlineData ? 'image' : 'unknown'
        );
        logger.error('No image data in Vertex AI response parts', { partTypes, model });
        throw new APIError(`No image data in Vertex AI response (got: ${partTypes.join(', ')})`, 'vertex-ai');
      }

      logger.info('Vertex AI image generation success', { model });

      return {
        imageData: Buffer.from(imagePart.inlineData.data, 'base64'),
        mimeType: imagePart.inlineData.mimeType || 'image/png',
      };
    } catch (error) {
      logger.error('Vertex AI image generation error', { error: String(error), model });

      if (error instanceof APIError) {
        throw error;
      }

      throw new APIError(
        error instanceof Error ? error.message : 'Vertex AI image generation failed',
        'vertex-ai'
      );
    }
  }
}

export const vertexAI = new VertexAIImageClient();
