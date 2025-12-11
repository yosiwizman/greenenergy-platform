#!/usr/bin/env node

/**
 * Staging Smoke Tests for Green Energy Platform
 * 
 * This script performs high-level health checks on deployed environments
 * to verify that the main surface areas are working correctly.
 * 
 * Usage:
 *   1. Set environment variables:
 *      - STAGING_API_BASE_URL
 *      - STAGING_INTERNAL_DASHBOARD_URL
 *      - STAGING_CUSTOMER_PORTAL_URL
 *      - STAGING_INTERNAL_API_KEY
 *   2. Run: pnpm smoke:staging
 */

interface SmokeCheckResult {
  name: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  details?: string;
}

class SmokeTestRunner {
  private apiBaseUrl: string;
  private internalDashboardUrl: string;
  private customerPortalUrl: string;
  private internalApiKey: string;
  private results: SmokeCheckResult[] = [];

  constructor() {
    // Validate required environment variables
    this.apiBaseUrl = process.env.STAGING_API_BASE_URL || '';
    this.internalDashboardUrl = process.env.STAGING_INTERNAL_DASHBOARD_URL || '';
    this.customerPortalUrl = process.env.STAGING_CUSTOMER_PORTAL_URL || '';
    this.internalApiKey = process.env.STAGING_INTERNAL_API_KEY || '';

    this.validateEnvironment();
  }

  private validateEnvironment(): void {
    const missing: string[] = [];

    if (!this.apiBaseUrl) missing.push('STAGING_API_BASE_URL');
    if (!this.internalDashboardUrl) missing.push('STAGING_INTERNAL_DASHBOARD_URL');
    if (!this.customerPortalUrl) missing.push('STAGING_CUSTOMER_PORTAL_URL');
    if (!this.internalApiKey) missing.push('STAGING_INTERNAL_API_KEY');

    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:');
      missing.forEach(varName => console.error(`   - ${varName}`));
      console.error('\nPlease set these variables in your .env file or environment.');
      console.error('See docs/16-staging-smoke-tests-and-go-live-checklist.md for details.\n');
      process.exit(1);
    }
  }

  async run(): Promise<void> {
    console.log('🚀 Starting staging smoke tests...\n');
    console.log('Target URLs:');
    console.log(`  API: ${this.apiBaseUrl}`);
    console.log(`  Internal Dashboard: ${this.internalDashboardUrl}`);
    console.log(`  Customer Portal: ${this.customerPortalUrl}`);
    console.log('');

    // Run all checks
    await this.checkApiHealth();
    await this.checkCommandCenterOverview();
    await this.checkWorkflowRules();
    await this.checkInternalDashboardCommandCenter();
    await this.checkInternalDashboardWorkflows();
    await this.checkCustomerPortal();

    // Print summary
    this.printSummary();

    // Exit with appropriate code
    const failedCount = this.results.filter(r => !r.success).length;
    process.exitCode = failedCount > 0 ? 1 : 0;
  }

  private async checkApiHealth(): Promise<void> {
    const checkName = 'API Health Check';
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as { status?: string };
        if (data.status === 'ok') {
          this.recordSuccess(checkName, response.status, 'API is healthy');
        } else {
          this.recordFailure(checkName, response.status, `Unexpected status: ${data.status}`);
        }
      } else {
        const text = await response.text();
        this.recordFailure(checkName, response.status, text.substring(0, 200));
      }
    } catch (error) {
      this.recordError(checkName, error);
    }
  }

  private async checkCommandCenterOverview(): Promise<void> {
    const checkName = 'Command Center Overview API';
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/command-center/overview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': this.internalApiKey,
        },
      });

      if (response.ok) {
        const data = await response.json() as { jobs?: unknown; subcontractors?: unknown; materials?: unknown };
        // Validate shape of CommandCenterOverviewDTO
        if (data.jobs !== undefined && data.subcontractors !== undefined && data.materials !== undefined) {
          this.recordSuccess(checkName, response.status, 'Command Center data loaded');
        } else {
          this.recordFailure(checkName, response.status, 'Invalid response shape');
        }
      } else {
        const text = await response.text();
        this.recordFailure(checkName, response.status, text.substring(0, 200));
      }
    } catch (error) {
      this.recordError(checkName, error);
    }
  }

  private async checkWorkflowRules(): Promise<void> {
    const checkName = 'Workflow Rules API';
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/workflows/rules`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': this.internalApiKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          this.recordSuccess(checkName, response.status, `${data.length} workflow rules found`);
        } else {
          this.recordFailure(checkName, response.status, 'Expected array of rules');
        }
      } else {
        const text = await response.text();
        this.recordFailure(checkName, response.status, text.substring(0, 200));
      }
    } catch (error) {
      this.recordError(checkName, error);
    }
  }

  private async checkInternalDashboardCommandCenter(): Promise<void> {
    const checkName = 'Internal Dashboard - Command Center Page';
    try {
      const response = await fetch(`${this.internalDashboardUrl}/command-center`, {
        method: 'GET',
        headers: {
          'User-Agent': 'SmokeTest/1.0',
        },
      });

      if (response.ok) {
        const html = await response.text();
        // Look for distinctive content
        if (html.includes('Command Center') || html.includes('command-center')) {
          this.recordSuccess(checkName, response.status, 'Page loaded successfully');
        } else {
          this.recordFailure(checkName, response.status, 'Expected content not found');
        }
      } else {
        const text = await response.text();
        this.recordFailure(checkName, response.status, text.substring(0, 200));
      }
    } catch (error) {
      this.recordError(checkName, error);
    }
  }

  private async checkInternalDashboardWorkflows(): Promise<void> {
    const checkName = 'Internal Dashboard - Workflows Page';
    try {
      const response = await fetch(`${this.internalDashboardUrl}/workflows`, {
        method: 'GET',
        headers: {
          'User-Agent': 'SmokeTest/1.0',
        },
      });

      if (response.ok) {
        const html = await response.text();
        // Look for distinctive content
        if (html.includes('Workflow') || html.includes('workflow')) {
          this.recordSuccess(checkName, response.status, 'Page loaded successfully');
        } else {
          this.recordFailure(checkName, response.status, 'Expected content not found');
        }
      } else {
        const text = await response.text();
        this.recordFailure(checkName, response.status, text.substring(0, 200));
      }
    } catch (error) {
      this.recordError(checkName, error);
    }
  }

  private async checkCustomerPortal(): Promise<void> {
    const checkName = 'Customer Portal - Root Page';
    try {
      const response = await fetch(this.customerPortalUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'SmokeTest/1.0',
        },
      });

      if (response.ok) {
        const html = await response.text();
        // Look for distinctive content (portal branding or job status UI)
        if (html.includes('Green Energy') || html.includes('Status') || html.includes('Job')) {
          this.recordSuccess(checkName, response.status, 'Portal loaded successfully');
        } else {
          this.recordFailure(checkName, response.status, 'Expected content not found');
        }
      } else {
        const text = await response.text();
        this.recordFailure(checkName, response.status, text.substring(0, 200));
      }
    } catch (error) {
      this.recordError(checkName, error);
    }
  }

  private recordSuccess(name: string, statusCode: number, details: string): void {
    this.results.push({
      name,
      success: true,
      statusCode,
      details,
    });
    console.log(`✅ ${name}: OK (${statusCode}) - ${details}`);
  }

  private recordFailure(name: string, statusCode: number, error: string): void {
    this.results.push({
      name,
      success: false,
      statusCode,
      error,
    });
    console.log(`❌ ${name}: FAILED (${statusCode})`);
    console.log(`   ${error}`);
  }

  private recordError(name: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.results.push({
      name,
      success: false,
      error: errorMessage,
    });
    console.log(`❌ ${name}: ERROR`);
    console.log(`   ${errorMessage}`);
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));

    const totalChecks = this.results.length;
    const passedChecks = this.results.filter(r => r.success).length;
    const failedChecks = totalChecks - passedChecks;

    console.log(`\nTotal checks: ${totalChecks}`);
    console.log(`Passed: ${passedChecks}`);
    console.log(`Failed: ${failedChecks}`);

    if (failedChecks > 0) {
      console.log('\n⚠️  Failed checks:');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.name}`);
          if (r.error) {
            console.log(`     ${r.error}`);
          }
        });
      console.log('\n❌ Smoke tests FAILED. Please check the errors above.');
      console.log('See docs/16-staging-smoke-tests-and-go-live-checklist.md for troubleshooting.\n');
    } else {
      console.log('\n✅ All smoke tests PASSED!');
      console.log('Your staging environment appears to be working correctly.');
      console.log('Proceed with manual UI verification as documented.\n');
    }
  }
}

// Run the tests
const runner = new SmokeTestRunner();
runner.run().catch(error => {
  console.error('Unexpected error running smoke tests:', error);
  process.exit(1);
});
