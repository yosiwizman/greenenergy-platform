'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@greenenergy/ui';
import Link from 'next/link';
import type { SafetyIncidentDTO, SafetyIncidentStatus } from '@greenenergy/shared-types';

export default function SafetyIncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params.id as string;

  const [incident, setIncident] = useState<SafetyIncidentDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (incidentId) {
      fetchIncident();
    }
  }, [incidentId]);

  const fetchIncident = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/safety/incidents/${incidentId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch incident: ${response.statusText}`);
      }
      const data = await response.json();
      setIncident(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: SafetyIncidentStatus) => {
    if (!incident) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/v1/safety/incidents/${incidentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.statusText}`);
      }

      await fetchIncident();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white">
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
            LOW
          </span>
        );
      default:
        return <span className="text-gray-500">-</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
            OPEN
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
            UNDER REVIEW
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-800">
            CLOSED
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
          <div className="py-8 text-center text-gray-500">Loading incident details...</div>
        </Card.Content>
      </Card>
    );
  }

  if (error || !incident) {
    return (
      <Card>
        <Card.Content>
          <div className="rounded bg-red-50 p-4 text-red-700">
            Error: {error || 'Incident not found'}
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
          onClick={() => router.push('/safety')}
          className="mb-2 text-sm text-blue-600 hover:text-blue-900"
        >
          ← Back to Safety
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {incident.type.replace(/_/g, ' ')} Incident
            </h2>
            <p className="text-sm text-gray-500">
              Occurred on {new Date(incident.occurredAt).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            {getSeverityBadge(incident.severity)}
            {getStatusBadge(incident.status)}
          </div>
        </div>
      </div>

      {/* Incident Details Card */}
      <Card>
        <Card.Header>
          <Card.Title>Incident Details</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="mt-1 text-base font-medium text-gray-900">
                {incident.type.replace(/_/g, ' ')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Severity</p>
              <p className="mt-1">{getSeverityBadge(incident.severity)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="mt-1">{getStatusBadge(incident.status)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Reported By</p>
              <p className="mt-1 text-base font-medium text-gray-900">
                {incident.reportedBy || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Occurred At</p>
              <p className="mt-1 text-base font-medium text-gray-900">
                {new Date(incident.occurredAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Reported At</p>
              <p className="mt-1 text-base font-medium text-gray-900">
                {new Date(incident.reportedAt).toLocaleString()}
              </p>
            </div>
            {incident.location && (
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="mt-1 text-base font-medium text-gray-900">{incident.location}</p>
              </div>
            )}
            {(incident.latitude || incident.longitude) && (
              <div>
                <p className="text-sm text-gray-500">GPS Coordinates</p>
                <p className="mt-1 text-base font-medium text-gray-900">
                  {incident.latitude?.toFixed(6)}, {incident.longitude?.toFixed(6)}
                </p>
              </div>
            )}
            {incident.lostTimeDays !== undefined && incident.lostTimeDays !== null && (
              <div>
                <p className="text-sm text-gray-500">Lost Time Days</p>
                <p className="mt-1 text-base font-medium text-gray-900">
                  {incident.lostTimeDays} days
                </p>
              </div>
            )}
            {incident.medicalTreatmentRequired !== undefined && (
              <div>
                <p className="text-sm text-gray-500">Medical Treatment Required</p>
                <p className="mt-1 text-base font-medium text-gray-900">
                  {incident.medicalTreatmentRequired ? 'Yes' : 'No'}
                </p>
              </div>
            )}
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Description</p>
              <p className="mt-1 text-base text-gray-900">{incident.description}</p>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Photos Card */}
      {incident.photos && incident.photos.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>Photos ({incident.photos.length})</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {incident.photos.map((photo) => (
                <div key={photo.id} className="rounded border border-gray-200 p-2">
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Incident photo'}
                    className="h-48 w-full rounded object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage unavailable%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  {photo.caption && (
                    <p className="mt-2 text-sm text-gray-600">{photo.caption}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(photo.uploadedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Relationships Card */}
      <Card>
        <Card.Header>
          <Card.Title>Related Records</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            {incident.jobId && (
              <div>
                <p className="text-sm text-gray-500">Job</p>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="text-base font-medium text-gray-900">
                    {incident.jobNumber || incident.jobId.substring(0, 8)}
                  </span>
                  <Link
                    href={`/risk/${incident.jobId}`}
                    className="text-sm text-blue-600 hover:text-blue-900"
                  >
                    View Job Risk
                  </Link>
                </div>
              </div>
            )}
            {incident.subcontractorId && (
              <div>
                <p className="text-sm text-gray-500">Subcontractor</p>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="text-base font-medium text-gray-900">
                    {incident.subcontractorName || incident.subcontractorId.substring(0, 8)}
                  </span>
                  <Link
                    href={`/subcontractors/${incident.subcontractorId}`}
                    className="text-sm text-blue-600 hover:text-blue-900"
                  >
                    View Subcontractor
                  </Link>
                </div>
              </div>
            )}
            {!incident.jobId && !incident.subcontractorId && (
              <p className="text-sm text-gray-500">No related records</p>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Status Update Card */}
      <Card>
        <Card.Header>
          <Card.Title>Update Status</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusUpdate('OPEN')}
              disabled={updating || incident.status === 'OPEN'}
              className="rounded bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Mark as Open'}
            </button>
            <button
              onClick={() => handleStatusUpdate('UNDER_REVIEW')}
              disabled={updating || incident.status === 'UNDER_REVIEW'}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Mark as Under Review'}
            </button>
            <button
              onClick={() => handleStatusUpdate('CLOSED')}
              disabled={updating || incident.status === 'CLOSED'}
              className="rounded bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Mark as Closed'}
            </button>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
