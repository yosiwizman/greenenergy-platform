// Mock prisma
jest.mock('@greenenergy/db', () => ({
  prisma: {
    llmCallLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { LlmUsageService } from '../llm-usage.service';
import { prisma } from '@greenenergy/db';

describe('LlmUsageService', () => {
  let service: LlmUsageService;

  beforeEach(() => {
    service = new LlmUsageService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('logCall should write to prisma and never throw', async () => {
    (prisma.llmCallLog.create as jest.Mock).mockResolvedValueOnce({ id: '1' });

    await expect(
      service.logCall({
        feature: 'AI_OPS_JOB_SUMMARY',
        jobId: 'job-1',
        provider: 'openai',
        model: 'gpt-4o-mini',
        tokensIn: 10,
        tokensOut: 5,
        durationMs: 123,
        isFallback: false,
        success: true,
        environment: 'test',
      })
    ).resolves.toBeUndefined();

    expect(prisma.llmCallLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        feature: 'AI_OPS_JOB_SUMMARY',
        jobId: 'job-1',
        provider: 'openai',
        model: 'gpt-4o-mini',
        tokensIn: 10,
        tokensOut: 5,
        durationMs: 123,
        isFallback: false,
        success: true,
        environment: 'test',
      }),
    });
  });

  it('logCall should swallow prisma errors', async () => {
    (prisma.llmCallLog.create as jest.Mock).mockRejectedValueOnce(new Error('db down'));

    await expect(
      service.logCall({
        feature: 'AI_OPS_CUSTOMER_MESSAGE',
        isFallback: true,
        success: true,
      })
    ).resolves.toBeUndefined();
  });

  it('getSummary should aggregate totals + breakdowns + cost estimate', async () => {
    (prisma.llmCallLog.findMany as jest.Mock).mockResolvedValueOnce([
      {
        feature: 'AI_OPS_JOB_SUMMARY',
        model: 'gpt-4o-mini',
        tokensIn: 500_000,
        tokensOut: 250_000,
        isFallback: false,
        success: true,
      },
      {
        feature: 'AI_OPS_JOB_SUMMARY',
        model: 'gpt-4o-mini',
        tokensIn: 500_000,
        tokensOut: 750_000,
        isFallback: false,
        success: true,
      },
      {
        feature: 'AI_OPS_CUSTOMER_MESSAGE',
        model: 'gpt-4o-mini',
        tokensIn: null,
        tokensOut: null,
        isFallback: true,
        success: true,
      },
      {
        feature: 'AI_OPS_CUSTOMER_MESSAGE',
        model: null,
        tokensIn: 0,
        tokensOut: 0,
        isFallback: false,
        success: false,
      },
    ]);

    const summary = await service.getSummary(30);

    expect(prisma.llmCallLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
          }),
        }),
      })
    );

    expect(summary.days).toBe(30);
    expect(summary.totalCalls).toBe(4);
    expect(summary.successCalls).toBe(2);
    expect(summary.fallbackCalls).toBe(1);
    expect(summary.errorCalls).toBe(1);

    expect(summary.tokensInTotal).toBe(1_000_000);
    expect(summary.tokensOutTotal).toBe(1_000_000);
    expect(summary.estimatedCostUsd).toBe(0.75);

    const byFeatureSummary = Object.fromEntries(
      summary.byFeature.map((i) => [i.feature, i])
    );

    expect(byFeatureSummary.AI_OPS_JOB_SUMMARY).toEqual(
      expect.objectContaining({
        calls: 2,
        successCalls: 2,
        fallbackCalls: 0,
        errorCalls: 0,
        tokensInTotal: 1_000_000,
        tokensOutTotal: 1_000_000,
        estimatedCostUsd: 0.75,
      })
    );

    expect(byFeatureSummary.AI_OPS_CUSTOMER_MESSAGE).toEqual(
      expect.objectContaining({
        calls: 2,
        successCalls: 0,
        fallbackCalls: 1,
        errorCalls: 1,
        tokensInTotal: 0,
        tokensOutTotal: 0,
        estimatedCostUsd: 0,
      })
    );

    const byModelSummary = Object.fromEntries(summary.byModel.map((i) => [i.model, i]));

    expect(byModelSummary['gpt-4o-mini']).toEqual(
      expect.objectContaining({
        calls: 3,
        successCalls: 2,
        fallbackCalls: 1,
        errorCalls: 0,
        tokensInTotal: 1_000_000,
        tokensOutTotal: 1_000_000,
        estimatedCostUsd: 0.75,
      })
    );

    expect(byModelSummary.unknown).toEqual(
      expect.objectContaining({
        calls: 1,
        successCalls: 0,
        fallbackCalls: 0,
        errorCalls: 1,
        tokensInTotal: 0,
        tokensOutTotal: 0,
        estimatedCostUsd: 0,
      })
    );
  });

  it('getRecent should return list items with ISO createdAt', async () => {
    (prisma.llmCallLog.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: 'log-1',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        feature: 'AI_OPS_JOB_SUMMARY',
        jobId: 'job-1',
        customerId: null,
        internalUserId: null,
        provider: 'openai',
        model: 'gpt-4o-mini',
        tokensIn: 10,
        tokensOut: 20,
        durationMs: 123,
        isFallback: false,
        success: true,
        errorCode: null,
        environment: 'staging',
        meta: null,
      },
    ]);

    const items = await service.getRecent(10);

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(
      expect.objectContaining({
        id: 'log-1',
        createdAt: '2025-01-01T00:00:00.000Z',
        feature: 'AI_OPS_JOB_SUMMARY',
        provider: 'openai',
        model: 'gpt-4o-mini',
      })
    );
  });
});
