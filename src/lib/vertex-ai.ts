import { GoogleAuth } from 'google-auth-library';
import { logger } from './logger';
import { APIError } from './errors';
import { retry, isRetryableError } from './retry';
import * as path from 'path';
import * as fs from 'fs';

interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  numberOfImages?: number;
  negativePrompt?: string;
}

interface GenerateImageResponse {
  imageData: Buffer;
  mimeType: string;
}

interface VertexAIConfig {
  projectId: string;
  location: string;
  model: string;
}

/**
 * Vertex AI Image Generation Client
 * Uses Imagen model through Vertex AI with service account authentication
 */
class VertexAIImageClient {
  private auth: GoogleAuth | null = null;
  private config: VertexAIConfig = {
    projectId: 'tough-octane-485509-c8',
    location: 'us-central1',
    model: 'imagen-3.0-generate-001', // Imagen 3 model
  };

  /**
   * Initialize Google Auth with service account credentials
   */
  private async getAuth(): Promise<GoogleAuth> {
    if (this.auth) {
      return this.auth;
    }

    // Try to find credentials file
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
      // Project root
      path.join(process.cwd(), 'google-credentials.json'),
      // Environment variable path
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      // Relative to this file
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
   * Generate image using Vertex AI Imagen
   */
  async generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
    const {
      prompt,
      aspectRatio = '16:9',
      numberOfImages = 1,
      negativePrompt,
    } = options;

    logger.info('Vertex AI image generation request', {
      prompt: prompt.substring(0, 100),
      aspectRatio,
    });

    try {
      const response = await retry(
        async () => {
          const accessToken = await this.getAccessToken();

          // Vertex AI Imagen endpoint
          const endpoint = `https://${this.config.location}-aiplatform.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${this.config.model}:predict`;

          // Build the request payload for Imagen
          const payload: {
            instances: { prompt: string; negativePrompt?: string }[];
            parameters: { sampleCount: number; aspectRatio: string; safetyFilterLevel: string; personGeneration: string };
          } = {
            instances: [
              {
                prompt: prompt,
              },
            ],
            parameters: {
              sampleCount: numberOfImages,
              aspectRatio: aspectRatio,
              safetyFilterLevel: 'block_few', // block_none, block_few, block_some, block_most
              personGeneration: 'allow_adult', // allow_adult, dont_allow
            },
          };

          // Add negative prompt if provided
          if (negativePrompt) {
            payload.instances[0].negativePrompt = negativePrompt;
          }

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

      // Extract image data from response
      const predictions = response.predictions;

      if (!predictions || predictions.length === 0) {
        throw new APIError('No image generated by Vertex AI', 'vertex-ai');
      }

      // Imagen returns base64 encoded image
      const imageBase64 = predictions[0].bytesBase64Encoded;

      if (!imageBase64) {
        throw new APIError('No image data in Vertex AI response', 'vertex-ai');
      }

      logger.info('Vertex AI image generation success');

      return {
        imageData: Buffer.from(imageBase64, 'base64'),
        mimeType: 'image/png',
      };
    } catch (error) {
      logger.error('Vertex AI image generation error', { error: String(error) });

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

// Export types for compatibility with existing code
export type { GenerateImageOptions, GenerateImageResponse };
