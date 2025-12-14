import type { Page, Response } from '@playwright/test';

export type ApiResponseDescriptor = {
  /** Substring that must be present in the response URL. */
  urlIncludes: string;
  /** HTTP method of the originating request (e.g. GET, POST). */
  method?: string;
  /**
   * Expected response status.
   * - If omitted, defaults to "successful" (< 400).
   * - If a number, requires an exact match.
   */
  status?: number;
};

export type ApiResponseMatcher = ((res: Response) => boolean) | ApiResponseDescriptor;

function isDescriptor(matcher: ApiResponseMatcher): matcher is ApiResponseDescriptor {
  return typeof matcher === 'object' && matcher !== null;
}

function descriptorToPredicate(descriptor: ApiResponseDescriptor) {
  const expectedMethod = descriptor.method?.toUpperCase();
  const expectedStatus = descriptor.status;

  return (res: Response) => {
    if (!res.url().includes(descriptor.urlIncludes)) return false;

    if (expectedMethod) {
      const actualMethod = res.request().method().toUpperCase();
      if (actualMethod !== expectedMethod) return false;
    }

    const status = res.status();

    if (typeof expectedStatus === 'number') {
      return status === expectedStatus;
    }

    // Default to "successful" response.
    return status < 400;
  };
}

/**
 * Waits for multiple API responses, safely.
 *
 * Anti-flake pattern: create ALL `waitForResponse` listeners BEFORE the action
 * that triggers the requests (e.g. `page.goto()`, `click()`).
 */
export function waitForApiResponses(
  page: Page,
  matchers: ApiResponseMatcher[],
  timeoutMs?: number
): Promise<Response[]> {
  if (matchers.length === 0) return Promise.resolve([]);

  const waiters = matchers.map((matcher) => {
    const predicate = isDescriptor(matcher) ? descriptorToPredicate(matcher) : matcher;

    return page.waitForResponse(predicate, timeoutMs ? { timeout: timeoutMs } : undefined);
  });

  // Register all listeners synchronously before awaiting anything.
  return Promise.all(waiters);
}
