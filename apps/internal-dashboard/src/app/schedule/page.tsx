'use client';

import { useEffect, useState } from 'react';
import { Card } from '@greenenergy/ui';
import Link from 'next/link';
import type {
  SchedulingRiskDTO,
  SchedulingRiskLevel,
  MaterialEtaStatus,
} from '@greenenergy/shared-types';

export default function SchedulingPage() {
  const [jobs, setJobs] = useState<SchedulingRiskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await fetch('/api/v1/scheduling/overview');

      if (!res.ok) {
        throw new Error('Failed to fetch scheduling data');
      }

      const data = await res.json();
      setJobs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getSchedulingRiskBadge = (level: SchedulingRiskLevel) => {
    switch (level) {
      case 'LOW':
        return (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
            LOW
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
            MEDIUM
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
            HIGH
          </span>
        );
      default:
        return <span className="text-gray-500">-</span>;
    }
  };

  const getMaterialEtaBadge = (etaStatus: MaterialEtaStatus) => {
    switch (etaStatus) {
      case 'ON_TRACK':
        return (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
            ON TRACK
          </span>
        );
      case 'AT_RISK':
        return (
          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
            AT RISK
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
            LATE
          </span>
        );
      default:
        return <span className="text-gray-500">-</span>;
    }
  };

  const getSubcontractorStatusBadge = (status: 'GREEN' | 'YELLOW' | 'RED' | null) => {
    if (!status) return <span className="text-gray-500">-</span>;
    
    switch (status) {
      case 'GREEN':
        return (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
            GREEN
          </span>
        );
      case 'YELLOW':
        return (
          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
            YELLOW
          </span>
        );
      case 'RED':
        return (
          <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
            RED
          </span>
        );
      default:
        return <span className="text-gray-500">-</span>;
    }
  };

  // Compute summary counts
  const lowRiskCount = jobs.filter((j) => j.schedulingRiskLevel === 'LOW').length;
  const mediumRiskCount = jobs.filter((j) => j.schedulingRiskLevel === 'MEDIUM').length;
  const highRiskCount = jobs.filter((j) => j.schedulingRiskLevel === 'HIGH').length;

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Loading scheduling overview...</div>;
  }

  if (error) {
    return (
      <div className="rounded bg-red-50 p-4 text-red-700">
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Scheduling Overview</h2>
          <p className="text-sm text-gray-600">
            Material, risk, and subcontractor signals affecting job scheduling.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <Card.Content className="p-6">
            <div className="text-sm font-medium text-gray-500">Low Risk Jobs</div>
            <div className="mt-2 text-3xl font-semibold text-green-600">{lowRiskCount}</div>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="p-6">
            <div className="text-sm font-medium text-gray-500">Medium Risk Jobs</div>
            <div className="mt-2 text-3xl font-semibold text-amber-600">{mediumRiskCount}</div>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="p-6">
            <div className="text-sm font-medium text-gray-500">High Risk Jobs</div>
            <div className="mt-2 text-3xl font-semibold text-red-600">{highRiskCount}</div>
          </Card.Content>
        </Card>
      </div>

      {/* Jobs Table */}
      <Card>
        <Card.Content className="p-0">
          {jobs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No active jobs found.
            </div>
          ) : (
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
                      Material ETA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Subcontractor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Scheduling Risk
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Reasons
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {jobs.map((job) => (
                    <tr key={job.jobId} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {job.jobNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{job.customerName}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {job.status}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {getMaterialEtaBadge(job.materialEtaStatus)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="text-gray-900">{job.subcontractorName || '-'}</div>
                        {job.subcontractorStatus && (
                          <div className="mt-1">
                            {getSubcontractorStatusBadge(job.subcontractorStatus)}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {getSchedulingRiskBadge(job.schedulingRiskLevel)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <ul className="list-inside list-disc">
                          {job.reasons.slice(0, 2).map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                          {job.reasons.length > 2 && (
                            <li className="text-gray-400">
                              +{job.reasons.length - 2} more
                            </li>
                          )}
                        </ul>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <Link
                          href={`/risk/${job.jobId}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Risk
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
