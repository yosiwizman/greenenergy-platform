import { ConfigService } from '@nestjs/config';
import { EmbedService } from './embed.service';
import { prisma } from '@greenenergy/db';

// Mock prisma
jest.mock('@greenenergy/db', () => ({
  prisma: {
    job: {
      findUnique: jest.fn(),
    },
  },
}));

describe('EmbedService', () => {
  let service: EmbedService;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'EMBED_SIGNING_SECRET':
            return 'test-secret-key-for-signing-jwt-tokens';
          case 'EMBED_TOKEN_TTL_MINUTES':
            return '30';
          case 'INTERNAL_DASHBOARD_BASE_URL':
            return 'http://localhost:3002';
          default:
            return null;
        }
      }),
    } as any;

    service = new EmbedService(mockConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Generation and Verification', () => {
    it('should generate a valid JWT token', () => {
      const jobId = 'test-job-123';
      const panelType = 'QC_PANEL';

      const token = service.generateToken(jobId, panelType);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify a valid token', () => {
      const jobId = 'test-job-123';
      const panelType = 'QC_PANEL';

      const token = service.generateToken(jobId, panelType);
      const payload = service.verifyToken(token);

      expect(payload).toBeDefined();
      expect(payload.jobId).toBe(jobId);
      expect(payload.panelType).toBe(panelType);
      expect(payload.exp).toBeDefined();
    });

    it('should fail to verify an invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => service.verifyToken(invalidToken)).toThrow();
    });

    it('should fail to verify a token with wrong signature', () => {
      // Create a token with a different secret
      const differentConfigService = {
        get: jest.fn((key: string) => {
          switch (key) {
            case 'EMBED_SIGNING_SECRET':
              return 'different-secret-key';
            case 'EMBED_TOKEN_TTL_MINUTES':
              return '30';
            default:
              return null;
          }
        }),
      } as any;

      const differentService = new EmbedService(differentConfigService);
      const token = differentService.generateToken('test-job-123', 'QC_PANEL');

      // Try to verify with original service (different secret)
      expect(() => service.verifyToken(token)).toThrow();
    });

    it('should include expiration timestamp in token payload', () => {
      const jobId = 'test-job-123';
      const panelType = 'RISK_VIEW';

      const beforeGen = Math.floor(Date.now() / 1000);
      const token = service.generateToken(jobId, panelType);
      const afterGen = Math.floor(Date.now() / 1000);

      const payload = service.verifyToken(token);

      // Token should expire 30 minutes from now
      const expectedExpMin = beforeGen + 30 * 60;
      const expectedExpMax = afterGen + 30 * 60;

      expect(payload.exp).toBeGreaterThanOrEqual(expectedExpMin);
      expect(payload.exp).toBeLessThanOrEqual(expectedExpMax);
    });
  });

  describe('Embed Link Generation', () => {
    it('should generate embed link for QC_PANEL', async () => {
      const jobId = 'test-job-123';

      // Mock job exists
      (prisma.job.findUnique as jest.Mock).mockResolvedValue({
        id: jobId,
      });

      const result = await service.generateEmbedLink(jobId, 'QC_PANEL');

      expect(result.url).toContain('http://localhost:3002/embed/qc');
      expect(result.url).toContain('token=');
      expect(result.panelType).toBe('QC_PANEL');
      expect(result.jobId).toBe(jobId);
      expect(result.expiresAt).toBeDefined();
    });

    it('should generate embed link for RISK_VIEW', async () => {
      const jobId = 'test-job-456';

      // Mock job exists
      (prisma.job.findUnique as jest.Mock).mockResolvedValue({
        id: jobId,
      });

      const result = await service.generateEmbedLink(jobId, 'RISK_VIEW');

      expect(result.url).toContain('http://localhost:3002/embed/risk');
      expect(result.url).toContain('token=');
      expect(result.panelType).toBe('RISK_VIEW');
      expect(result.jobId).toBe(jobId);
      expect(result.expiresAt).toBeDefined();
    });

    it('should generate embed link for CUSTOMER_PORTAL_VIEW', async () => {
      const jobId = 'test-job-789';

      // Mock job exists
      (prisma.job.findUnique as jest.Mock).mockResolvedValue({
        id: jobId,
      });

      const result = await service.generateEmbedLink(jobId, 'CUSTOMER_PORTAL_VIEW');

      expect(result.url).toContain('http://localhost:3002/embed/portal');
      expect(result.url).toContain('token=');
      expect(result.panelType).toBe('CUSTOMER_PORTAL_VIEW');
      expect(result.jobId).toBe(jobId);
      expect(result.expiresAt).toBeDefined();
    });

    it('should URL-encode the token in embed link', async () => {
      const jobId = 'test-job-123';

      // Mock job exists
      (prisma.job.findUnique as jest.Mock).mockResolvedValue({
        id: jobId,
      });

      const result = await service.generateEmbedLink(jobId, 'QC_PANEL');

      // Extract token from URL
      const urlObj = new URL(result.url);
      const token = urlObj.searchParams.get('token');

      expect(token).toBeDefined();
      expect(token).not.toContain(' '); // No spaces
      expect(token).not.toContain('+'); // No plus signs (common encoding issue)
    });
  });

  describe('Embed Session Resolution', () => {
    it('should resolve a valid embed session', async () => {
      const jobId = 'test-job-123';
      const panelType = 'QC_PANEL';

      // Mock job exists in database
      (prisma.job.findUnique as jest.Mock).mockResolvedValue({
        id: jobId,
        jobNimbusId: 'JN-123',
        customerName: 'Test Customer',
      });

      const token = service.generateToken(jobId, panelType);
      const session = await service.resolveEmbedSession(token);

      expect(session).toBeDefined();
      expect(session.jobId).toBe(jobId);
      expect(session.panelType).toBe(panelType);
      expect(session.exp).toBeDefined();
    });

    it('should throw error if job does not exist', async () => {
      const jobId = 'non-existent-job';
      const panelType = 'QC_PANEL';

      // Mock job not found
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(null);

      const token = service.generateToken(jobId, panelType);

      await expect(service.resolveEmbedSession(token)).rejects.toThrow(
        'Job not found: non-existent-job'
      );
    });

    it('should throw error for invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(service.resolveEmbedSession(invalidToken)).rejects.toThrow();
    });
  });

  describe('Token Lifecycle', () => {
    it('should generate unique tokens for different jobs', () => {
      const token1 = service.generateToken('job-1', 'QC_PANEL');
      const token2 = service.generateToken('job-2', 'QC_PANEL');

      expect(token1).not.toBe(token2);
    });

    it('should generate unique tokens for different panel types', () => {
      const jobId = 'test-job-123';
      const token1 = service.generateToken(jobId, 'QC_PANEL');
      const token2 = service.generateToken(jobId, 'RISK_VIEW');

      expect(token1).not.toBe(token2);
    });

    it('should decode jobId and panelType correctly', () => {
      const testCases = [
        { jobId: 'simple-job-id', panelType: 'QC_PANEL' as const },
        { jobId: 'job-with-uuid-123e4567-e89b', panelType: 'RISK_VIEW' as const },
        { jobId: 'another_job_id', panelType: 'CUSTOMER_PORTAL_VIEW' as const },
      ];

      testCases.forEach(({ jobId, panelType }) => {
        const token = service.generateToken(jobId, panelType);
        const payload = service.verifyToken(token);

        expect(payload.jobId).toBe(jobId);
        expect(payload.panelType).toBe(panelType);
      });
    });
  });
});
