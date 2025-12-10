import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QuickbooksAuthService } from '../quickbooks-auth.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('QuickbooksAuthService', () => {
  let service: QuickbooksAuthService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuickbooksAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                QB_ENABLED: 'true',
                QB_CLIENT_ID: 'test_client_id',
                QB_CLIENT_SECRET: 'test_client_secret',
                QB_REFRESH_TOKEN: 'test_refresh_token',
                QB_TOKEN_URL: 'https://oauth.test.com/token',
                QB_ACCESS_TOKEN: 'fallback_token',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<QuickbooksAuthService>(QuickbooksAuthService);
    configService = module.get<ConfigService>(ConfigService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('isEnabled', () => {
    it('should return true when QB_ENABLED is true', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when QB_ENABLED is false', async () => {
      const module = await Test.createTestingModule({
        providers: [
          QuickbooksAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                if (key === 'QB_ENABLED') return 'false';
                return defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const disabledService = module.get<QuickbooksAuthService>(QuickbooksAuthService);
      expect(disabledService.isEnabled()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('should throw error when QuickBooks is disabled', async () => {
      const module = await Test.createTestingModule({
        providers: [
          QuickbooksAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                if (key === 'QB_ENABLED') return 'false';
                return defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const disabledService = module.get<QuickbooksAuthService>(QuickbooksAuthService);
      
      await expect(disabledService.getAccessToken()).rejects.toThrow(
        'QuickBooks integration is disabled',
      );
    });

    it('should return fallback token when OAuth2 credentials missing', async () => {
      const module = await Test.createTestingModule({
        providers: [
          QuickbooksAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                const config: Record<string, string> = {
                  QB_ENABLED: 'true',
                  QB_ACCESS_TOKEN: 'fallback_token',
                };
                return config[key] || defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const fallbackService = module.get<QuickbooksAuthService>(QuickbooksAuthService);
      
      const token = await fallbackService.getAccessToken();
      expect(token).toBe('fallback_token');
    });

    it('should throw error when no credentials available', async () => {
      const module = await Test.createTestingModule({
        providers: [
          QuickbooksAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                if (key === 'QB_ENABLED') return 'true';
                return defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const noCredsService = module.get<QuickbooksAuthService>(QuickbooksAuthService);
      
      await expect(noCredsService.getAccessToken()).rejects.toThrow(
        'QuickBooks credentials missing',
      );
    });

    it('should refresh token and return new access token', async () => {
      const mockResponse = {
        data: {
          access_token: 'new_access_token',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const token = await service.getAccessToken();

      expect(token).toBe('new_access_token');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://oauth.test.com/token',
        expect.any(String), // URLSearchParams
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': expect.stringContaining('Basic '),
          }),
        }),
      );
    });

    it('should return cached token when still valid', async () => {
      const mockResponse = {
        data: {
          access_token: 'cached_token',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      // First call - should fetch new token
      const token1 = await service.getAccessToken();
      expect(token1).toBe('cached_token');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // Second call - should use cached token
      const token2 = await service.getAccessToken();
      expect(token2).toBe('cached_token');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should refresh token when cached token expired', async () => {
      const mockResponse1 = {
        data: {
          access_token: 'first_token',
          expires_in: 0, // Expires immediately
        },
      };
      const mockResponse2 = {
        data: {
          access_token: 'second_token',
          expires_in: 3600,
        },
      };

      mockedAxios.post
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      // First call
      const token1 = await service.getAccessToken();
      expect(token1).toBe('first_token');

      // Wait a bit to ensure token is expired
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second call - should refresh
      const token2 = await service.getAccessToken();
      expect(token2).toBe('second_token');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle token refresh errors gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('OAuth2 server error'));

      await expect(service.getAccessToken()).rejects.toThrow(
        'QuickBooks token refresh failed',
      );
    });

    it('should clear cache on token refresh error', async () => {
      // First, get a valid token
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'valid_token',
          expires_in: 3600,
        },
      });

      await service.getAccessToken();

      // Clear cache manually to simulate expired token
      service.clearCache();

      // Now fail the refresh
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      await expect(service.getAccessToken()).rejects.toThrow();

      // Verify cache was cleared by checking that next successful call works
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'new_valid_token',
          expires_in: 3600,
        },
      });

      const token = await service.getAccessToken();
      expect(token).toBe('new_valid_token');
    });
  });

  describe('clearCache', () => {
    it('should clear cached token', async () => {
      const mockResponse = {
        data: {
          access_token: 'token_to_clear',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      // Get token to populate cache
      await service.getAccessToken();
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // Clear cache
      service.clearCache();

      // Get token again - should call API again
      await service.getAccessToken();
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });
});
