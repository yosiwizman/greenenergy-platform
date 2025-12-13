'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@greenenergy/ui';
import type { WorkflowDepartment, WorkflowRuleSummaryDTO } from '@greenenergy/shared-types';

async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text ? `: ${text}` : '';
  } catch {
    return '';
  }
}

async function fetchWorkflowRules(): Promise<WorkflowRuleSummaryDTO[]> {
  const res = await fetch('/api/v1/workflows/rules', {
    method: 'GET',
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to load workflow rules (${res.status})${await readErrorBody(res)}`);
  }

  return res.json();
}

function DepartmentBadge({ department }: { department: WorkflowDepartment }) {
  const colors: Record<WorkflowDepartment, string> = {
    SALES: 'bg-pink-100 text-pink-800',
    PRODUCTION: 'bg-blue-100 text-blue-800',
    ADMIN: 'bg-gray-100 text-gray-800',
    SAFETY: 'bg-orange-100 text-orange-800',
    WARRANTY: 'bg-emerald-100 text-emerald-800',
    FINANCE: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[department] || 'bg-gray-100 text-gray-800'}`}>
      {department}
    </span>
  );
}

export default function WorkflowsPage() {
  const [rules, setRules] = useState<WorkflowRuleSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchWorkflowRules();
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const enabledCount = useMemo(() => rules.filter((r) => r.enabled).length, [rules]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workflows</h2>
          <p className="mt-1 text-sm text-gray-600">Automation rules that run inside the Core API.</p>
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
          <p className="font-semibold">Unable to load workflows.</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <Card.Title>Workflow Rules</Card.Title>
            <div className="text-xs text-gray-500">{enabledCount}/{rules.length} enabled</div>
          </div>
        </Card.Header>
        <Card.Content className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : rules.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No workflow rules found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Key</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Enabled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rules.map((rule) => (
                    <tr key={rule.key} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900">
                        {rule.key}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">{rule.name}</div>
                        <div className="text-xs text-gray-500">{rule.description}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <DepartmentBadge department={rule.department} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {rule.enabled ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                            Disabled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>Workflow Logs</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            Coming soon
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Logs/actions are intentionally disabled in staging UI to avoid calling endpoints that may not be stable yet.
          </p>
        </Card.Content>
      </Card>
    </div>
  );
}
