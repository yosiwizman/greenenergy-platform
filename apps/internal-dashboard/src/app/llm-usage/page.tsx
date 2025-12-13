'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@greenenergy/ui';
import type { LlmUsageListItemDTO, LlmUsageSummaryDTO } from '@greenenergy/shared-types';
import { fetchLlmUsageRecent, fetchLlmUsageSummary } from '../../lib/api/llmUsageClient';

const RANGE_OPTIONS = [7, 30, 90] as const;

type RangeDays = (typeof RANGE_OPTIONS)[number];

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatUsd(value: number): string {
  // API already rounds, but keep stable formatting in UI.
  return `$${value.toFixed(4)}`;
}

function outcomeLabel(item: LlmUsageListItemDTO): { label: string; className: string } {
  if (!item.success) {
    return { label: 'ERROR', className: 'bg-red-100 text-red-800' };
  }
  if (item.isFallback) {
    return { label: 'FALLBACK', className: 'bg-amber-100 text-amber-800' };
  }
  return { label: 'SUCCESS', className: 'bg-green-100 text-green-800' };
}

export default function LlmUsagePage() {
  const [days, setDays] = useState<RangeDays>(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<LlmUsageSummaryDTO | null>(null);
  const [recent, setRecent] = useState<LlmUsageListItemDTO[]>([]);

  const generatedAtLabel = useMemo(() => {
    if (!summary?.generatedAt) return null;
    try {
      return new Date(summary.generatedAt).toLocaleString();
    } catch {
      return summary.generatedAt;
    }
  }, [summary?.generatedAt]);

  const load = async (targetDays: number) => {
    setLoading(true);
    setError(null);

    try {
      const [summaryRes, recentRes] = await Promise.all([
        fetchLlmUsageSummary(targetDays),
        fetchLlmUsageRecent(50),
      ]);

      setSummary(summaryRes);
      setRecent(recentRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(days);
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">LLM Usage Monitoring</h2>
        <p className="text-sm text-gray-600">
          Volume, fallback rates, and rough cost estimates for recent LLM calls.
        </p>
      </div>

      <Card>
        <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <label htmlFor="days" className="text-sm font-medium text-gray-700">
              Time range
            </label>
            <select
              id="days"
              aria-label="Time range"
              value={days}
              onChange={(e) => setDays(Number(e.target.value) as RangeDays)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {RANGE_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  Last {d} days
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void load(days)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>

          <div className="text-xs text-gray-500">
            {generatedAtLabel ? `Updated: ${generatedAtLabel}` : 'Updated: -'}
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-700">
          <p className="font-semibold">Unable to load LLM usage data.</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {loading && (
        <Card>
          <div className="p-4 text-sm text-gray-600">Loading…</div>
        </Card>
      )}

      {!loading && summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            <Card>
              <div className="p-4">
                <div className="text-sm font-medium text-gray-500">Total Calls</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">
                  {formatNumber(summary.totalCalls)}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <div className="text-sm font-medium text-gray-500">Success</div>
                <div className="mt-2 text-3xl font-bold text-green-600">
                  {formatNumber(summary.successCalls)}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <div className="text-sm font-medium text-gray-500">Fallback</div>
                <div className="mt-2 text-3xl font-bold text-amber-600">
                  {formatNumber(summary.fallbackCalls)}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <div className="text-sm font-medium text-gray-500">Errors</div>
                <div className="mt-2 text-3xl font-bold text-red-600">
                  {formatNumber(summary.errorCalls)}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <div className="text-sm font-medium text-gray-500">Est. Cost</div>
                <div className="mt-2 text-3xl font-bold text-gray-900">
                  {formatUsd(summary.estimatedCostUsd)}
                </div>
                <div className="mt-1 text-xs text-gray-500">Rough estimate</div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="text-lg font-semibold text-gray-900">Breakdown by Feature</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Feature
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Calls
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Success
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Fallback
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Errors
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Tokens In
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Tokens Out
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Est. Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {summary.byFeature.map((row) => (
                    <tr key={row.feature}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {row.feature}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{row.calls}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{row.successCalls}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{row.fallbackCalls}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{row.errorCalls}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatNumber(row.tokensInTotal)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatNumber(row.tokensOutTotal)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatUsd(row.estimatedCostUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="text-lg font-semibold text-gray-900">Breakdown by Model</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Model
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Calls
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Success
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Fallback
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Errors
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Tokens In
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Tokens Out
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Est. Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {summary.byModel.map((row) => (
                    <tr key={row.model}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.model}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{row.calls}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{row.successCalls}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{row.fallbackCalls}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{row.errorCalls}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatNumber(row.tokensInTotal)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatNumber(row.tokensOutTotal)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatUsd(row.estimatedCostUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <div className="border-b border-gray-200 px-4 py-3">
              <h3 className="text-lg font-semibold text-gray-900">Recent Calls</h3>
            </div>

            <div className="overflow-x-auto">
              {recent.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No recent calls found.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Feature
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Model
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Outcome
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Tokens (in/out)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Duration (ms)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Env
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Error Code
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {recent.map((item) => {
                      const badge = outcomeLabel(item);
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.feature}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {item.model || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">
                            {(item.tokensIn ?? '-') + ' / ' + (item.tokensOut ?? '-')}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">
                            {item.durationMs ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.environment ?? '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.errorCode ?? '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
