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

function attachSameOriginBadResponseTracker(page: any, origin: string) {
  const failures: string[] = [];

  page.on('response', (res: any) => {
    const url: string = res.url();
    if (!url.startsWith(origin)) return;

    const status: number = res.status();
    if (status === 404 || status >= 500) {
      failures.push(`${status} ${url}`);
    }
  });

  page.on('requestfailed', (req: any) => {
    const url: string = req.url();
    if (!url.startsWith(origin)) return;

    failures.push(`REQUEST_FAILED ${url} (${req.failure()?.errorText ?? 'unknown'})`);
  });

  return failures;
}

test('Customer portal home loads (no console errors, no same-origin 404/5xx)', async ({ page }, testInfo) => {
  const baseURL = String(testInfo.project.use.baseURL);
  const origin = new URL(baseURL).origin;

  const consoleErrors = attachConsoleErrorTracker(page);
  const badResponses = attachSameOriginBadResponseTracker(page, origin);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to Your Project Portal' })).toBeVisible();

  // Let favicon + any late requests settle.
  await page.waitForTimeout(750);

  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  expect(badResponses, badResponses.join('\n')).toEqual([]);
});
