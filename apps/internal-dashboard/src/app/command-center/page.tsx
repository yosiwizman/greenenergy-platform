import { Card } from '@greenenergy/ui';
import Link from 'next/link';
import type { CommandCenterOverviewDTO } from '@greenenergy/shared-types';

async function getCommandCenterData(): Promise<CommandCenterOverviewDTO> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY!;

  const res = await fetch(`${baseUrl}/command-center/overview`, {
    headers: {
      'x-internal-api-key': apiKey,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch command center data');
  }

  return res.json();
}

export default async function CommandCenterPage() {
  let data: CommandCenterOverviewDTO;

  try {
    data = await getCommandCenterData();
  } catch (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-700">
        <p className="font-semibold">Unable to load Command Center data.</p>
        <p className="text-sm mt-1">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
      </div>
    );
  }

  const { summary, roleViews, jobsNeedingAttention } = data;

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(1)}%`;
  };

  const getRiskBadge = (level: string | null | undefined) => {
    if (!level) return <span className="text-gray-400">-</span>;
    const colors: Record<string, string> = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-amber-100 text-amber-800',
      HIGH: 'bg-red-100 text-red-800',
    };
    return (
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[level] || 'bg-gray-100 text-gray-800'}`}
      >
        {level}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Command Center</h2>
        <p className="text-sm text-gray-600">
          Real-time operational overview across jobs, safety, finance, and automations.
        </p>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="p-4">
            <div className="text-sm font-medium text-gray-500">Jobs In Progress</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {summary.jobsInProgress}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm font-medium text-gray-500">High-Risk Jobs</div>
            <div className="mt-2 text-3xl font-bold text-red-600">
              {summary.jobsHighRisk}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm font-medium text-gray-500">Open Safety Incidents</div>
            <div className="mt-2 text-3xl font-bold text-amber-600">
              {summary.openSafetyIncidents}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Low-Margin High-Risk Jobs
            </div>
            <div className="mt-2 text-3xl font-bold text-red-600">
              {summary.lowMarginHighRiskJobs}
            </div>
          </div>
        </Card>
      </div>

      {/* Executive View */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Executive View</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-500">Total Jobs</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {roleViews.executive.totalJobs}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-500">Jobs In Progress</div>
              <div className="mt-2 text-2xl font-bold text-blue-600">
                {roleViews.executive.jobsInProgress}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-500">High-Risk Jobs</div>
              <div className="mt-2 text-2xl font-bold text-red-600">
                {roleViews.executive.jobsHighRisk}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-500">Avg Margin %</div>
              <div className="mt-2 text-2xl font-bold text-green-600">
                {formatPercent(roleViews.executive.avgMarginPercent)}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Production View */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Production View</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-500">Jobs with QC Issues</div>
              <div className="mt-2 text-2xl font-bold text-amber-600">
                {roleViews.production.jobsWithQcIssues}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-500">
                Delayed Materials
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-600">
                {roleViews.production.jobsWithDelayedMaterials}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-500">
                Scheduling Risk
              </div>
              <div className="mt-2 text-2xl font-bold text-red-600">
                {roleViews.production.jobsWithSchedulingRisk}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Safety View */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Safety View</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-500">Open Incidents</div>
              <div className="mt-2 text-2xl font-bold text-amber-600">
                {roleViews.safety.openIncidents}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-500">
                High Severity Incidents
              </div>
              <div className="mt-2 text-2xl font-bold text-red-600">
                {roleViews.safety.highSeverityIncidents}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-500">
                Incidents (Last 30 Days)
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-600">
                {roleViews.safety.incidentsLast30Days}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Finance View */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Finance View</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-500">Low-Margin Jobs</div>
              <div className="mt-2 text-2xl font-bold text-amber-600">
                {roleViews.finance.lowMarginJobs}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-500">
                Low-Margin + High-Risk
              </div>
              <div className="mt-2 text-2xl font-bold text-red-600">
                {roleViews.finance.lowMarginHighRiskJobs}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-500">
                Total Contract Amount
              </div>
              <div className="mt-2 text-2xl font-bold text-green-600">
                {formatCurrency(roleViews.finance.totalContractAmount)}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Workflow Activity */}
      <Card>
        <div className="p-4">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Workflow Activity (Last 24h)
          </h3>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-blue-600">
              {summary.workflowActionsLast24h}
            </div>
            <Link
              href="/workflows"
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              View Details →
            </Link>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Actions fired by automation rules
          </p>
        </div>
      </Card>

      {/* Jobs Needing Attention */}
      <Card>
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Jobs Needing Attention
          </h3>
        </div>

        <div className="overflow-x-auto">
          {jobsNeedingAttention.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p className="text-sm">No jobs need immediate attention right now.</p>
              <p className="mt-1 text-xs text-gray-400">
                All systems operating normally.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Job ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Risk
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Issues
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {jobsNeedingAttention.map((job) => (
                  <tr key={job.jobId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/risk/${job.jobId}`}
                        className="font-mono text-primary-600 hover:underline"
                      >
                        {job.jobId.substring(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {job.customerName || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {job.status || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">{getRiskBadge(job.riskLevel)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {job.hasQcFail && (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                            QC
                          </span>
                        )}
                        {job.hasOpenSafetyIncident && (
                          <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                            Safety
                          </span>
                        )}
                        {job.hasDelayedMaterials && (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                            Materials
                          </span>
                        )}
                        {job.hasExpiringWarranty && (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                            Warranty
                          </span>
                        )}
                        {job.isLowMarginHighRisk && (
                          <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                            Finance
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {job.lastUpdatedAt
                        ? new Date(job.lastUpdatedAt).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Additional Summary Info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Subcontractor Status
            </div>
            <div className="mt-2 flex items-center gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{summary.subsGreen}</div>
                <div className="text-xs text-gray-500">Green</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-amber-600">{summary.subsYellow}</div>
                <div className="text-xs text-gray-500">Yellow</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{summary.subsRed}</div>
                <div className="text-xs text-gray-500">Red</div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Warranties Expiring Soon
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600">
              {summary.warrantiesExpiringSoon}
            </div>
            <p className="mt-1 text-xs text-gray-500">Within 30 days</p>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm font-medium text-gray-500">
              Material Orders Delayed
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600">
              {summary.materialOrdersDelayed}
            </div>
            <p className="mt-1 text-xs text-gray-500">Past expected delivery</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
