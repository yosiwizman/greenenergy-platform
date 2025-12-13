import type { LlmUsageListItemDTO, LlmUsageSummaryDTO } from '@greenenergy/shared-types';

const API_BASE_URL = '/api/v1';

async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text ? `: ${text}` : '';
  } catch {
    return '';
  }
}

export async function fetchLlmUsageSummary(days: number): Promise<LlmUsageSummaryDTO> {
  const res = await fetch(`${API_BASE_URL}/llm-usage/summary?days=${days}`, {
    method: 'GET',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch LLM usage summary (${res.status})${await readErrorBody(res)}`);
  }

  return res.json();
}

export async function fetchLlmUsageRecent(limit: number): Promise<LlmUsageListItemDTO[]> {
  const res = await fetch(`${API_BASE_URL}/llm-usage/recent?limit=${limit}`, {
    method: 'GET',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch LLM usage recent calls (${res.status})${await readErrorBody(res)}`);
  }

  return res.json();
}
