import { ConfigService } from '@nestjs/config';
import { LlmService } from '../llm.service';

describe('LlmService', () => {
  let service: LlmService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    } as any;

    service = new LlmService(configService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isEnabled', () => {
    it('should return true when provider and API key are configured', () => {
      configService.get.mockReturnValueOnce('openai').mockReturnValueOnce('test-api-key');

      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when provider is missing', () => {
      configService.get.mockReturnValueOnce(null).mockReturnValueOnce('test-api-key');

      expect(service.isEnabled()).toBe(false);
    });

    it('should return false when API key is missing', () => {
      configService.get.mockReturnValueOnce('openai').mockReturnValueOnce(null);

      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('generateText', () => {
    it('should throw LLM_NOT_CONFIGURED when provider is not configured', async () => {
      configService.get.mockReturnValue(null);

      await expect(
        service.generateText({
          systemPrompt: 'test system',
          userPrompt: 'test user',
        })
      ).rejects.toThrow('LLM_NOT_CONFIGURED');
    });

    it('should throw LLM_PROVIDER_NOT_SUPPORTED for unsupported provider', async () => {
      configService.get
        .mockReturnValueOnce('unsupported-provider')
        .mockReturnValueOnce('test-api-key');

      await expect(
        service.generateText({
          systemPrompt: 'test system',
          userPrompt: 'test user',
        })
      ).rejects.toThrow('LLM_PROVIDER_NOT_SUPPORTED');
    });

    it('should successfully call OpenAI API and return result', async () => {
      configService.get
        .mockReturnValueOnce('openai') // provider
        .mockReturnValueOnce('test-api-key') // api key
        .mockReturnValueOnce('gpt-4o-mini') // model
        .mockReturnValueOnce('800') // max tokens
        .mockReturnValueOnce('0.2'); // temperature

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Test response from OpenAI',
              },
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        }),
      };

      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await service.generateText({
        systemPrompt: 'You are a helpful assistant',
        userPrompt: 'Hello',
      });

      expect(result).toEqual({
        text: 'Test response from OpenAI',
        model: 'gpt-4o-mini',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      });

      expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: 'Hello' },
          ],
          max_tokens: 800,
          temperature: 0.2,
        }),
      });
    });

    it('should throw LLM_REQUEST_FAILED when OpenAI returns non-OK response', async () => {
      configService.get
        .mockReturnValueOnce('openai')
        .mockReturnValueOnce('test-api-key')
        .mockReturnValueOnce('gpt-4o-mini')
        .mockReturnValueOnce('800')
        .mockReturnValueOnce('0.2');

      const mockResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      };

      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await expect(
        service.generateText({
          systemPrompt: 'test',
          userPrompt: 'test',
        })
      ).rejects.toThrow('LLM_REQUEST_FAILED');
    });

    it('should use custom model, maxTokens, and temperature from input', async () => {
      configService.get
        .mockReturnValueOnce('openai')
        .mockReturnValueOnce('test-api-key')
        .mockReturnValueOnce('default-model')
        .mockReturnValueOnce('500')
        .mockReturnValueOnce('0.5');

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'response' } }],
          usage: {},
        }),
      };

      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await service.generateText({
        systemPrompt: 'test',
        userPrompt: 'test',
        input: {
          purpose: 'AI_OPS_SUMMARY',
          model: 'custom-model',
          maxTokens: 1000,
          temperature: 0.7,
        },
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.model).toBe('custom-model');
      expect(body.max_tokens).toBe(1000);
      expect(body.temperature).toBe(0.7);
    });

    it('should handle fetch errors gracefully', async () => {
      configService.get
        .mockReturnValueOnce('openai')
        .mockReturnValueOnce('test-api-key')
        .mockReturnValueOnce('gpt-4o-mini')
        .mockReturnValueOnce('800')
        .mockReturnValueOnce('0.2');

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        service.generateText({
          systemPrompt: 'test',
          userPrompt: 'test',
        })
      ).rejects.toThrow('LLM_REQUEST_FAILED');
    });
  });
});
