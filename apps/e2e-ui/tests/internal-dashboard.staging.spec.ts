import { expect, test } from '@playwright/test';

function attachConsoleErrorTracker(page: any) {
  const errors: string[] = [];

  page.on('console', (msg: any) => {
    if (msg.type() !== 'error') return;
    errors.push(`[console.error] ${msg.text()}`);
  });

  page.on('pageerror', (err: Error) => {
    errors.push(`[pageerror] ${err.message}`);
  });

  return errors;
}

function attachApiFailureTracker(page: any, origin: string) {
  const failures: string[] = [];

  page.on('response', (res: any) => {
    const url: string = res.url();
    if (!url.startsWith(`${origin}/api/v1/`)) return;

    const status: number = res.status();
    if (status >= 400) {
      failures.push(`${status} ${url}`);
    }
  });

  page.on('requestfailed', (req: any) => {
    const url: string = req.url();
    if (!url.startsWith(`${origin}/api/v1/`)) return;

    failures.push(`REQUEST_FAILED ${url} (${req.failure()?.errorText ?? 'unknown'})`);
  });

  return failures;
}

test('Command Center loads (no console errors, no /api/v1 failures)', async ({ page }, testInfo) => {
  const baseURL = String(testInfo.project.use.baseURL);
  const origin = new URL(baseURL).origin;

  const consoleErrors = attachConsoleErrorTracker(page);
  const apiFailures = attachApiFailureTracker(page, origin);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Command Center' })).toBeVisible();

  await page.waitForResponse(
    (res) =>
      res.url().startsWith(`${origin}/api/v1/command-center/overview`) && res.status() < 400,
    { timeout: 30_000 }
  );

  // Let any late console/network events settle.
  await page.waitForTimeout(500);

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  expect(apiFailures, apiFailures.join('\n')).toEqual([]);
});

test('Workflows loads rules (no console errors, no /api/v1 failures)', async ({ page }, testInfo) => {
  const baseURL = String(testInfo.project.use.baseURL);
  const origin = new URL(baseURL).origin;

  const consoleErrors = attachConsoleErrorTracker(page);
  const apiFailures = attachApiFailureTracker(page, origin);

  await page.goto('/workflows');
  await expect(page.getByRole('heading', { name: 'Workflows' })).toBeVisible();

  await page.waitForResponse(
    (res) => res.url().startsWith(`${origin}/api/v1/workflows/rules`) && res.status() < 400,
    { timeout: 30_000 }
  );

  await page.waitForTimeout(500);

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  expect(apiFailures, apiFailures.join('\n')).toEqual([]);
});

test('LLM Usage loads summary+recent (no console errors, no /api/v1 failures)', async ({ page }, testInfo) => {
  const baseURL = String(testInfo.project.use.baseURL);
  const origin = new URL(baseURL).origin;

  const consoleErrors = attachConsoleErrorTracker(page);
  const apiFailures = attachApiFailureTracker(page, origin);

  // Set up response waiters BEFORE navigation to avoid missing fast responses.
  const summaryWait = page.waitForResponse(
    (res) => res.url().includes(`${origin}/api/v1/llm-usage/summary`) && res.status() < 400,
    { timeout: 30_000 }
  );
  const recentWait = page.waitForResponse(
    (res) => res.url().includes(`${origin}/api/v1/llm-usage/recent`) && res.status() < 400,
    { timeout: 30_000 }
  );

  await page.goto('/llm-usage');
  await expect(page.getByRole('heading', { name: 'LLM Usage Monitoring' })).toBeVisible();

  await Promise.all([summaryWait, recentWait]);

  await page.waitForTimeout(500);

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  expect(apiFailures, apiFailures.join('\n')).toEqual([]);
});

test('Safety is Coming Soon and makes no /api/v1 calls', async ({ page }, testInfo) => {
  const baseURL = String(testInfo.project.use.baseURL);
  const origin = new URL(baseURL).origin;

  const consoleErrors = attachConsoleErrorTracker(page);
  const apiFailures = attachApiFailureTracker(page, origin);

  await page.goto('/safety');
  await expect(page.getByRole('heading', { name: 'Safety & Incidents' })).toBeVisible();
  await expect(page.getByText('Coming soon')).toBeVisible();

  // Coming soon pages should not call /api/v1 at all.
  expect(apiFailures, apiFailures.join('\n')).toEqual([]);
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
});
