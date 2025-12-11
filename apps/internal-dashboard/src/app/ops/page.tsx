import { Card } from '@greenenergy/ui';
import type { OpsStatusDTO, ExternalServiceHealthDTO } from '@greenenergy/shared-types';

async function getOpsStatus(): Promise<OpsStatusDTO> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY!;

  const res = await fetch(`${baseUrl}/ops/status`, {
    headers: {
      'x-internal-api-key': apiKey,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch ops status');
  }

  return res.json();
}

export default async function OpsStatusPage() {
  let data: OpsStatusDTO;

  try {
    data = await getOpsStatus();
  } catch (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-700">
        <p className="font-semibold">Unable to load Ops Status data.</p>
        <p className="text-sm mt-1">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
      </div>
    );
  }

  const { coreApiHealthy, databaseHealthy, externalServices, latestCronRuns } = data;

  // Determine overall system status
  const allServicesHealthy = 
    coreApiHealthy &&
    databaseHealthy &&
    externalServices.every((s) => s.status === 'UP');

  const hasIssues = 
    !coreApiHealthy ||
    !databaseHealthy ||
    externalServices.some((s) => s.status === 'DOWN' || s.status === 'DEGRADED');

  const getStatusBadge = (status: 'UP' | 'DOWN' | 'DEGRADED') => {
    const colors: Record<string, string> = {
      UP: 'bg-green-100 text-green-800',
      DOWN: 'bg-red-100 text-red-800',
      DEGRADED: 'bg-amber-100 text-amber-800',
    };
    return (
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[status]}`}
      >
        {status}
      </span>
    );
  };

  const formatRelativeTime = (isoTimestamp: string | null) => {
    if (!isoTimestamp) return 'Never';
    
    const now = new Date();
    const past = new Date(isoTimestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Operations Status</h2>
        <p className="text-sm text-gray-600">
          Platform health and monitoring for production systems.
        </p>
      </div>

      {/* Overall Status Banner */}
      <Card>
        <div className="p-6">
          {allServicesHealthy ? (
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-green-900">
                  All Systems Operational
                </h3>
                <p className="text-sm text-gray-600">
                  All services are running normally.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-amber-900">
                  Issues Detected
                </h3>
                <p className="text-sm text-gray-600">
                  One or more services are experiencing issues.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Core Status */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Core Platform</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-500">Core API</div>
                {getStatusBadge(coreApiHealthy ? 'UP' : 'DOWN')}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {coreApiHealthy ? 'Responding normally' : 'Not responding'}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-500">Database</div>
                {getStatusBadge(databaseHealthy ? 'UP' : 'DOWN')}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {databaseHealthy ? 'Connected' : 'Connection failed'}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* External Services */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">External Services</h3>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Last Checked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {externalServices.map((service) => (
                <tr key={service.name}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 capitalize">
                    {service.name.replace(/_/g, ' ')}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    {getStatusBadge(service.status)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatRelativeTime(service.lastCheckedAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {service.details || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cron Jobs */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Scheduled Jobs</h3>
        {latestCronRuns.length === 0 ? (
          <Card>
            <div className="p-4 text-center text-sm text-gray-500">
              No cron job data available yet. Jobs will appear here after their first run.
            </div>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Job Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Last Run
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Time (Relative)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {latestCronRuns.map((job) => (
                  <tr key={job.name}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 capitalize">
                      {job.name.replace(/_/g, ' ')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {job.lastRunAt
                        ? new Date(job.lastRunAt).toLocaleString()
                        : 'Never'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatRelativeTime(job.lastRunAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <Card>
        <div className="p-4 text-sm text-gray-600">
          <p>
            <strong>Note:</strong> This dashboard provides a real-time snapshot of platform health.
            For detailed metrics, access the Prometheus metrics endpoint at{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">/api/v1/metrics</code>.
          </p>
        </div>
      </Card>
    </div>
  );
}
