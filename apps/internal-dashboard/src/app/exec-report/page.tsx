'use client';

import { useEffect, useState } from 'react';
import { Card } from '@greenenergy/ui';
import type {
  ExecutiveDigestDTO,
  ArAgingBucket,
} from '@greenenergy/shared-types';

export default function ExecutiveReportPage() {
  const [digest, setDigest] = useState<ExecutiveDigestDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    fetchDigest();
  }, []);

  const fetchDigest = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/exec-report/weekly');
      
      if (!res.ok) {
        throw new Error('Failed to fetch executive digest');
      }

      const data = await res.json();
      setDigest(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendDigest = async () => {
    try {
      setSending(true);
      setSendSuccess(false);
      
      const res = await fetch('/api/v1/exec-report/weekly/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to send digest');
      }

      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send digest');
    } finally {
      setSending(false);
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

  if (loading && !digest) {
    return <div className="py-8 text-center text-gray-500">Loading executive digest...</div>;
  }

  if (error && !digest) {
    return (
      <div className="rounded bg-red-50 p-4 text-red-700">
        Error: {error}
      </div>
    );
  }

  if (!digest) return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Executive Weekly Digest</h2>
          <p className="text-sm text-gray-600">
            Period: {formatDate(digest.periodStart)} – {formatDate(digest.periodEnd)}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchDigest}
            className="rounded bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Refresh
          </button>
          <button
            onClick={handleSendDigest}
            disabled={sending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Digest Email Now'}
          </button>
        </div>
      </div>

      {sendSuccess && (
        <div className="mb-4 rounded bg-green-50 p-3 text-green-700">
          ✓ Digest email sent successfully!
        </div>
      )}

      {error && digest && (
        <div className="mb-4 rounded bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {/* Key Metrics */}
      <div className="mb-6">
        <h3 className="mb-3 text-lg font-semibold text-gray-900">📊 Key Metrics</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">High-Risk Jobs</div>
              <div className="mt-2 text-3xl font-semibold text-red-600">
                {digest.keyCounts.highRiskJobs}
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Open Safety Incidents</div>
              <div className="mt-2 text-3xl font-semibold text-orange-600">
                {digest.keyCounts.safetyIncidentsOpen}
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Overdue AR Jobs</div>
              <div className="mt-2 text-3xl font-semibold text-amber-600">
                {digest.keyCounts.overdueArJobs}
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Workflows Triggered</div>
              <div className="mt-2 text-3xl font-semibold text-blue-600">
                {digest.keyCounts.workflowsTriggeredLastPeriod}
              </div>
              <div className="mt-1 text-xs text-gray-500">This period</div>
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Finance & AR */}
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-900">💰 Finance & AR Summary</h3>
            <div className="space-y-4">
              <Card>
                <Card.Content className="p-6">
                  <div className="text-sm font-medium text-gray-500">Total Outstanding AR</div>
                  <div className="mt-2 text-2xl font-semibold text-red-600">
                    {formatCurrency(digest.financeArSummary.totalOutstanding)}
                  </div>
                </Card.Content>
              </Card>
              <Card>
                <Card.Content className="p-6">
                  <div className="text-sm font-medium text-gray-500">Total Paid</div>
                  <div className="mt-2 text-2xl font-semibold text-green-600">
                    {formatCurrency(digest.financeArSummary.totalPaid)}
                  </div>
                </Card.Content>
              </Card>
              <Card>
                <Card.Content className="p-6">
                  <div className="text-sm font-medium text-gray-500">Total Contract Value</div>
                  <div className="mt-2 text-2xl font-semibold text-blue-600">
                    {formatCurrency(digest.financeArSummary.totalContractValue)}
                  </div>
                </Card.Content>
              </Card>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-900">📅 AR Aging Summary</h3>
            <Card>
              <Card.Content className="p-6">
                <div className="space-y-3">
                  {digest.financeAgingSummary.buckets.map((bucket) => (
                    <div key={bucket.bucket} className="flex justify-between border-b pb-2 last:border-0">
                      <div>
                        <div className="font-medium text-gray-700">{getBucketLabel(bucket.bucket as ArAgingBucket)}</div>
                        <div className="text-xs text-gray-500">{bucket.jobsCount} jobs</div>
                      </div>
                      <div className="text-right font-semibold text-gray-900">
                        {formatCurrency(bucket.outstanding)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          </div>
        </div>

        {/* Right Column: Forecast & Pipeline */}
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-900">📈 Cashflow & Pipeline Forecast</h3>
            <div className="space-y-4">
              <Card>
                <Card.Content className="p-6">
                  <div className="text-sm font-medium text-gray-500">Forecast Horizon</div>
                  <div className="mt-2 text-2xl font-semibold text-gray-900">
                    {digest.forecastOverview.cashflow.horizonWeeks} weeks
                  </div>
                </Card.Content>
              </Card>
              <Card>
                <Card.Content className="p-6">
                  <div className="text-sm font-medium text-gray-500">Total Pipeline</div>
                  <div className="mt-2 text-2xl font-semibold text-blue-600">
                    {formatCurrency(digest.forecastOverview.pipeline.totalPipelineAmount)}
                  </div>
                </Card.Content>
              </Card>
              <Card>
                <Card.Content className="p-6">
                  <div className="text-sm font-medium text-gray-500">Weighted Pipeline</div>
                  <div className="mt-2 text-2xl font-semibold text-green-600">
                    {formatCurrency(digest.forecastOverview.pipeline.totalWeightedAmount)}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">Based on win probability</div>
                </Card.Content>
              </Card>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-semibold text-gray-900">Top Pipeline Stages</h3>
            <Card>
              <Card.Content className="p-6">
                {digest.forecastOverview.pipeline.buckets.length === 0 ? (
                  <div className="text-sm text-gray-500">No pipeline data available</div>
                ) : (
                  <div className="space-y-3">
                    {digest.forecastOverview.pipeline.buckets.slice(0, 5).map((bucket) => (
                      <div key={bucket.statusKey} className="flex justify-between border-b pb-2 last:border-0">
                        <div>
                          <div className="font-medium text-gray-700">{bucket.statusLabel}</div>
                          <div className="text-xs text-gray-500">
                            {bucket.jobsCount} jobs · {Math.round(bucket.winProbability * 100)}% win rate
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(bucket.weightedAmount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(bucket.totalAmount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        </div>
      </div>

      {/* Job Status Breakdown */}
      <div className="mt-6">
        <h3 className="mb-3 text-lg font-semibold text-gray-900">Job Status Breakdown</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Paid</div>
              <div className="mt-2 text-2xl font-semibold text-green-600">
                {digest.financeArSummary.jobsPaid}
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Partially Paid</div>
              <div className="mt-2 text-2xl font-semibold text-blue-600">
                {digest.financeArSummary.jobsPartiallyPaid}
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Unpaid</div>
              <div className="mt-2 text-2xl font-semibold text-yellow-600">
                {digest.financeArSummary.jobsUnpaid}
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Content className="p-6">
              <div className="text-sm font-medium text-gray-500">Overdue</div>
              <div className="mt-2 text-2xl font-semibold text-red-600">
                {digest.financeArSummary.jobsOverdue}
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}
