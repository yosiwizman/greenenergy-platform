import type {
  AiOpsLlmCustomerMessageDTO,
  AiOpsLlmCustomerMessageInputDTO,
  AiOpsLlmJobSummaryDTO,
} from '@greenenergy/shared-types';

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

export async function fetchLlmJobSummary(jobId: string): Promise<AiOpsLlmJobSummaryDTO> {
  const res = await fetch(
    `${API_BASE_URL}/ai-ops/jobs/${encodeURIComponent(jobId)}/summary/llm`,
    {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({}),
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch AI summary (${res.status})${await readErrorBody(res)}`
    );
  }

  return res.json();
}

export type GenerateLlmCustomerMessageInput = Omit<
  AiOpsLlmCustomerMessageInputDTO,
  'jobId'
> & {
  // UI-only helper: if provided, we append this to the context string for LLM prompting.
  extraContext?: string;
  // UI-only: not sent as a dedicated field; used to influence the prompt via context string.
  channel?: 'EMAIL' | 'SMS';
};

export async function generateLlmCustomerMessage(
  jobId: string,
  input: GenerateLlmCustomerMessageInput
): Promise<AiOpsLlmCustomerMessageDTO> {
  const context = input.context ?? 'general_update';

  const contextParts: string[] = [context];
  if (input.channel) {
    contextParts.push(`channel=${input.channel}`);
  }
  if (input.extraContext?.trim()) {
    contextParts.push(`notes=${input.extraContext.trim()}`);
  }

  const contextForApi = contextParts.join(' | ');

  const res = await fetch(
    `${API_BASE_URL}/ai-ops/jobs/${encodeURIComponent(jobId)}/customer-message/llm`,
    {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        tone: input.tone,
        context: contextForApi,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to generate AI customer message (${res.status})${await readErrorBody(res)}`
    );
  }

  return res.json();
}
