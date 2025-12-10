'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@greenenergy/ui';
import { JobRiskSnapshotDTO } from '@greenenergy/shared-types';

function EmbedRiskContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [risk, setRisk] = useState<JobRiskSnapshotDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      resolveSessionAndFetchRisk();
    } else {
      setError('No token provided');
      setLoading(false);
    }
  }, [token]);

  const resolveSessionAndFetchRisk = async () => {
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

      // Fetch risk data for the job
      const riskResponse = await fetch(`/api/v1/risk/jobs/${sessionData.jobId}`);
      if (!riskResponse.ok) {
        if (riskResponse.status === 404) {
          throw new Error('No risk snapshot found for this job');
        }
        throw new Error(`Failed to fetch risk data: ${riskResponse.statusText}`);
      }
      const riskData = await riskResponse.json();
      setRisk(riskData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <Card>
        <Card.Content>
          <div className="py-8 text-center text-gray-500">Loading risk data...</div>
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

  if (!risk) {
    return (
      <Card>
        <Card.Content>
          <div className="py-8 text-center text-gray-500">
            No risk data available for this job.
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Job Header Card */}
      <Card>
        <Card.Header>
          <Card.Title>{risk.customerName || 'Unknown Customer'}</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Status: {risk.currentStatus || '-'}</p>
            {getRiskBadge(risk.riskLevel)}
          </div>
        </Card.Content>
      </Card>

      {/* Risk Summary Card */}
      <Card>
        <Card.Header>
          <Card.Title>Risk Summary</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Risk Computed At</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {new Date(risk.riskComputedAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Issues Found</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{risk.reasons.length}</p>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Risk Reasons Card */}
      {risk.reasons.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>Risk Reasons ({risk.reasons.length})</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3">
              {risk.reasons.map((reason, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <span className="text-xl">{getReasonIcon(reason.severity)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">{reason.label}</h4>
                      {getSeverityBadge(reason.severity)}
                    </div>
                    {reason.description && (
                      <p className="mt-1 text-xs text-gray-600">{reason.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}

export default function EmbedRiskPage() {
  return (
    <Suspense fallback={
      <Card>
        <Card.Content>
          <div className="py-8 text-center text-gray-500">Loading...</div>
        </Card.Content>
      </Card>
    }>
      <EmbedRiskContent />
    </Suspense>
  );
}
