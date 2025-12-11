import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LlmGenerationInput, LlmGenerationResultDTO } from '@greenenergy/shared-types';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    const provider = this.configService.get<string>('LLM_PROVIDER');
    const apiKey = this.configService.get<string>('LLM_API_KEY');
    return !!provider && !!apiKey;
  }

  async generateText(params: {
    systemPrompt: string;
    userPrompt: string;
    input?: LlmGenerationInput;
  }): Promise<LlmGenerationResultDTO> {
    const provider = this.configService.get<string>('LLM_PROVIDER');
    const apiKey = this.configService.get<string>('LLM_API_KEY');
    const defaultModel = this.configService.get<string>('LLM_MODEL') ?? 'gpt-4o-mini';
    const defaultMaxTokens = Number(this.configService.get<string>('LLM_MAX_TOKENS') ?? '800');
    const defaultTemperature = Number(this.configService.get<string>('LLM_TEMPERATURE') ?? '0.2');

    if (!provider || !apiKey) {
      this.logger.warn('LlmService.generateText: LLM provider or API key not configured.');
      throw new Error('LLM_NOT_CONFIGURED');
    }

    const model = params.input?.model ?? defaultModel;
    const maxTokens = params.input?.maxTokens ?? defaultMaxTokens;
    const temperature = params.input?.temperature ?? defaultTemperature;

    if (provider === 'openai') {
      return this.callOpenAi({
        apiKey,
        model,
        systemPrompt: params.systemPrompt,
        userPrompt: params.userPrompt,
        maxTokens,
        temperature,
      });
    }

    this.logger.warn(`LlmService.generateText: Unsupported provider "${provider}"`);
    throw new Error('LLM_PROVIDER_NOT_SUPPORTED');
  }

  private async callOpenAi(args: {
    apiKey: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    maxTokens: number;
    temperature: number;
  }): Promise<LlmGenerationResultDTO> {
    const { apiKey, model, systemPrompt, userPrompt, maxTokens, temperature } = args;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        this.logger.error(`OpenAI API error: ${response.status} - ${text}`);
        throw new Error('LLM_REQUEST_FAILED');
      }

      const json = (await response.json()) as any;
      const choice = json.choices?.[0]?.message?.content ?? '';
      const usage = json.usage ?? {};

      return {
        text: choice,
        model,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error calling OpenAI API: ${errorMessage}`);
      throw new Error('LLM_REQUEST_FAILED');
    }
  }
}
