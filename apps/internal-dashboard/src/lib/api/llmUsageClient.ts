import type { LlmUsageListItemDTO, LlmUsageSummaryDTO } from '@greenenergy/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';
const INTERNAL_API_KEY = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (INTERNAL_API_KEY) {
    headers['x-internal-api-key'] = INTERNAL_API_KEY;
  }

  return headers;
}

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
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch LLM usage summary (${res.status})${await readErrorBody(res)}`
    );
  }

  return res.json();
}

export async function fetchLlmUsageRecent(limit: number): Promise<LlmUsageListItemDTO[]> {
  const res = await fetch(`${API_BASE_URL}/llm-usage/recent?limit=${limit}`, {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch LLM usage recent calls (${res.status})${await readErrorBody(res)}`
    );
  }

  return res.json();
}
