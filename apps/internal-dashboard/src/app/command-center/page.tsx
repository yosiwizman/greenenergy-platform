'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@greenenergy/ui';
import type { CommandCenterJobAttentionDTO, CommandCenterOverviewDTO } from '@greenenergy/shared-types';

async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text ? `: ${text}` : '';
  } catch {
    return '';
  }
}

async function fetchCommandCenterOverview(): Promise<CommandCenterOverviewDTO> {
  const res = await fetch('/api/v1/command-center/overview', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to load Command Center (${res.status})${await readErrorBody(res)}`);
  }

  return res.json();
}

function RiskBadge({ level }: { level?: string | null }) {
  if (!level) return <span className="text-gray-400">-</span>;

  const normalized = level.toUpperCase();
  const colors: Record<string, string> = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-amber-100 text-amber-800',
    HIGH: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
        colors[normalized] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {normalized}
    </span>
  );
}

function FlagPill({ active, label }: { active?: boolean; label: string }) {
  if (!active) return null;
  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
      {label}
    </span>
  );
}

function formatUpdatedAt(value?: string | null): string {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function JobAttentionRow({ job }: { job: CommandCenterJobAttentionDTO }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900">
        {job.jobId.slice(0, 8)}…
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">{job.customerName || '-'}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{job.status || '-'}</td>
      <td className="px-4 py-3 text-sm">
        <RiskBadge level={job.riskLevel} />
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          <FlagPill active={job.hasQcFail} label="QC" />
          <FlagPill active={job.hasOpenSafetyIncident} label="Safety" />
          <FlagPill active={job.hasDelayedMaterials} label="Materials" />
          <FlagPill active={job.hasExpiringWarranty} label="Warranty" />
          <FlagPill active={job.isLowMarginHighRisk} label="Low Margin" />
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatUpdatedAt(job.lastUpdatedAt)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-sm">
        <Link href={`/risk/${job.jobId}`} className="text-blue-600 hover:text-blue-900">
          View
        </Link>
      </td>
    </tr>
  );
}

export default function CommandCenterPage() {
  const [data, setData] = useState<CommandCenterOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const next = await fetchCommandCenterOverview();
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const attentionCount = data?.jobsNeedingAttention?.length ?? 0;

  const roleCards = useMemo(() => {
    if (!data) return null;

    const { roleViews } = data;
    return [
      {
        title: 'Executive',
        items: [
          { label: 'Total Jobs', value: roleViews.executive.totalJobs },
          { label: 'In Progress', value: roleViews.executive.jobsInProgress },
          { label: 'High Risk', value: roleViews.executive.jobsHighRisk },
        ],
      },
      {
        title: 'Production',
        items: [
          { label: 'QC Issues', value: roleViews.production.jobsWithQcIssues },
          { label: 'Delayed Materials', value: roleViews.production.jobsWithDelayedMaterials },
          { label: 'Schedule Risk', value: roleViews.production.jobsWithSchedulingRisk },
        ],
      },
      {
        title: 'Safety',
        items: [
          { label: 'Open Incidents', value: roleViews.safety.openIncidents },
          { label: 'High Severity', value: roleViews.safety.highSeverityIncidents },
          { label: 'Last 30 Days', value: roleViews.safety.incidentsLast30Days },
        ],
      },
      {
        title: 'Finance',
        items: [
          { label: 'Low Margin Jobs', value: roleViews.finance.lowMarginJobs },
          { label: 'Low Margin + High Risk', value: roleViews.finance.lowMarginHighRiskJobs },
        ],
      },
    ];
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Command Center</h2>
          <p className="mt-1 text-sm text-gray-600">Portfolio snapshot and cross-functional attention queue.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded bg-red-50 p-4 text-red-700">
          <p className="font-semibold">Unable to load Command Center.</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <Card>
          <Card.Content>
            <div className="py-8 text-center text-gray-500">Loading Command Center…</div>
          </Card.Content>
        </Card>
      )}

      {!loading && data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <Card.Content className="p-6">
                <div className="text-sm font-medium text-gray-500">Jobs In Progress</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">
                  {data.summary.jobsInProgress.toLocaleString()}
                </div>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content className="p-6">
                <div className="text-sm font-medium text-gray-500">High Risk Jobs</div>
                <div className="mt-2 text-3xl font-semibold text-red-600">
                  {data.summary.jobsHighRisk.toLocaleString()}
                </div>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content className="p-6">
                <div className="text-sm font-medium text-gray-500">Open Safety Incidents</div>
                <div className="mt-2 text-3xl font-semibold text-amber-600">
                  {data.summary.openSafetyIncidents.toLocaleString()}
                </div>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content className="p-6">
                <div className="text-sm font-medium text-gray-500">Needs Attention</div>
                <div className="mt-2 text-3xl font-semibold text-blue-600">
                  {attentionCount.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-gray-500">Jobs with one or more flags</div>
              </Card.Content>
            </Card>
          </div>

          {roleCards && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              {roleCards.map((card) => (
                <Card key={card.title}>
                  <Card.Header>
                    <Card.Title>{card.title}</Card.Title>
                  </Card.Header>
                  <Card.Content className="space-y-2">
                    {card.items.map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {item.value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </Card.Content>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <Card.Header>
              <div className="flex items-center justify-between">
                <Card.Title>Jobs Needing Attention</Card.Title>
                <div className="text-xs text-gray-500">{attentionCount} jobs</div>
              </div>
            </Card.Header>
            <Card.Content className="p-0">
              {attentionCount === 0 ? (
                <div className="p-6 text-sm text-gray-500">No jobs currently flagged.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Job</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Risk</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Flags</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Updated</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {data.jobsNeedingAttention.map((job) => (
                        <JobAttentionRow key={job.jobId} job={job} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Content>
          </Card>
        </>
      )}
    </div>
  );
}
