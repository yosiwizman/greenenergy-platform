'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@greenenergy/ui';
import { JobRiskSnapshotDTO } from '@greenenergy/shared-types';

export default function RiskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [risk, setRisk] = useState<JobRiskSnapshotDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    if (jobId) {
      fetchRisk();
    }
  }, [jobId]);

  const fetchRisk = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/risk/jobs/${jobId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No risk snapshot found for this job');
        }
        throw new Error(`Failed to fetch risk: ${response.statusText}`);
      }
      const data = await response.json();
      setRisk(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const evaluateRisk = async () => {
    try {
      setEvaluating(true);
      const response = await fetch(`/api/v1/risk/jobs/${jobId}/evaluate`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to evaluate risk: ${response.statusText}`);
      }
      const data = await response.json();
      setRisk(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setEvaluating(false);
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'HIGH':
        return (
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
            HIGH RISK
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
            MEDIUM RISK
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
            LOW RISK
          </span>
        );
      default:
        return <span className="text-gray-500">-</span>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
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

  const getReasonIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return '🔴';
      case 'MEDIUM':
        return '🟡';
      case 'LOW':
        return '🟢';
      default:
        return '⚪';
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/risk')}
            className="mb-2 text-sm text-blue-600 hover:text-blue-900"
          >
            ← Back to Risk Dashboard
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            Risk Details: {risk?.jobNumber || jobId}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchRisk}
            disabled={loading}
            className="rounded bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            onClick={evaluateRisk}
            disabled={evaluating}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {evaluating ? 'Evaluating...' : 'Run Risk Evaluation'}
          </button>
        </div>
      </div>

      {loading && (
        <Card>
          <Card.Content>
            <div className="py-8 text-center text-gray-500">Loading risk data...</div>
          </Card.Content>
        </Card>
      )}

      {error && (
        <Card>
          <Card.Content>
            <div className="rounded bg-red-50 p-4 text-red-700">Error: {error}</div>
          </Card.Content>
        </Card>
      )}

      {!loading && !error && !risk && (
        <Card>
          <Card.Content>
            <div className="py-8 text-center text-gray-500">
              No risk data available for this job. Click "Run Risk Evaluation" to evaluate.
            </div>
          </Card.Content>
        </Card>
      )}

      {!loading && !error && risk && (
        <div className="space-y-6">
          {/* Job Header Card */}
          <Card>
            <Card.Content>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {risk.customerName || 'Unknown Customer'}
                  </h3>
                  <p className="text-sm text-gray-500">Status: {risk.currentStatus || '-'}</p>
                </div>
                <div>{getRiskBadge(risk.riskLevel)}</div>
              </div>
            </Card.Content>
          </Card>

          {/* Risk Summary Card */}
          <Card>
            <Card.Content>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Risk Summary</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="mt-1 text-base font-medium text-gray-900">
                    {risk.lastUpdatedAt ? new Date(risk.lastUpdatedAt).toLocaleString() : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Risk Computed At</p>
                  <p className="mt-1 text-base font-medium text-gray-900">
                    {new Date(risk.riskComputedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Issues Found</p>
                  <p className="mt-1 text-base font-medium text-gray-900">{risk.reasons.length}</p>
                </div>
              </div>

              {risk.reasons.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700">Main Issues:</p>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {risk.reasons.map((reason, index) => (
                      <li key={index} className="text-sm text-gray-700">
                        {reason.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Risk Reasons Card */}
          {risk.reasons.length > 0 && (
            <Card>
              <Card.Content>
                <h3 className="mb-4 text-lg font-semibold text-gray-900">
                  Risk Reasons ({risk.reasons.length})
                </h3>
                <div className="space-y-4">
                  {risk.reasons.map((reason, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <span className="text-2xl">{getReasonIcon(reason.severity)}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">{reason.label}</h4>
                          {getSeverityBadge(reason.severity)}
                        </div>
                        {reason.description && (
                          <p className="mt-1 text-sm text-gray-600">{reason.description}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Code: {reason.code}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          )}

          {/* Actions & Links Card */}
          <Card>
            <Card.Content>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Actions & Links</h3>
              <div className="space-y-2">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Internal Links:</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a
                      href={`/qc/${risk.jobId}`}
                      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      View QC Details
                    </a>
                    <a
                      href={`/jobs/${risk.jobId}`}
                      className="rounded bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                    >
                      View Job Details
                    </a>
                  </div>
                </div>
                {risk.jobNimbusUrl && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700">External Links:</h4>
                    <div className="mt-2">
                      <a
                        href={risk.jobNimbusUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        Open in JobNimbus
                        <svg
                          className="ml-2 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        </div>
      )}
    </div>
  );
}
