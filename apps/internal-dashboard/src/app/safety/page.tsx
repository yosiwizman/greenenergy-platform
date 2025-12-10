'use client';

import { useEffect, useState } from 'react';
import { Card } from '@greenenergy/ui';
import Link from 'next/link';
import type {
  SafetyIncidentDTO,
  SafetyIncidentSummaryDTO,
  SafetyIncidentSeverity,
  SafetyIncidentStatus,
} from '@greenenergy/shared-types';

export default function SafetyOverviewPage() {
  const [incidents, setIncidents] = useState<SafetyIncidentDTO[]>([]);
  const [summary, setSummary] = useState<SafetyIncidentSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<SafetyIncidentSeverity | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<SafetyIncidentStatus | 'ALL'>('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch summary
      const summaryResponse = await fetch('/api/v1/safety/incidents-summary');
      if (!summaryResponse.ok) {
        throw new Error(`Failed to fetch summary: ${summaryResponse.statusText}`);
      }
      const summaryData = await summaryResponse.json();
      setSummary(summaryData);

      // Fetch incidents (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromDate = thirtyDaysAgo.toISOString();

      const incidentsResponse = await fetch(
        `/api/v1/safety/incidents?fromDate=${fromDate}`
      );
      if (!incidentsResponse.ok) {
        throw new Error(`Failed to fetch incidents: ${incidentsResponse.statusText}`);
      }
      const incidentsData = await incidentsResponse.json();
      setIncidents(incidentsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex rounded-full bg-red-600 px-2 py-1 text-xs font-semibold text-white">
            CRITICAL
          </span>
        );
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
            OPEN
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
            UNDER REVIEW
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
            CLOSED
          </span>
        );
      default:
        return <span className="text-gray-500">-</span>;
    }
  };

  const filteredIncidents = incidents.filter((incident) => {
    if (severityFilter !== 'ALL' && incident.severity !== severityFilter) {
      return false;
    }
    if (statusFilter !== 'ALL' && incident.status !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Safety & Incidents</h2>
          <p className="mt-1 text-sm text-gray-500">
            Overview of recent safety incidents and trends
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
      {summary && !loading && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <Card.Content>
              <div className="text-sm font-medium text-gray-500">Total Incidents</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{summary.total}</div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content>
              <div className="text-sm font-medium text-gray-500">Last 30 Days</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {summary.incidentsLast30Days}
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content>
              <div className="text-sm font-medium text-gray-500">Open Incidents</div>
              <div className="mt-2 text-3xl font-bold text-yellow-600">
                {summary.byStatus.OPEN}
              </div>
            </Card.Content>
          </Card>

          <Card>
            <Card.Content>
              <div className="text-sm font-medium text-gray-500">Critical/High</div>
              <div className="mt-2 text-3xl font-bold text-red-600">
                {summary.bySeverity.CRITICAL + summary.bySeverity.HIGH}
              </div>
            </Card.Content>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label className="mr-2 text-sm font-medium text-gray-700">Severity:</label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="rounded border border-gray-300 px-3 py-1 text-sm"
          >
            <option value="ALL">All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <div>
          <label className="mr-2 text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded border border-gray-300 px-3 py-1 text-sm"
          >
            <option value="ALL">All</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div className="text-sm text-gray-500">
          Showing {filteredIncidents.length} of {incidents.length} incidents
        </div>
      </div>

      {/* Incidents Table */}
      <Card>
        <Card.Content>
          {loading && <div className="py-8 text-center text-gray-500">Loading incidents...</div>}

          {error && <div className="rounded bg-red-50 p-4 text-red-700">Error: {error}</div>}

          {!loading && !error && filteredIncidents.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              No safety incidents found for this period.
            </div>
          )}

          {!loading && !error && filteredIncidents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Job #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Subcontractor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredIncidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {new Date(incident.occurredAt).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {incident.jobNumber || incident.jobId?.substring(0, 8) || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {incident.subcontractorName || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {incident.type.replace(/_/g, ' ')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {getSeverityBadge(incident.severity)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {getStatusBadge(incident.status)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex space-x-2">
                          <Link
                            href={`/safety/incidents/${incident.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </Link>
                          {incident.jobId && (
                            <>
                              <span className="text-gray-300">|</span>
                              <Link
                                href={`/risk/${incident.jobId}`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Job Risk
                              </Link>
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
