'use client';

import { useEffect, useState } from 'react';
import { Card } from '@greenenergy/ui';
import Link from 'next/link';
import { JobRiskSnapshotDTO } from '@greenenergy/shared-types';

export default function RiskOverviewPage() {
  const [risks, setRisks] = useState<JobRiskSnapshotDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRisks();
  }, []);

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/risk/jobs');
      if (!response.ok) {
        throw new Error(`Failed to fetch risks: ${response.statusText}`);
      }
      const data = await response.json();
      setRisks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return (
          <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
            LOW
          </span>
        );
      default:
        return <span className="text-gray-500">-</span>;
    }
  };

  const getTopIssues = (reasons: JobRiskSnapshotDTO['reasons']) => {
    if (reasons.length === 0) {
      return 'No issues';
    }
    // Show up to 2 top issues
    return reasons
      .slice(0, 2)
      .map((r) => r.label)
      .join(', ');
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Risk Dashboard</h2>
        <button
          onClick={fetchRisks}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <Card>
        <Card.Content>
          {loading && <div className="py-8 text-center text-gray-500">Loading risk data...</div>}

          {error && <div className="rounded bg-red-50 p-4 text-red-700">Error: {error}</div>}

          {!loading && !error && risks.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              No jobs currently flagged for risk. Run risk evaluation to populate this table.
            </div>
          )}

          {!loading && !error && risks.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Job #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Top Issues
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Risk Computed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {risks.map((risk) => (
                    <tr key={risk.jobId} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {risk.jobNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {risk.customerName || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {risk.currentStatus || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {getRiskBadge(risk.riskLevel)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {getTopIssues(risk.reasons)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {risk.lastUpdatedAt ? new Date(risk.lastUpdatedAt).toLocaleString() : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {new Date(risk.riskComputedAt).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex space-x-2">
                          <Link
                            href={`/risk/${risk.jobId}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Risk
                          </Link>
                          <span className="text-gray-300">|</span>
                          <Link
                            href={`/qc/${risk.jobId}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            QC Panel
                          </Link>
                          {risk.jobNimbusUrl && (
                            <>
                              <span className="text-gray-300">|</span>
                              <a
                                href={risk.jobNimbusUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900"
                              >
                                JobNimbus
                              </a>
                            </>
                          )}
                        </div>
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
