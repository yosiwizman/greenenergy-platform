import type { PortalJobView, ResolvePortalSessionResponse } from '@greenenergy/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';

export class PortalAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'PortalAPIError';
  }
}

/**
 * Resolve a portal session token
 */
export async function resolvePortalSession(token: string): Promise<ResolvePortalSessionResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/portal/session/resolve?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to resolve session' }));
      throw new PortalAPIError(error.message || 'Failed to resolve session', response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof PortalAPIError) {
      throw error;
    }
    throw new PortalAPIError('Network error while resolving session');
  }
}

/**
 * Fetch job view for an authenticated portal session
 */
export async function fetchJobView(jobId: string, token: string): Promise<PortalJobView> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/portal/jobs/${jobId}?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch job view' }));
      throw new PortalAPIError(error.message || 'Failed to fetch job view', response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof PortalAPIError) {
      throw error;
    }
    throw new PortalAPIError('Network error while fetching job view');
  }
}
