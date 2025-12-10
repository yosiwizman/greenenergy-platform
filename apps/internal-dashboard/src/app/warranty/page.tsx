'use client';

import { useEffect, useState } from 'react';
import { Card } from '@greenenergy/ui';
import Link from 'next/link';
import type {
  WarrantyDTO,
  WarrantySummaryDTO,
  WarrantyClaimDTO,
  WarrantyStatus,
} from '@greenenergy/shared-types';

export default function WarrantyOverviewPage() {
  const [summary, setSummary] = useState<WarrantySummaryDTO | null>(null);
  const [warranties, setWarranties] = useState<WarrantyDTO[]>([]);
  const [claims, setClaims] = useState<WarrantyClaimDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<WarrantyStatus | 'ALL'>('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [summaryRes, warrantiesRes, claimsRes] = await Promise.all([
        fetch('/api/v1/warranty/summary'),
        fetch('/api/v1/warranty'),
        fetch('/api/v1/warranty/claims?status=OPEN'),
      ]);

      if (!summaryRes.ok || !warrantiesRes.ok || !claimsRes.ok) {
        throw new Error('Failed to fetch warranty data');
      }

      const summaryData = await summaryRes.json();
      const warrantiesData = await warrantiesRes.json();
      const claimsData = await claimsRes.json();

      setSummary(summaryData);
      setWarranties(warrantiesData);
      setClaims(claimsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: WarrantyStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
            ACTIVE
          </span>
        );
      case 'PENDING_ACTIVATION':
        return (
          <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
            PENDING
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
            EXPIRED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
            CANCELLED
          </span>
        );
      default:
        return <span className="text-gray-500">-</span>;
    }
  };

  const getClaimStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-800',
      IN_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      RESOLVED: 'bg-gray-100 text-gray-800',
    };
    const colorClass = colors[status] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colorClass}`}>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredWarranties =
    statusFilter === 'ALL'
      ? warranties
      : warranties.filter((w) => w.status === statusFilter);

  // Determine "expiring soon" based on 30 days threshold
  const getExpiringWarranties = () => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return warranties.filter((w) => {
      if (w.status !== 'ACTIVE') return false;
      const endDate = new Date(w.endDate);
      return endDate <= thirtyDaysFromNow && endDate > new Date();
    });
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500">Loading warranty overview...</div>
    );
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
          <h2 className="text-2xl font-bold text-gray-900">Warranty Overview</h2>
          <p className="text-sm text-gray-600">
            Status of active and expiring warranties across all jobs.
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
              <div className="text-sm font-medium text-gray-500">Total Warranties</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{summary.total}</div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Active</div>
              <div className="mt-2 text-3xl font-semibold text-green-600">{summary.active}</div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Expiring Soon</div>
              <div className="mt-2 text-3xl font-semibold text-amber-600">
                {summary.expiringSoon}
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Expired</div>
              <div className="mt-2 text-3xl font-semibold text-gray-600">{summary.expired}</div>
            </Card.Content>
          </Card>
        </div>
      )}

      {/* Warranties Table */}
      <Card className="mb-6">
        <Card.Header>
          <div className="flex items-center justify-between">
            <Card.Title>Warranties</Card.Title>
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm text-gray-600">
                Filter:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as WarrantyStatus | 'ALL')}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_ACTIVATION">Pending</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </Card.Header>
        <Card.Content>
          {filteredWarranties.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No warranties found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Job ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredWarranties.map((warranty) => (
                    <tr key={warranty.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-gray-900">
                        {warranty.jobId.substring(0, 8)}...
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {warranty.type}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {warranty.provider || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {getStatusBadge(warranty.status)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatDate(warranty.startDate)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatDate(warranty.endDate)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <Link
                          href={`/risk/${warranty.jobId}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Job
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

      {/* Recent Claims */}
      <Card>
        <Card.Header>
          <Card.Title>Recent Warranty Claims</Card.Title>
        </Card.Header>
        <Card.Content>
          {claims.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No open warranty claims.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Reported At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Job ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatDate(claim.reportedAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-gray-900">
                        {claim.jobId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{claim.title}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {getClaimStatusBadge(claim.status)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {getPriorityBadge(claim.priority)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {claim.source}
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
