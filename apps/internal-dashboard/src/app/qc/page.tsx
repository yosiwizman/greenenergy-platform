'use client';

import { useEffect, useState } from 'react';
import { Card } from '@greenenergy/ui';
import Link from 'next/link';
import { JobQCOverview } from '@greenenergy/shared-types';

export default function QCOverviewPage() {
  const [qcData, setQcData] = useState<JobQCOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQCOverview();
  }, []);

  const fetchQCOverview = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/qc/jobs');
      if (!response.ok) {
        throw new Error(`Failed to fetch QC overview: ${response.statusText}`);
      }
      const data = await response.json();
      setQcData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
            PASS
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
            FAIL
          </span>
        );
      case 'NOT_CHECKED':
        return (
          <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
            NOT CHECKED
          </span>
        );
      default:
        return <span className="text-gray-500">-</span>;
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">QC Overview</h2>
        <button
          onClick={fetchQCOverview}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <Card>
        <Card.Content>
          {loading && <div className="py-8 text-center text-gray-500">Loading QC data...</div>}

          {error && <div className="rounded bg-red-50 p-4 text-red-700">Error: {error}</div>}

          {!loading && !error && qcData.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              No QC data available. Run QC evaluation to populate this table.
            </div>
          )}

          {!loading && !error && qcData.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Job ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Job Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      QC Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Total Photos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Before / During / After
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Last Checked
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {qcData.map((job) => (
                    <tr key={job.jobId} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {job.jobId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{job.jobName || '-'}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {getStatusBadge(job.qcStatus)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {job.totalPhotos || 0}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {job.beforeCount || 0} / {job.duringCount || 0} / {job.afterCount || 0}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {job.lastCheckedAt ? new Date(job.lastCheckedAt).toLocaleString() : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <Link
                          href={`/qc/${job.jobId}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
