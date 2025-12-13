import { Card } from '@greenenergy/ui';
import Link from 'next/link';
import type { DispatchOverviewDTO } from '@greenenergy/shared-types';
import { DispatchAssignButton } from './DispatchAssignButton';

async function getDispatchData(date?: string): Promise<DispatchOverviewDTO> {
  const baseUrl = process.env.CORE_API_BASE_URL!;
  const apiKey = process.env.INTERNAL_API_KEY!;

  const url = date
    ? `${baseUrl}/api/v1/dispatch/overview?date=${date}`
    : `${baseUrl}/api/v1/dispatch/overview`;

  const res = await fetch(url, {
    headers: {
      'x-internal-api-key': apiKey,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch dispatch data');
  }

  return res.json();
}

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function DispatchPage(props: PageProps) {
  const searchParams = await props.searchParams;
  let data: DispatchOverviewDTO;
  const selectedDate = (searchParams.date ?? new Date().toISOString().split('T')[0]) as string;

  try {
    data = await getDispatchData(selectedDate);
  } catch (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-700">
        <p className="font-semibold">Unable to load dispatch data.</p>
        <p className="text-sm mt-1">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
      </div>
    );
  }

  const { jobsTotal, jobsDispatchable, jobsBlocked, recommendations } = data;

  const getConfidenceBadge = (confidence: 'LOW' | 'MEDIUM' | 'HIGH') => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-amber-100 text-amber-800',
      HIGH: 'bg-green-100 text-green-800',
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[confidence]}`}>
        {confidence}
      </span>
    );
  };

  const getRiskBadge = (level: string | null | undefined) => {
    if (!level) return <span className="text-gray-400">-</span>;
    const colors: Record<string, string> = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-amber-100 text-amber-800',
      HIGH: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[level] || 'bg-gray-100 text-gray-800'}`}>
        {level}
      </span>
    );
  };

  const getPerformanceBadge = (status?: 'GREEN' | 'YELLOW' | 'RED') => {
    if (!status) return <span className="text-gray-400">-</span>;
    const colors = {
      GREEN: 'bg-green-100 text-green-800',
      YELLOW: 'bg-amber-100 text-amber-800',
      RED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[status]}`}>
        {status}
      </span>
    );
  };

  const getMaterialsBadge = (status?: 'ON_TRACK' | 'AT_RISK' | 'LATE' | 'UNKNOWN') => {
    if (!status || status === 'UNKNOWN') return <span className="text-gray-400">-</span>;
    const colors = {
      ON_TRACK: 'bg-green-100 text-green-800',
      AT_RISK: 'bg-amber-100 text-amber-800',
      LATE: 'bg-red-100 text-red-800',
    };
    const labels = {
      ON_TRACK: 'On Track',
      AT_RISK: 'At Risk',
      LATE: 'Late',
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">AI Dispatching</h2>
        <p className="text-sm text-gray-600">
          Daily crew assignment recommendations based on performance, capacity, and risk.
        </p>
      </div>

      {/* Date Picker */}
      <Card>
        <div className="p-4">
          <form method="get" action="/dispatch" className="flex items-center gap-4">
            <label htmlFor="date" className="text-sm font-medium text-gray-700">
              Target Date:
            </label>
            <input
              type="date"
              id="date"
              name="date"
              defaultValue={selectedDate}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Load Date
            </button>
          </form>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="p-4">
            <div className="text-sm font-medium text-gray-500">Total Jobs</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{jobsTotal}</div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm font-medium text-gray-500">Dispatchable</div>
            <div className="mt-2 text-3xl font-bold text-green-600">{jobsDispatchable}</div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="text-sm font-medium text-gray-500">Blocked</div>
            <div className="mt-2 text-3xl font-bold text-red-600">{jobsBlocked}</div>
          </div>
        </Card>
      </div>

      {/* Recommendations Table */}
      <Card>
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">Crew Recommendations</h3>
        </div>

        <div className="overflow-x-auto">
          {recommendations.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p className="text-sm">No dispatch recommendations for this date.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Job
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Recommended Crew
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Confidence
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Flags
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Can Start
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {recommendations.map((rec) => (
                  <tr key={rec.job.jobId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/risk/${rec.job.jobId}`}
                        className="font-mono text-primary-600 hover:underline"
                      >
                        {rec.job.jobNumber || rec.job.jobId.substring(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {rec.job.customerName || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rec.job.status || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {rec.recommendedSubcontractor ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-gray-900">
                            {rec.recommendedSubcontractor.subcontractorName}
                          </span>
                          {getPerformanceBadge(rec.recommendedSubcontractor.performanceStatus)}
                        </div>
                      ) : (
                        <span className="text-gray-400">None Available</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {rec.recommendedSubcontractor
                        ? getConfidenceBadge(rec.recommendedSubcontractor.confidence)
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {getRiskBadge(rec.job.riskLevel)}
                        {getMaterialsBadge(rec.job.materialsEtaStatus)}
                        {rec.job.hasSafetyIssues && (
                          <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                            Safety
                          </span>
                        )}
                        {rec.job.hasQcIssues && (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                            QC
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {rec.canStart ? (
                        <span className="inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                      ) : (
                        <span className="inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {rec.canStart && rec.recommendedSubcontractor ? (
                        <DispatchAssignButton
                          jobId={rec.job.jobId}
                          subcontractorId={rec.recommendedSubcontractor.subcontractorId}
                          scheduledDate={selectedDate}
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Blocked Jobs Info */}
      {jobsBlocked > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="text-md font-semibold text-gray-900 mb-2">Blocked Jobs ({jobsBlocked})</h3>
            <p className="text-sm text-gray-600">
              Jobs marked with a red dot cannot start due to blocking conditions such as late materials,
              open high-severity safety incidents, or no available compliant crews.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
