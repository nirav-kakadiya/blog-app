import OpenAI from 'openai';
import { retry, isRetryableError } from './retry';
import { APIError } from './errors';
import { logger } from './logger';

interface GenerateOptions {
  prompt: string;
  model?: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
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

class OpenAIClient {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new APIError('OpenAI API key not configured', 'openai');
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  async searchWeb(query: string, instructions: string): Promise<string> {
    logger.info('OpenAI web search request', { queryLength: query.length });

    try {
      const client = this.getClient();

      const response = await retry(
        async () => {
          return client.responses.create({
            model: 'gpt-4o-mini',
            tools: [{ type: 'web_search_preview' as const }],
            instructions,
            input: query,
          });
        },
        {
          maxAttempts: 2,
          retryOn: isRetryableError,
        }
      );

      // Extract text content from response output items
      let content = '';
      if (response.output && Array.isArray(response.output)) {
        for (const item of response.output) {
          if (item.type === 'message' && item.content) {
            for (const block of item.content) {
              if (block.type === 'output_text') {
                content += block.text;
              }
            }
          }
        }
      }

      logger.info('OpenAI web search success', { contentLength: content.length });
      return content;
    } catch (error) {
      logger.error('OpenAI web search error', { error: String(error) });
      throw new APIError(
        error instanceof Error ? error.message : 'OpenAI web search failed',
        'openai'
      );
    }
  }

  async generate(options: GenerateOptions): Promise<GenerateResponse> {
    const {
      prompt,
      model = 'gpt-4o-mini',
      maxTokens = 4096,
      temperature = 0.7,
      systemPrompt,
    } = options;

    logger.info('OpenAI generate request', { model, promptLength: prompt.length });

    try {
      const response = await retry(
        async () => {
          const client = this.getClient();
          const messages: OpenAI.ChatCompletionMessageParam[] = [];

          if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
          }
          messages.push({ role: 'user', content: prompt });

          return client.chat.completions.create({
            model,
            max_tokens: maxTokens,
            temperature,
            messages,
          });
        },
        {
          maxAttempts: 3,
          retryOn: isRetryableError,
        }
      );

      const content = response.choices[0]?.message?.content || '';

      logger.info('OpenAI generate success', {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      });

      return {
        content,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
        },
      };
    } catch (error) {
      logger.error('OpenAI generate error', { error: String(error) });
      throw new APIError(
        error instanceof Error ? error.message : 'OpenAI API request failed',
        'openai'
      );
    }
  }

  async generateJSON<T>(options: GenerateOptions): Promise<T> {
    const response = await this.generate({
      ...options,
      prompt: `${options.prompt}\n\nRespond with valid JSON only. No markdown code blocks.`,
    });

    try {
      let jsonStr = response.content.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      return JSON.parse(jsonStr) as T;
    } catch {
      throw new APIError('Failed to parse OpenAI response as JSON', 'openai');
    }
  }
}

export const openai = new OpenAIClient();
