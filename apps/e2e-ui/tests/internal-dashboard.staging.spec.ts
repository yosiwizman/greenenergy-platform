import {
  expect,
  test,
  type ConsoleMessage,
  type Page,
  type Request,
  type Response,
} from '@playwright/test';

import { waitForApiResponses } from '../utils/waitForApiResponses';

function attachConsoleErrorTracker(page: Page) {
  const errors: string[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    errors.push(`[console.error] ${msg.text()}`);
  });

  page.on('pageerror', (err: Error) => {
    errors.push(`[pageerror] ${err.message}`);
  });

  return errors;
}

function attachApiFailureTracker(page: Page, origin: string) {
  const failures: string[] = [];

  page.on('response', (res: Response) => {
    const url: string = res.url();
    if (!url.startsWith(`${origin}/api/v1/`)) return;

    const status: number = res.status();
    if (status >= 400) {
      failures.push(`${status} ${url}`);
    }
  });

  page.on('requestfailed', (req: Request) => {
    const url: string = req.url();
    if (!url.startsWith(`${origin}/api/v1/`)) return;

    failures.push(`REQUEST_FAILED ${url} (${req.failure()?.errorText ?? 'unknown'})`);
  });

  return failures;
}

test('Command Center loads (no console errors, no /api/v1 failures)', async ({
  page,
}, testInfo) => {
  const baseURL = String(testInfo.project.use.baseURL);
  const origin = new URL(baseURL).origin;

  const consoleErrors = attachConsoleErrorTracker(page);
  const apiFailures = attachApiFailureTracker(page, origin);

  // Register response waiters BEFORE navigation to avoid missing fast responses.
  const overviewWait = waitForApiResponses(
    page,
    [
      {
        urlIncludes: `${origin}/api/v1/command-center/overview`,
        method: 'GET',
      },
    ],
    30_000
  );

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Command Center' })).toBeVisible();

  const [overviewResponse] = await overviewWait;
  expect(overviewResponse.status()).toBeLessThan(400);

  // Let any late console/network events settle.
  await page.waitForTimeout(500);

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  expect(apiFailures, apiFailures.join('\n')).toEqual([]);
});

test('Workflows loads rules (no console errors, no /api/v1 failures)', async ({
  page,
}, testInfo) => {
  const baseURL = String(testInfo.project.use.baseURL);
  const origin = new URL(baseURL).origin;

  const consoleErrors = attachConsoleErrorTracker(page);
  const apiFailures = attachApiFailureTracker(page, origin);

  const rulesWait = waitForApiResponses(
    page,
    [
      {
        urlIncludes: `${origin}/api/v1/workflows/rules`,
        method: 'GET',
      },
    ],
    30_000
  );

  await page.goto('/workflows', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Workflows' })).toBeVisible();

  const [rulesResponse] = await rulesWait;
  expect(rulesResponse.status()).toBeLessThan(400);

  await page.waitForTimeout(500);

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  expect(apiFailures, apiFailures.join('\n')).toEqual([]);
});

test('LLM Usage loads summary+recent (no console errors, no /api/v1 failures)', async ({
  page,
}, testInfo) => {
  const baseURL = String(testInfo.project.use.baseURL);
  const origin = new URL(baseURL).origin;

  const consoleErrors = attachConsoleErrorTracker(page);
  const apiFailures = attachApiFailureTracker(page, origin);

  const llmUsageWait = waitForApiResponses(
    page,
    [
      {
        urlIncludes: `${origin}/api/v1/llm-usage/summary`,
        method: 'GET',
      },
      {
        urlIncludes: `${origin}/api/v1/llm-usage/recent`,
        method: 'GET',
      },
    ],
    30_000
  );

  await page.goto('/llm-usage', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'LLM Usage Monitoring' })).toBeVisible();

  const [summaryResponse, recentResponse] = await llmUsageWait;
  expect(summaryResponse.status()).toBeLessThan(400);
  expect(recentResponse.status()).toBeLessThan(400);

  await page.waitForTimeout(500);

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  expect(apiFailures, apiFailures.join('\n')).toEqual([]);
});

test('Safety is Coming Soon and makes no /api/v1 calls', async ({ page }, testInfo) => {
  const baseURL = String(testInfo.project.use.baseURL);
  const origin = new URL(baseURL).origin;

  const consoleErrors = attachConsoleErrorTracker(page);
  const apiFailures = attachApiFailureTracker(page, origin);

  await page.goto('/safety', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Safety & Incidents' })).toBeVisible();
  await expect(page.getByText('Coming soon')).toBeVisible();

  // Give any late events a chance to surface.
  await page.waitForTimeout(500);

  // Coming soon pages should not call /api/v1 at all.
  expect(apiFailures, apiFailures.join('\\n')).toEqual([]);
  expect(consoleErrors, consoleErrors.join('\\n')).toEqual([]);
});
