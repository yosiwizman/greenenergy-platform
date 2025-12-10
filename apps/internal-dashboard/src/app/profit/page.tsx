'use client';

import { useEffect, useState } from 'react';
import { Card } from '@greenenergy/ui';
import Link from 'next/link';
import type {
  ProfitDashboardSummaryDTO,
  JobProfitabilityDTO,
  JobProfitabilityLevel,
  AccountingSource,
} from '@greenenergy/shared-types';

export default function ProfitPage() {
  const [summary, setSummary] = useState<ProfitDashboardSummaryDTO | null>(null);
  const [jobs, setJobs] = useState<JobProfitabilityDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [profitabilityFilter, setProfitabilityFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [syncingJobId, setSyncingJobId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [summaryRes, jobsRes] = await Promise.all([
        fetch('/api/v1/profit/dashboard/summary'),
        fetch('/api/v1/profit/dashboard/jobs'),
      ]);

      if (!summaryRes.ok || !jobsRes.ok) {
        throw new Error('Failed to fetch profit data');
      }

      const summaryData = await summaryRes.json();
      const jobsData = await jobsRes.json();

      setSummary(summaryData);
      setJobs(jobsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getProfitabilityBadge = (level: JobProfitabilityLevel) => {
    const colors: Record<JobProfitabilityLevel, string> = {
      LOW: 'bg-red-100 text-red-800',
      MEDIUM: 'bg-amber-100 text-amber-800',
      HIGH: 'bg-green-100 text-green-800',
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[level]}`}>
        {level}
      </span>
    );
  };

  const getRiskBadge = (risk: string | null | undefined) => {
    if (!risk) return <span className="text-gray-400">-</span>;
    const colors: Record<string, string> = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-amber-100 text-amber-800',
      HIGH: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[risk] || 'bg-gray-100 text-gray-800'}`}>
        {risk}
      </span>
    );
  };

  const getAccountingSourceBadge = (source: AccountingSource | null | undefined) => {
    if (!source || source === 'PLACEHOLDER') {
      return (
        <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700">
          Placeholder
        </span>
      );
    }
    if (source === 'QUICKBOOKS') {
      return (
        <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800">
          QuickBooks
        </span>
      );
    }
    if (source === 'MANUAL') {
      return (
        <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800">
          Manual
        </span>
      );
    }
    return <span className="text-gray-400">-</span>;
  };

  const handleSyncJob = async (jobId: string) => {
    try {
      setSyncingJobId(jobId);
      const response = await fetch(`/api/v1/accounting/jobs/${jobId}/sync`, {
        method: 'POST',
        headers: {
          'x-internal-api-key': process.env.NEXT_PUBLIC_INTERNAL_API_KEY || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to sync job from QuickBooks');
      }

      // Refresh data after sync
      await fetchData();
    } catch (err) {
      console.error('Failed to sync job:', err);
      alert('Failed to sync job from QuickBooks. Check console for details.');
    } finally {
      setSyncingJobId(null);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number | null | undefined) => {
    if (percent === null || percent === undefined) return '-';
    return `${percent.toFixed(1)}%`;
  };

  // Filter jobs
  let filteredJobs = jobs;
  if (profitabilityFilter !== 'ALL') {
    filteredJobs = filteredJobs.filter((j) => j.profitabilityLevel === profitabilityFilter);
  }
  if (riskFilter !== 'ALL') {
    filteredJobs = filteredJobs.filter((j) => j.riskLevel === riskFilter);
  }

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Loading profit data...</div>;
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
          <h2 className="text-2xl font-bold text-gray-900">Profit & Executive Dashboard</h2>
          <p className="text-sm text-gray-600">
            Job-level profitability and portfolio performance
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
      {summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Total Contract Amount</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">
                {formatCurrency(summary.totalContractAmount)}
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Total Margin Amount</div>
              <div className="mt-2 text-3xl font-semibold text-green-600">
                {formatCurrency(summary.totalMarginAmount)}
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Average Margin %</div>
              <div className="mt-2 text-3xl font-semibold text-blue-600">
                {formatPercent(summary.averageMarginPercent)}
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">High-Risk Low-Margin Jobs</div>
              <div className="mt-2 text-3xl font-semibold text-red-600">
                {summary.highRiskAndLowMarginJobCount}
              </div>
            </Card.Content>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Profitability</label>
          <select
            value={profitabilityFilter}
            onChange={(e) => setProfitabilityFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Risk Level</label>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="ALL">All</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <Card>
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Job #</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Customer</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Contract Amount</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Margin %</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Profitability</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Risk Level</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Source</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                      No jobs found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr key={job.jobId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {job.jobNumber || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{job.customerName}</td>
                      <td className="px-4 py-3 text-gray-700">{job.status}</td>
                      <td className="px-4 py-3 text-gray-900">
                        {formatCurrency(job.contractAmount)}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {formatPercent(job.marginPercent)}
                      </td>
                      <td className="px-4 py-3">{getProfitabilityBadge(job.profitabilityLevel)}</td>
                      <td className="px-4 py-3">{getRiskBadge(job.riskLevel)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {getAccountingSourceBadge(job.accountingSource)}
                          {job.accountingLastSyncAt && (
                            <span className="text-xs text-gray-500">
                              {new Date(job.accountingLastSyncAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/risk/${job.jobId}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                          >
                            View Risk
                          </Link>
                          {job.accountingSource !== 'QUICKBOOKS' && (
                            <button
                              onClick={() => handleSyncJob(job.jobId)}
                              disabled={syncingJobId === job.jobId}
                              className="text-sm text-green-600 hover:text-green-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {syncingJobId === job.jobId ? 'Syncing...' : 'Sync QB'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
