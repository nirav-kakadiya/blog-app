import Anthropic from '@anthropic-ai/sdk';
import { retry, isRetryableError } from './retry';
import { APIError } from './errors';
import { logger } from './logger';

interface GenerateOptions {
  prompt: string;
  model?: 'claude-3-opus-20240229' | 'claude-3-sonnet-20240229' | 'claude-3-haiku-20240307';
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

interface GenerateResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

class ClaudeClient {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.CLAUDE_API_KEY;
      if (!apiKey) {
        throw new APIError('Claude API key not configured', 'claude');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  async generate(options: GenerateOptions): Promise<GenerateResponse> {
    const {
      prompt,
      model = 'claude-3-sonnet-20240229',
      maxTokens = 4096,
      temperature = 0.7,
      systemPrompt,
    } = options;

    logger.info('Claude generate request', { model, promptLength: prompt.length });

    try {
      const response = await retry(
        async () => {
          const client = this.getClient();
          return client.messages.create({
            model,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
          });
        },
        {
          maxAttempts: 3,
          retryOn: isRetryableError,
        }
      );

      const textContent = response.content.find((c) => c.type === 'text');
      const content = textContent?.type === 'text' ? textContent.text : '';

      logger.info('Claude generate success', {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });

      return {
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      logger.error('Claude generate error', { error: String(error) });
      throw new APIError(
        error instanceof Error ? error.message : 'Claude API request failed',
        'claude'
      );
    }
  }

  async generateJSON<T>(options: GenerateOptions): Promise<T> {
    const response = await this.generate({
      ...options,
      prompt: `${options.prompt}\n\nRespond with valid JSON only. No markdown code blocks.`,
    });

    try {
      // Try to parse the response as JSON, handling potential markdown code blocks
      let jsonStr = response.content.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      return JSON.parse(jsonStr) as T;
    } catch {
      throw new APIError('Failed to parse Claude response as JSON', 'claude');
    }
  }
}

export const claude = new ClaudeClient();
