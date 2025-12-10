'use client';

import { useEffect, useState } from 'react';
import { Card } from '@greenenergy/ui';
import Link from 'next/link';
import type {
  WorkflowActionLogDTO,
  WorkflowRuleSummaryDTO,
  WorkflowActionType,
  WorkflowDepartment,
  RunWorkflowForJobResponse,
  RunAllWorkflowsResponse,
} from '@greenenergy/shared-types';

export default function WorkflowsPage() {
  const [rules, setRules] = useState<WorkflowRuleSummaryDTO[]>([]);
  const [logs, setLogs] = useState<WorkflowActionLogDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [jobIdFilter, setJobIdFilter] = useState('');
  const [ruleKeyFilter, setRuleKeyFilter] = useState('ALL');
  const [limit, setLimit] = useState(50);

  // Manual trigger states
  const [runningAll, setRunningAll] = useState(false);
  const [manualJobId, setManualJobId] = useState('');
  const [runningJob, setRunningJob] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
    fetchLogs();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [jobIdFilter, ruleKeyFilter, limit]);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/v1/workflows/rules', {
        headers: {
          'x-internal-api-key': process.env.NEXT_PUBLIC_INTERNAL_API_KEY || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch workflow rules');
      }

      const data = await response.json();
      setRules(data);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (jobIdFilter) params.append('jobId', jobIdFilter);
      if (ruleKeyFilter !== 'ALL') params.append('ruleKey', ruleKeyFilter);
      params.append('limit', limit.toString());

      const response = await fetch(`/api/v1/workflows/logs?${params.toString()}`, {
        headers: {
          'x-internal-api-key': process.env.NEXT_PUBLIC_INTERNAL_API_KEY || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch workflow logs');
      }

      const data = await response.json();
      setLogs(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAll = async () => {
    try {
      setRunningAll(true);
      setRunResult(null);

      const response = await fetch('/api/v1/workflows/run-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': process.env.NEXT_PUBLIC_INTERNAL_API_KEY || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to run workflows for all jobs');
      }

      const data: RunAllWorkflowsResponse = await response.json();
      setRunResult(
        `✅ Success! Processed ${data.processed} jobs, triggered ${data.actions} actions.`
      );

      // Refresh logs
      await fetchLogs();
    } catch (err) {
      console.error('Failed to run all workflows:', err);
      setRunResult(
        `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setRunningAll(false);
    }
  };

  const handleRunForJob = async () => {
    if (!manualJobId.trim()) {
      setRunResult('❌ Please enter a Job ID');
      return;
    }

    try {
      setRunningJob(true);
      setRunResult(null);

      const response = await fetch(`/api/v1/workflows/jobs/${manualJobId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': process.env.NEXT_PUBLIC_INTERNAL_API_KEY || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to run workflows for job');
      }

      const data: RunWorkflowForJobResponse = await response.json();
      setRunResult(
        `✅ Success! Triggered ${data.actions.length} action(s) for job ${data.jobId}.`
      );

      // Refresh logs
      await fetchLogs();
    } catch (err) {
      console.error('Failed to run workflows for job:', err);
      setRunResult(
        `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setRunningJob(false);
    }
  };

  const getDepartmentBadge = (department: WorkflowDepartment) => {
    const colors: Record<WorkflowDepartment, string> = {
      SALES: 'bg-blue-100 text-blue-800',
      PRODUCTION: 'bg-purple-100 text-purple-800',
      ADMIN: 'bg-gray-100 text-gray-800',
      SAFETY: 'bg-red-100 text-red-800',
      WARRANTY: 'bg-amber-100 text-amber-800',
      FINANCE: 'bg-green-100 text-green-800',
    };

    return (
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[department]}`}
      >
        {department}
      </span>
    );
  };

  const getActionTypeBadge = (actionType: WorkflowActionType) => {
    const colors: Record<WorkflowActionType, string> = {
      JOBNIMBUS_TASK: 'bg-blue-100 text-blue-800',
      JOBNIMBUS_NOTE: 'bg-purple-100 text-purple-800',
      INTERNAL_FLAG: 'bg-amber-100 text-amber-800',
    };

    const labels: Record<WorkflowActionType, string> = {
      JOBNIMBUS_TASK: 'Task',
      JOBNIMBUS_NOTE: 'Note',
      INTERNAL_FLAG: 'Flag',
    };

    return (
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[actionType]}`}
      >
        {labels[actionType]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  // Map rule keys to departments for the logs table
  const getRuleDepartment = (ruleKey: string): WorkflowDepartment | null => {
    const rule = rules.find((r) => r.key === ruleKey);
    return rule?.department || null;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workflow Automation</h2>
          <p className="text-sm text-gray-600">
            Automated rules that create tasks, notes, and alerts across jobs.
          </p>
        </div>
        <div>
          <button
            onClick={handleRunAll}
            disabled={runningAll}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {runningAll ? 'Running...' : 'Run All Workflows'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-red-700">
          Error: {error}
        </div>
      )}

      {/* Run Result Display */}
      {runResult && (
        <div
          className={`mb-6 rounded-md p-4 ${
            runResult.startsWith('✅')
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {runResult}
        </div>
      )}

      {/* Manual Trigger for Single Job */}
      <Card className="mb-6">
        <div className="p-4">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Run Workflows for a Job
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Job ID"
              value={manualJobId}
              onChange={(e) => setManualJobId(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              onClick={handleRunForJob}
              disabled={runningJob || !manualJobId.trim()}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {runningJob ? 'Running...' : 'Run for Job'}
            </button>
          </div>
        </div>
      </Card>

      {/* Rules Summary */}
      <Card className="mb-6">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">Workflow Rules</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rules.map((rule) => (
                <tr key={rule.key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {getDepartmentBadge(rule.department)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {rule.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {rule.description}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <code className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-800">
                      {rule.key}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        rule.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Actions */}
      <Card>
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">Recent Actions</h3>
        </div>

        {/* Filters */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Job ID
              </label>
              <input
                type="text"
                placeholder="Filter by Job ID"
                value={jobIdFilter}
                onChange={(e) => setJobIdFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Rule
              </label>
              <select
                value={ruleKeyFilter}
                onChange={(e) => setRuleKeyFilter(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="ALL">All Rules</option>
                {rules.map((rule) => (
                  <option key={rule.key} value={rule.key}>
                    {rule.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Limit
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading actions...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p className="text-sm">No workflow actions recorded yet.</p>
              <p className="mt-1 text-xs text-gray-400">
                Once rules fire, you'll see actions here.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Job ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Rule Key
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Action Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Metadata
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {logs.map((log) => {
                  const department = getRuleDepartment(log.ruleKey);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/risk/${log.jobId}`}
                          className="font-mono text-primary-600 hover:underline"
                        >
                          {log.jobId.substring(0, 8)}...
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <code className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-800">
                          {log.ruleKey}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {department ? (
                          getDepartmentBadge(department)
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getActionTypeBadge(log.actionType)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.metadata ? (
                          <code className="text-xs text-gray-500">
                            {JSON.stringify(log.metadata, null, 0).substring(0, 60)}
                            {JSON.stringify(log.metadata).length > 60 && '...'}
                          </code>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
