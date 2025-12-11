'use client';

import { useEffect, useState } from 'react';
import { Card } from '@greenenergy/ui';
import Link from 'next/link';
import type {
  ArSummaryDTO,
  JobArDetailsDTO,
  JobArStatus,
  ArAgingSummaryDTO,
  ArAgingBucket,
} from '@greenenergy/shared-types';

export default function FinancePage() {
  const [summary, setSummary] = useState<ArSummaryDTO | null>(null);
  const [agingSummary, setAgingSummary] = useState<ArAgingSummaryDTO | null>(null);
  const [jobs, setJobs] = useState<JobArDetailsDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [summaryRes, agingRes, jobsRes] = await Promise.all([
        fetch('/api/v1/finance/ar/summary'),
        fetch('/api/v1/finance/ar/aging'),
        fetch(
          statusFilter !== 'ALL' 
            ? `/api/v1/finance/ar/jobs?status=${statusFilter}`
            : '/api/v1/finance/ar/jobs'
        ),
      ]);

      if (!summaryRes.ok || !agingRes.ok || !jobsRes.ok) {
        throw new Error('Failed to fetch AR data');
      }

      const summaryData = await summaryRes.json();
      const agingData = await agingRes.json();
      const jobsData = await jobsRes.json();

      setSummary(summaryData);
      setAgingSummary(agingData);
      setJobs(jobsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getArStatusBadge = (status: JobArStatus) => {
    const colors: Record<JobArStatus, string> = {
      PAID: 'bg-green-100 text-green-800',
      PARTIALLY_PAID: 'bg-blue-100 text-blue-800',
      UNPAID: 'bg-yellow-100 text-yellow-800',
      OVERDUE: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[status]}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
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

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getBucketLabel = (bucket: ArAgingBucket): string => {
    const labels: Record<ArAgingBucket, string> = {
      CURRENT: 'Current',
      DAYS_1_30: '1-30 Days',
      DAYS_31_60: '31-60 Days',
      DAYS_61_90: '61-90 Days',
      DAYS_91_PLUS: '91+ Days',
    };
    return labels[bucket];
  };

  const getBucketColor = (bucket: ArAgingBucket): string => {
    const colors: Record<ArAgingBucket, string> = {
      CURRENT: 'text-gray-700',
      DAYS_1_30: 'text-yellow-600',
      DAYS_31_60: 'text-orange-600',
      DAYS_61_90: 'text-red-600',
      DAYS_91_PLUS: 'text-red-800',
    };
    return colors[bucket];
  };

  if (loading && !summary) {
    return <div className="py-8 text-center text-gray-500">Loading finance data...</div>;
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
          <h2 className="text-2xl font-bold text-gray-900">Finance & AR Dashboard</h2>
          <p className="text-sm text-gray-600">
            Accounts Receivable tracking and payment status
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
              <div className="text-sm font-medium text-gray-500">Total Outstanding</div>
              <div className="mt-2 text-3xl font-semibold text-red-600">
                {formatCurrency(summary.totalOutstanding)}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {summary.jobsOverdue} overdue
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Total Paid</div>
              <div className="mt-2 text-3xl font-semibold text-green-600">
                {formatCurrency(summary.totalPaid)}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {summary.jobsPaid} fully paid
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Total Contract Value</div>
              <div className="mt-2 text-3xl font-semibold text-blue-600">
                {formatCurrency(summary.totalContractValue)}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {summary.jobsPaid + summary.jobsPartiallyPaid + summary.jobsUnpaid + summary.jobsOverdue} jobs
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Partially Paid</div>
              <div className="mt-2 text-3xl font-semibold text-amber-600">
                {summary.jobsPartiallyPaid}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {summary.jobsUnpaid} unpaid
              </div>
            </Card.Content>
          </Card>
        </div>
      )}

      {/* AR Aging Buckets (Phase 5 Sprint 2) */}
      {agingSummary && (
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">AR Aging Analysis</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {agingSummary.buckets.map((bucket) => (
              <Card key={bucket.bucket}>
                <Card.Content className="p-4">
                  <div className="text-sm font-medium text-gray-500">
                    {getBucketLabel(bucket.bucket)}
                  </div>
                  <div className={`mt-2 text-2xl font-semibold ${getBucketColor(bucket.bucket)}`}>
                    {formatCurrency(bucket.outstanding)}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {bucket.jobsCount} {bucket.jobsCount === 1 ? 'job' : 'jobs'}
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">AR Status Filter</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="ALL">All Jobs</option>
          <option value="OVERDUE">Overdue</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Paid</option>
        </select>
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
                  <th className="px-4 py-3 font-medium text-gray-700">Amount Paid</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Outstanding</th>
                  <th className="px-4 py-3 font-medium text-gray-700">AR Status</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Due Date</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Last Payment</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-gray-500">
                      {loading ? 'Loading...' : 'No jobs found for the selected filter.'}
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.jobId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {job.jobNumber || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{job.customerName || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{job.status}</td>
                      <td className="px-4 py-3 text-gray-900">
                        {formatCurrency(job.contractAmount)}
                      </td>
                      <td className="px-4 py-3 text-green-600 font-medium">
                        {formatCurrency(job.amountPaid)}
                      </td>
                      <td className="px-4 py-3 text-red-600 font-medium">
                        {formatCurrency(job.amountOutstanding)}
                      </td>
                      <td className="px-4 py-3">{getArStatusBadge(job.arStatus)}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(job.invoiceDueDate)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(job.lastPaymentAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/jobs/${job.jobId}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                        >
                          View Job
                        </Link>
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
