import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * QuickbooksAuthService manages OAuth2 token lifecycle for QuickBooks API
 * 
 * Responsibilities:
 * - Maintain current access token and expiry in memory
 * - Automatically refresh tokens when expired
 * - Handle disabled QuickBooks gracefully
 */
@Injectable()
export class QuickbooksAuthService {
  private readonly logger = new Logger(QuickbooksAuthService.name);
  
  private readonly enabled: boolean;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly refreshToken: string;
  private readonly tokenUrl: string;
  private readonly fallbackAccessToken: string;

  // In-memory token cache
  private cachedAccessToken: string | null = null;
  private tokenExpiresAt: number | null = null; // Unix timestamp in milliseconds

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('QB_ENABLED', 'false') === 'true';
    this.clientId = this.configService.get<string>('QB_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>('QB_CLIENT_SECRET', '');
    this.refreshToken = this.configService.get<string>('QB_REFRESH_TOKEN', '');
    this.tokenUrl = this.configService.get<string>(
      'QB_TOKEN_URL',
      'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    );
    this.fallbackAccessToken = this.configService.get<string>('QB_ACCESS_TOKEN', '');

    if (!this.enabled) {
      this.logger.warn('QuickBooks integration is DISABLED (QB_ENABLED=false)');
    } else if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      this.logger.warn(
        'QuickBooks OAuth2 credentials incomplete. Will fallback to QB_ACCESS_TOKEN if available.',
      );
    } else {
      this.logger.log('QuickBooks OAuth2 auth service initialized');
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   * @throws Error if QuickBooks is disabled or credentials are missing
   */
  async getAccessToken(): Promise<string> {
    // Check if QB is enabled
    if (!this.enabled) {
      throw new Error('QuickBooks integration is disabled');
    }

    // Check if we have OAuth2 credentials
    const hasOAuthCredentials = this.clientId && this.clientSecret && this.refreshToken;

    // If we have a cached token that's still valid, return it
    if (this.cachedAccessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      this.logger.debug('Using cached QuickBooks access token');
      return this.cachedAccessToken;
    }

    // If no OAuth2 credentials, fallback to env token
    if (!hasOAuthCredentials) {
      if (this.fallbackAccessToken) {
        this.logger.warn(
          'Using fallback QB_ACCESS_TOKEN from env (OAuth2 credentials not configured)',
        );
        return this.fallbackAccessToken;
      }
      throw new Error('QuickBooks credentials missing (no OAuth2 config and no fallback token)');
    }

    // Refresh the token
    try {
      this.logger.log('Refreshing QuickBooks access token via OAuth2');
      
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          },
          timeout: 10000,
        },
      );

      const { access_token, expires_in } = response.data;

      if (!access_token) {
        throw new Error('No access_token in refresh response');
      }

      // Cache the token with a safety margin (5 minutes before actual expiry)
      this.cachedAccessToken = access_token;
      const expiresInMs = (expires_in - 300) * 1000; // Convert to ms, subtract 5 min safety margin
      this.tokenExpiresAt = Date.now() + expiresInMs;

      this.logger.log(
        `QuickBooks token refreshed successfully, expires in ${Math.floor(expiresInMs / 1000 / 60)} minutes`,
      );

      return access_token;
    } catch (error: any) {
      this.logger.error('Failed to refresh QuickBooks access token:', error.message);

      if (error.response) {
        this.logger.error(
          `QuickBooks OAuth2 error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
      }

      // Clear cached token on error
      this.cachedAccessToken = null;
      this.tokenExpiresAt = null;

      throw new Error(`QuickBooks token refresh failed: ${error.message}`);
    }
  }

  /**
   * Check if QuickBooks integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Clear the cached token (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.cachedAccessToken = null;
    this.tokenExpiresAt = null;
    this.logger.debug('QuickBooks token cache cleared');
  }
}
