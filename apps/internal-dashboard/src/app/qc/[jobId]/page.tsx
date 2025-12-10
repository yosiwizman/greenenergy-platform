'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@greenenergy/ui';
import { QCCheckResult } from '@greenenergy/shared-types';

export default function QCDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [qcResult, setQcResult] = useState<QCCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    if (jobId) {
      fetchQCResult();
    }
  }, [jobId]);

  const fetchQCResult = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/qc/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch QC result: ${response.statusText}`);
      }
      const data = await response.json();
      setQcResult(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const evaluateQC = async () => {
    try {
      setEvaluating(true);
      const response = await fetch(`/api/v1/qc/jobs/${jobId}/evaluate`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to evaluate QC: ${response.statusText}`);
      }
      const data = await response.json();
      setQcResult(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setEvaluating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
            PASS
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
            FAIL
          </span>
        );
      case 'NOT_CHECKED':
        return (
          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-800">
            NOT CHECKED
          </span>
        );
      default:
        return <span className="text-gray-500">-</span>;
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/qc')}
            className="mb-2 text-sm text-blue-600 hover:text-blue-900"
          >
            ← Back to QC Overview
          </button>
          <h2 className="text-2xl font-bold text-gray-900">QC Details: {jobId}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchQCResult}
            disabled={loading}
            className="rounded bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            onClick={evaluateQC}
            disabled={evaluating}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {evaluating ? 'Evaluating...' : 'Run QC Evaluation'}
          </button>
        </div>
      </div>

      {loading && (
        <Card>
          <Card.Content>
            <div className="py-8 text-center text-gray-500">Loading QC data...</div>
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

      {!loading && !error && !qcResult && (
        <Card>
          <Card.Content>
            <div className="py-8 text-center text-gray-500">
              No QC data available for this job. Click "Run QC Evaluation" to evaluate.
            </div>
          </Card.Content>
        </Card>
      )}

      {!loading && !error && qcResult && (
        <div className="space-y-6">
          {/* QC Summary Card */}
          <Card>
            <Card.Content>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">QC Summary</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-1">{getStatusBadge(qcResult.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Checked At</p>
                  <p className="mt-1 text-base font-medium text-gray-900">
                    {new Date(qcResult.checkedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Photos</p>
                  <p className="mt-1 text-base font-medium text-gray-900">
                    {(qcResult.totalPhotosByCategory.BEFORE || 0) +
                      (qcResult.totalPhotosByCategory.DURING || 0) +
                      (qcResult.totalPhotosByCategory.AFTER || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Synced to JobNimbus</p>
                  <p className="mt-1 text-base font-medium text-gray-900">
                    {qcResult.jobNimbusSyncedAt
                      ? new Date(qcResult.jobNimbusSyncedAt).toLocaleString()
                      : 'Not synced'}
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Photo Counts Card */}
          <Card>
            <Card.Content>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Photo Counts by Category</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">BEFORE</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {qcResult.totalPhotosByCategory.BEFORE || 0}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Required: 5</p>
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">DURING</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {qcResult.totalPhotosByCategory.DURING || 0}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Required: 5</p>
                </div>
                <div className="rounded border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">AFTER</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {qcResult.totalPhotosByCategory.AFTER || 0}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Required: 5</p>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Missing Categories Card (only shown if QC failed) */}
          {qcResult.status === 'FAIL' &&
            qcResult.missingCategories &&
            qcResult.missingCategories.length > 0 && (
              <Card>
                <Card.Content>
                  <h3 className="mb-4 text-lg font-semibold text-red-700">
                    Missing Photo Requirements
                  </h3>
                  <ul className="space-y-2">
                    {qcResult.missingCategories.map((missing, index) => (
                      <li key={index} className="rounded bg-red-50 p-3 text-sm text-red-700">
                        <strong>{missing.category}</strong>: Need {missing.requiredCount} photos,
                        have {missing.actualCount}
                        {missing.requiredCount - missing.actualCount > 0 &&
                          ` (missing ${missing.requiredCount - missing.actualCount})`}
                      </li>
                    ))}
                  </ul>
                </Card.Content>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}
