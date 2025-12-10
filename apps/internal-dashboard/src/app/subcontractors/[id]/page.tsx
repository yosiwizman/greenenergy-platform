'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@greenenergy/ui';
import type {
  SubcontractorDTO,
  SubcontractorComplianceStatus,
  SubcontractorPerformanceSummary,
  JobSubcontractorAssignmentDTO,
} from '@greenenergy/shared-types';

export default function SubcontractorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subcontractorId = params.id as string;

  const [subcontractor, setSubcontractor] = useState<SubcontractorDTO | null>(null);
  const [compliance, setCompliance] = useState<SubcontractorComplianceStatus | null>(null);
  const [performance, setPerformance] = useState<SubcontractorPerformanceSummary | null>(null);
  const [assignments, setAssignments] = useState<JobSubcontractorAssignmentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    if (subcontractorId) {
      fetchAllData();
    }
  }, [subcontractorId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchSubcontractor(),
        fetchCompliance(),
        fetchPerformance(),
        fetchAssignments(),
      ]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcontractor = async () => {
    const response = await fetch(`/api/v1/subcontractors/${subcontractorId}`);
    if (!response.ok) throw new Error('Failed to fetch subcontractor');
    const data = await response.json();
    setSubcontractor(data);
  };

  const fetchCompliance = async () => {
    const response = await fetch(`/api/v1/subcontractors/${subcontractorId}/compliance`);
    if (!response.ok) throw new Error('Failed to fetch compliance');
    const data = await response.json();
    setCompliance(data);
  };

  const fetchPerformance = async () => {
    const response = await fetch(`/api/v1/subcontractors/${subcontractorId}/performance`);
    if (!response.ok) throw new Error('Failed to fetch performance');
    const data = await response.json();
    setPerformance(data);
  };

  const fetchAssignments = async () => {
    // Fetch all jobs and filter by subcontractor (temporary solution)
    // In production, you'd have a dedicated endpoint
    try {
      const response = await fetch(`/api/v1/jobs`);
      if (response.ok) {
        const jobs = await response.json();
        // For now, we'll just show empty assignments
        // This would be populated by a proper endpoint
        setAssignments([]);
      }
    } catch (err) {
      console.error('Failed to fetch job assignments:', err);
      setAssignments([]);
    }
  };

  const handleEvaluatePerformance = async () => {
    try {
      setEvaluating(true);
      const response = await fetch(
        `/api/v1/subcontractors/${subcontractorId}/performance/evaluate`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error('Failed to evaluate performance');
      await fetchPerformance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate performance');
    } finally {
      setEvaluating(false);
    }
  };

  const getPerformanceBadge = (status?: string) => {
    switch (status) {
      case 'GREEN':
        return (
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
            GREEN
          </span>
        );
      case 'YELLOW':
        return (
          <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
            YELLOW
          </span>
        );
      case 'RED':
        return (
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
            RED
          </span>
        );
      default:
        return <span className="text-gray-500">Not Rated</span>;
    }
  };

  const getComplianceBadge = (isCompliant?: boolean) => {
    if (isCompliant) {
      return (
        <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
          Compliant
        </span>
      );
    }
    return (
      <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
        Non-Compliant
      </span>
    );
  };

  if (loading) {
    return (
      <Card>
        <Card.Content>
          <div className="py-8 text-center text-gray-500">Loading subcontractor details...</div>
        </Card.Content>
      </Card>
    );
  }

  if (error || !subcontractor) {
    return (
      <Card>
        <Card.Content>
          <div className="rounded bg-red-50 p-4 text-red-700">
            Error: {error || 'Subcontractor not found'}
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/subcontractors')}
          className="mb-2 text-sm text-blue-600 hover:text-blue-900"
        >
          ← Back to Subcontractors
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{subcontractor.name}</h2>
            {subcontractor.legalName && (
              <p className="text-sm text-gray-500">{subcontractor.legalName}</p>
            )}
          </div>
          <div className="flex gap-2">
            {getPerformanceBadge(subcontractor.performanceStatus)}
            {getComplianceBadge(compliance?.isCompliant)}
          </div>
        </div>
      </div>

      {/* Basic Info Card */}
      <Card>
        <Card.Header>
          <Card.Title>Contact Information</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Primary Contact</p>
              <p className="mt-1 text-base font-medium text-gray-900">
                {subcontractor.primaryContact || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="mt-1 text-base font-medium text-gray-900">
                {subcontractor.phone || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="mt-1 text-base font-medium text-gray-900">
                {subcontractor.email || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Crew Size</p>
              <p className="mt-1 text-base font-medium text-gray-900">
                {subcontractor.crewSize || '-'}
              </p>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Compliance Card */}
      <div className="mt-6">
        <Card>
          <Card.Header>
            <Card.Title>Compliance Status</Card.Title>
          </Card.Header>
          <Card.Content>
            {compliance ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700">License</p>
                    <p className="mt-1 text-base text-gray-900">
                      {subcontractor.licenseNumber || 'Not provided'}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {subcontractor.licenseExpiresAt
                        ? `Expires: ${new Date(subcontractor.licenseExpiresAt).toLocaleDateString()}`
                        : 'No expiration date'}
                    </p>
                    <p className="mt-2">
                      {compliance.hasValidLicense ? (
                        <span className="text-sm font-semibold text-green-600">✓ Valid</span>
                      ) : (
                        <span className="text-sm font-semibold text-red-600">✗ Invalid/Expired</span>
                      )}
                    </p>
                  </div>

                  <div className="rounded border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700">Insurance</p>
                    <p className="mt-1 text-base text-gray-900">
                      {subcontractor.insurancePolicyNumber || 'Not provided'}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {subcontractor.insuranceExpiresAt
                        ? `Expires: ${new Date(subcontractor.insuranceExpiresAt).toLocaleDateString()}`
                        : 'No expiration date'}
                    </p>
                    <p className="mt-2">
                      {compliance.hasValidInsurance ? (
                        <span className="text-sm font-semibold text-green-600">✓ Valid</span>
                      ) : (
                        <span className="text-sm font-semibold text-red-600">✗ Invalid/Expired</span>
                      )}
                    </p>
                  </div>

                  <div className="rounded border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700">W9</p>
                    <p className="mt-2">
                      {compliance.hasW9 ? (
                        <span className="text-sm font-semibold text-green-600">✓ Received</span>
                      ) : (
                        <span className="text-sm font-semibold text-red-600">✗ Missing</span>
                      )}
                    </p>
                  </div>

                  <div className="rounded border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700">COI (Certificate of Insurance)</p>
                    <p className="mt-2">
                      {compliance.hasCOI ? (
                        <span className="text-sm font-semibold text-green-600">✓ Received</span>
                      ) : (
                        <span className="text-sm font-semibold text-red-600">✗ Missing</span>
                      )}
                    </p>
                  </div>
                </div>

                {compliance.missingItems && compliance.missingItems.length > 0 && (
                  <div className="rounded bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800">Missing/Expired Items:</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {compliance.missingItems.map((item, index) => (
                        <li key={index} className="text-sm text-red-700">
                          {item.replace(/_/g, ' ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No compliance data available</p>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Performance Card */}
      <div className="mt-6">
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <Card.Title>Performance Summary</Card.Title>
              <button
                onClick={handleEvaluatePerformance}
                disabled={evaluating}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {evaluating ? 'Evaluating...' : 'Re-evaluate'}
              </button>
            </div>
          </Card.Header>
          <Card.Content>
            {performance ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Score</p>
                    <p className="mt-1 text-3xl font-bold text-gray-900">
                      {performance.score}/100
                    </p>
                  </div>
                  <div>{getPerformanceBadge(performance.status)}</div>
                </div>

                {performance.factors && performance.factors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Performance Factors:</p>
                    <div className="mt-2 space-y-2">
                      {performance.factors.map((factor, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 p-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{factor.label}</p>
                            <p className="text-xs text-gray-500">
                              Weight: -{factor.weight} points each
                            </p>
                          </div>
                          <span
                            className={`text-sm font-semibold ${
                              factor.impact === 'NEGATIVE' ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {factor.impact === 'NEGATIVE' ? '-' : '+'}
                            {factor.value * factor.weight}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  Last evaluated: {new Date(performance.evaluatedAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">No performance data available</p>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Jobs Card */}
      <div className="mt-6">
        <Card>
          <Card.Header>
            <Card.Title>Assigned Jobs</Card.Title>
          </Card.Header>
          <Card.Content>
            {assignments.length === 0 ? (
              <p className="text-gray-500">No active job assignments</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between rounded border border-gray-200 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Job {assignment.jobId}
                      </p>
                      {assignment.role && (
                        <p className="text-xs text-gray-500">Role: {assignment.role}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {assignment.isPrimary && (
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                          Primary
                        </span>
                      )}
                      <button
                        onClick={() => router.push(`/jobs/${assignment.jobId}`)}
                        className="text-sm text-blue-600 hover:text-blue-900"
                      >
                        View Job
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
