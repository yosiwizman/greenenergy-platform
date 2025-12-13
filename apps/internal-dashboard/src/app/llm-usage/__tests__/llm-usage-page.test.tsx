import { fireEvent, render, screen } from '@testing-library/react';
import LlmUsagePage from '../page';

import { fetchLlmUsageRecent, fetchLlmUsageSummary } from '../../../lib/api/llmUsageClient';

jest.mock('../../../lib/api/llmUsageClient', () => ({
  __esModule: true,
  fetchLlmUsageSummary: jest.fn(),
  fetchLlmUsageRecent: jest.fn(),
}));

describe('LlmUsagePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and renders summary + recent calls (default 7 days)', async () => {
    (fetchLlmUsageSummary as unknown as jest.Mock).mockResolvedValueOnce({
      generatedAt: '2025-01-01T00:00:00.000Z',
      days: 7,
      totalCalls: 10,
      successCalls: 8,
      fallbackCalls: 1,
      errorCalls: 1,
      tokensInTotal: 1000,
      tokensOutTotal: 2000,
      estimatedCostUsd: 0.1234,
      byFeature: [
        {
          key: 'AI_OPS_JOB_SUMMARY',
          feature: 'AI_OPS_JOB_SUMMARY',
          calls: 6,
          successCalls: 5,
          fallbackCalls: 1,
          errorCalls: 0,
          tokensInTotal: 600,
          tokensOutTotal: 1200,
          estimatedCostUsd: 0.1,
        },
      ],
      byModel: [
        {
          key: 'gpt-4o-mini',
          model: 'gpt-4o-mini',
          calls: 10,
          successCalls: 8,
          fallbackCalls: 1,
          errorCalls: 1,
          tokensInTotal: 1000,
          tokensOutTotal: 2000,
          estimatedCostUsd: 0.1234,
        },
      ],
    });

    (fetchLlmUsageRecent as unknown as jest.Mock).mockResolvedValueOnce([
      {
        id: 'log-1',
        createdAt: '2025-01-01T00:00:00.000Z',
        feature: 'AI_OPS_JOB_SUMMARY',
        jobId: null,
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

    render(<LlmUsagePage />);

    expect(await screen.findByText('Breakdown by Feature')).toBeInTheDocument();

    expect(fetchLlmUsageSummary).toHaveBeenCalledWith(7);
    expect(fetchLlmUsageRecent).toHaveBeenCalledWith(50);

    expect(screen.getByText('LLM Usage Monitoring')).toBeInTheDocument();
    expect(screen.getAllByText('AI_OPS_JOB_SUMMARY').length).toBeGreaterThan(0);
    expect(screen.getAllByText('gpt-4o-mini').length).toBeGreaterThan(0);
  });

  it('re-fetches when time range changes', async () => {
    (fetchLlmUsageSummary as unknown as jest.Mock)
      .mockResolvedValueOnce({
        generatedAt: '2025-01-01T00:00:00.000Z',
        days: 7,
        totalCalls: 1,
        successCalls: 1,
        fallbackCalls: 0,
        errorCalls: 0,
        tokensInTotal: 0,
        tokensOutTotal: 0,
        estimatedCostUsd: 0,
        byFeature: [],
        byModel: [],
      })
      .mockResolvedValueOnce({
        generatedAt: '2025-01-02T00:00:00.000Z',
        days: 30,
        totalCalls: 2,
        successCalls: 2,
        fallbackCalls: 0,
        errorCalls: 0,
        tokensInTotal: 0,
        tokensOutTotal: 0,
        estimatedCostUsd: 0,
        byFeature: [],
        byModel: [],
      });

    (fetchLlmUsageRecent as unknown as jest.Mock).mockResolvedValue([]);

    render(<LlmUsagePage />);

    expect(await screen.findByText('Total Calls')).toBeInTheDocument();
    expect(fetchLlmUsageSummary).toHaveBeenCalledWith(7);

    fireEvent.change(screen.getByLabelText('Time range'), {
      target: { value: '30' },
    });

    // Wait for second fetch to settle
    expect(await screen.findByText(/Updated:/)).toBeInTheDocument();
    expect(fetchLlmUsageSummary).toHaveBeenCalledWith(30);
  });
});
