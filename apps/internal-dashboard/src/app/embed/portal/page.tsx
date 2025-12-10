'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@greenenergy/ui';
import { PortalJobView } from '@greenenergy/shared-types';

function EmbedPortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [portalView, setPortalView] = useState<PortalJobView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      resolveSessionAndFetchPortal();
    } else {
      setError('No token provided');
      setLoading(false);
    }
  }, [token]);

  const resolveSessionAndFetchPortal = async () => {
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

      // Fetch portal view for the job (internal endpoint)
      const portalResponse = await fetch(
        `/api/v1/portal/internal/jobs/${sessionData.jobId}`,
        {
          headers: {
            'x-internal-api-key': process.env.NEXT_PUBLIC_INTERNAL_API_KEY || '',
          },
        }
      );
      if (!portalResponse.ok) {
        throw new Error(`Failed to fetch portal data: ${portalResponse.statusText}`);
      }
      const portalData = await portalResponse.json();
      setPortalView(portalData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
            ✓
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
            ⏳
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
            ⚪
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <Card.Content>
          <div className="py-8 text-center text-gray-500">Loading portal preview...</div>
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

  if (!portalView) {
    return (
      <Card>
        <Card.Content>
          <div className="py-8 text-center text-gray-500">
            No portal data available for this job.
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
          <Card.Title>{portalView.customerName}</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Job Number</p>
              <p className="text-sm font-medium text-gray-900">{portalView.jobNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Property Address</p>
              <p className="text-sm font-medium text-gray-900">{portalView.propertyAddress}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Current Status</p>
              <p className="text-sm font-medium text-gray-900">{portalView.currentStatus}</p>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Status Timeline Card */}
      <Card>
        <Card.Header>
          <Card.Title>Project Status Timeline</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-3">
            {portalView.statusTimeline.map((step) => (
              <div key={step.id} className="flex items-start space-x-3">
                <div className="mt-1">{getStepStatus(step.status)}</div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">{step.label}</h4>
                  <p className="text-xs text-gray-600">{step.description}</p>
                  {step.completedAt && (
                    <p className="mt-1 text-xs text-gray-500">
                      Completed: {new Date(step.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>

      {/* Photos Card */}
      {portalView.photos.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>Project Photos ({portalView.photos.length})</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-2 gap-3">
              {portalView.photos.slice(0, 6).map((photo) => (
                <div key={photo.id} className="space-y-1">
                  <div className="aspect-video overflow-hidden rounded-lg bg-gray-200">
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Project photo'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-gray-600">{photo.category}</p>
                </div>
              ))}
            </div>
            {portalView.photos.length > 6 && (
              <p className="mt-3 text-xs text-gray-500">
                +{portalView.photos.length - 6} more photos
              </p>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Documents Card */}
      {portalView.documents.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>Documents ({portalView.documents.length})</Card.Title>
          </Card.Header>
          <Card.Content>
            <ul className="space-y-2">
              {portalView.documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 p-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-500">{doc.type}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      )}
    </div>
  );
}

export default function EmbedPortalPage() {
  return (
    <Suspense fallback={
      <Card>
        <Card.Content>
          <div className="py-8 text-center text-gray-500">Loading...</div>
        </Card.Content>
      </Card>
    }>
      <EmbedPortalContent />
    </Suspense>
  );
}
