import { fireEvent, render, screen } from '@testing-library/react';
import AiOpsPage from '../page';

import {
  fetchLlmJobSummary,
  generateLlmCustomerMessage,
} from '../../../lib/api/aiOpsLlmClient';

jest.mock('../../../lib/api/aiOpsLlmClient', () => ({
  __esModule: true,
  fetchLlmJobSummary: jest.fn(),
  generateLlmCustomerMessage: jest.fn(),
}));

function mockOkJson(data: unknown) {
  (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}

const INSIGHTS_RESPONSE = {
  summary: {
    jobId: 'job-1',
    jobNumber: null,
    customerName: 'Test Customer',
    status: 'IN_PROGRESS',
    overallSummary: 'Overall summary',
    sections: [{ title: 'Status & Progress', body: 'Status section' }],
  },
  recommendations: [],
};

describe('AiOpsPage - LLM panels', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
    jest.clearAllMocks();
  });

  it('renders AI panels when a job is selected (insights loaded)', async () => {
    mockOkJson(INSIGHTS_RESPONSE);

    render(<AiOpsPage />);

    fireEvent.change(screen.getByPlaceholderText('Enter job ID...'), {
      target: { value: 'job-1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /load insights/i }));

    expect(await screen.findByText('AI Summary')).toBeInTheDocument();
    expect(screen.getByText('AI Customer Message Draft')).toBeInTheDocument();
  });

  it('generates AI summary and renders result', async () => {
    mockOkJson(INSIGHTS_RESPONSE);

    (fetchLlmJobSummary as unknown as jest.Mock).mockResolvedValueOnce({
      jobId: 'job-1',
      summary: 'LLM summary text',
      model: 'gpt-4o-mini',
      isFallback: false,
    });

    render(<AiOpsPage />);

    fireEvent.change(screen.getByPlaceholderText('Enter job ID...'), {
      target: { value: 'job-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /load insights/i }));

    await screen.findByText('AI Summary');

    fireEvent.click(screen.getByRole('button', { name: /generate ai summary/i }));

    expect(fetchLlmJobSummary).toHaveBeenCalledWith('job-1');
    expect(await screen.findByText('LLM summary text')).toBeInTheDocument();
  });

  it('generates AI customer message draft and renders result', async () => {
    mockOkJson(INSIGHTS_RESPONSE);

    (generateLlmCustomerMessage as unknown as jest.Mock).mockResolvedValueOnce({
      jobId: 'job-1',
      tone: 'friendly',
      message: 'Hello customer',
      model: 'gpt-4o-mini',
      isFallback: false,
    });

    render(<AiOpsPage />);

    fireEvent.change(screen.getByPlaceholderText('Enter job ID...'), {
      target: { value: 'job-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /load insights/i }));

    await screen.findByText('AI Customer Message Draft');

    fireEvent.click(screen.getByRole('button', { name: /generate ai message draft/i }));

    expect(generateLlmCustomerMessage).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        tone: 'friendly',
        context: 'general_update',
        channel: 'EMAIL',
        extraContext: '',
      })
    );

    expect(await screen.findByDisplayValue('Hello customer')).toBeInTheDocument();
  });

  it('shows fallback indicator when isFallback=true', async () => {
    mockOkJson(INSIGHTS_RESPONSE);

    (fetchLlmJobSummary as unknown as jest.Mock).mockResolvedValueOnce({
      jobId: 'job-1',
      summary: 'Fallback summary',
      model: 'deterministic-fallback',
      isFallback: true,
    });

    render(<AiOpsPage />);

    fireEvent.change(screen.getByPlaceholderText('Enter job ID...'), {
      target: { value: 'job-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /load insights/i }));

    await screen.findByText('AI Summary');

    fireEvent.click(screen.getByRole('button', { name: /generate ai summary/i }));

    expect(
      await screen.findByText('Fallback summary (LLM disabled/unavailable)')
    ).toBeInTheDocument();
  });
});
