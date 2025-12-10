'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@greenenergy/ui';
import { QCCheckResult } from '@greenenergy/shared-types';

function EmbedQCContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [qcResult, setQcResult] = useState<QCCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      resolveSessionAndFetchQC();
    } else {
      setError('No token provided');
      setLoading(false);
    }
  }, [token]);

  const resolveSessionAndFetchQC = async () => {
    try {
      setLoading(true);

      // Resolve embed session token
      const sessionResponse = await fetch(
        `/api/v1/embed/session/resolve?token=${encodeURIComponent(token!)}`
      );
      if (!sessionResponse.ok) {
        throw new Error('Invalid or expired embed token');
      }
      const sessionData = await sessionResponse.json();

      // Fetch QC data for the job
      const qcResponse = await fetch(`/api/v1/qc/jobs/${sessionData.jobId}`);
      if (!qcResponse.ok) {
        throw new Error(`Failed to fetch QC data: ${qcResponse.statusText}`);
      }
      const qcData = await qcResponse.json();
      setQcResult(qcData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <Card>
        <Card.Content>
          <div className="py-8 text-center text-gray-500">Loading QC data...</div>
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Content>
          <div className="rounded bg-red-50 p-4 text-red-700">Error: {error}</div>
        </Card.Content>
      </Card>
    );
  }

  if (!qcResult) {
    return (
      <Card>
        <Card.Content>
          <div className="py-8 text-center text-gray-500">
            No QC data available for this job.
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* QC Summary Card */}
      <Card>
        <Card.Header>
          <Card.Title>QC Summary</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div className="mt-1">{getStatusBadge(qcResult.status)}</div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Checked At</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {new Date(qcResult.checkedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Photo Counts Card */}
      <Card>
        <Card.Header>
          <Card.Title>Photo Counts by Category</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">BEFORE</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {qcResult.totalPhotosByCategory.BEFORE || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500">Required: 5</p>
            </div>
            <div className="rounded border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">DURING</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {qcResult.totalPhotosByCategory.DURING || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500">Required: 5</p>
            </div>
            <div className="rounded border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">AFTER</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {qcResult.totalPhotosByCategory.AFTER || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500">Required: 5</p>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Missing Categories (if QC failed) */}
      {qcResult.status === 'FAIL' &&
        qcResult.missingCategories &&
        qcResult.missingCategories.length > 0 && (
          <Card>
            <Card.Header>
              <Card.Title className="text-red-700">Missing Photo Requirements</Card.Title>
            </Card.Header>
            <Card.Content>
              <ul className="space-y-2">
                {qcResult.missingCategories.map((missing, index) => (
                  <li key={index} className="rounded bg-red-50 p-3 text-sm text-red-700">
                    <strong>{missing.category}</strong>: Need {missing.requiredCount} photos, have{' '}
                    {missing.actualCount}
                  </li>
                ))}
              </ul>
            </Card.Content>
          </Card>
        )}
    </div>
  );
}

export default function EmbedQCPage() {
  return (
    <Suspense fallback={
      <Card>
        <Card.Content>
          <div className="py-8 text-center text-gray-500">Loading...</div>
        </Card.Content>
      </Card>
    }>
      <EmbedQCContent />
    </Suspense>
  );
}
