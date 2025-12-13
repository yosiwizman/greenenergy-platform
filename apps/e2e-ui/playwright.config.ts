import { defineConfig, devices } from '@playwright/test';

const INTERNAL_DASHBOARD_URL =
  process.env.STAGING_INTERNAL_DASHBOARD_URL ??
  'https://greenenergy-platform-internal-dashb.vercel.app';

const CUSTOMER_PORTAL_URL =
  process.env.STAGING_CUSTOMER_PORTAL_URL ??
  'https://greenenergy-platform-customer-porta.vercel.app';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'internal-dashboard-staging',
      testMatch: /internal-dashboard\.staging\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: INTERNAL_DASHBOARD_URL,
      },
    },
    {
      name: 'customer-portal-staging',
      testMatch: /customer-portal\.staging\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: CUSTOMER_PORTAL_URL,
      },
    },
  ],
});
