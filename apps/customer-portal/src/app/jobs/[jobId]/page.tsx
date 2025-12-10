'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, StatusPill, Badge } from '@greenenergy/ui';
import { fetchJobView, PortalAPIError } from '@/lib/api';
import type { PortalJobView, PortalJobPhoto, PortalJobDocument } from '@greenenergy/shared-types';

type TabType = 'status' | 'photos' | 'documents';

export default function JobDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const jobId = params.jobId as string;
  const token =
    searchParams.get('token') ||
    (typeof window !== 'undefined' ? sessionStorage.getItem('portal_token') : null) ||
    '';

  const [jobView, setJobView] = useState<PortalJobView | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('status');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please use the link from your email.');
      setIsLoading(false);
      return;
    }

    fetchJobView(jobId, token)
      .then((data) => {
        setJobView(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err instanceof PortalAPIError) {
          setError(err.message);
        } else {
          setError('Failed to load project details. Please try again later.');
        }
        setIsLoading(false);
      });
  }, [jobId, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-600"></div>
              <p className="text-gray-600">Loading your project...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !jobView) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Card>
            <Card.Content className="py-8 text-center">
              <p className="mb-4 text-red-600">{error || 'Project not found'}</p>
              <p className="text-sm text-gray-600">
                Please contact our office if you need assistance.
              </p>
            </Card.Content>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header customerName={jobView.customerName} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Card className="mb-6">
          <Card.Header>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Card.Title className="text-2xl">Your Solar Installation Project</Card.Title>
                {jobView.propertyAddress && (
                  <p className="mt-1 text-sm text-gray-600">{jobView.propertyAddress}</p>
                )}
              </div>
              <StatusPill status={jobView.currentStatus} />
            </div>
          </Card.Header>
          <Card.Content>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-gray-500">Project Number</p>
                <p className="text-lg font-semibold">{jobView.jobNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Last Updated</p>
                <p className="text-lg font-semibold">
                  {jobView.lastUpdatedAt
                    ? new Date(jobView.lastUpdatedAt).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <TabButton
              label="Status"
              isActive={activeTab === 'status'}
              onClick={() => setActiveTab('status')}
            />
            <TabButton
              label="Photos"
              count={jobView.photos.length}
              isActive={activeTab === 'photos'}
              onClick={() => setActiveTab('photos')}
            />
            <TabButton
              label="Documents"
              count={jobView.documents.length}
              isActive={activeTab === 'documents'}
              onClick={() => setActiveTab('documents')}
            />
          </nav>
        </div>

        {activeTab === 'status' && <StatusTab statusTimeline={jobView.statusTimeline} />}
        {activeTab === 'photos' && <PhotosTab photos={jobView.photos} />}
        {activeTab === 'documents' && <DocumentsTab documents={jobView.documents} />}
      </main>
    </div>
  );
}

function Header({ customerName }: { customerName?: string }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600">
              <span className="text-lg font-bold text-white">GE</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Green Energy</h1>
          </div>
          {customerName && (
            <div className="text-sm text-gray-600">
              <span className="hidden sm:inline">Hello, </span>
              <span className="font-medium text-gray-900">{customerName}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function TabButton({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors
        ${
          isActive
            ? 'border-green-600 text-green-600'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }
      `}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
            isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function StatusTab({ statusTimeline }: { statusTimeline: PortalJobView['statusTimeline'] }) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Project Timeline</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="space-y-6">
          {statusTimeline.map((step, index) => {
            const isCompleted = step.status === 'COMPLETED';
            const isInProgress = step.status === 'IN_PROGRESS';

            return (
              <div key={step.id} className="relative">
                {index < statusTimeline.length - 1 && (
                  <div
                    className={`absolute left-4 top-10 h-full w-0.5 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
                <div className="flex items-start gap-4">
                  <div
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : isInProgress
                          ? 'border-green-500 bg-white text-green-600'
                          : 'border-gray-300 bg-white text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <h3
                      className={`text-lg font-semibold ${
                        isCompleted || isInProgress ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                      {isInProgress && (
                        <Badge className="ml-2 bg-green-100 text-green-700">In Progress</Badge>
                      )}
                    </h3>
                    <p
                      className={`mt-1 text-sm ${
                        isCompleted || isInProgress ? 'text-gray-600' : 'text-gray-400'
                      }`}
                    >
                      {step.description}
                    </p>
                    {step.completedAt && (
                      <p className="mt-1 text-xs text-gray-500">
                        Completed: {new Date(step.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card.Content>
    </Card>
  );
}

function PhotosTab({ photos }: { photos: PortalJobPhoto[] }) {
  const categories: Array<{ key: PortalJobPhoto['category']; label: string }> = [
    { key: 'BEFORE', label: 'Before Installation' },
    { key: 'DURING', label: 'During Installation' },
    { key: 'AFTER', label: 'After Completion' },
  ];

  if (photos.length === 0) {
    return (
      <Card>
        <Card.Content className="py-12 text-center">
          <p className="text-gray-600">No photos have been uploaded yet.</p>
          <p className="mt-2 text-sm text-gray-500">
            Photos will appear here as your installation progresses.
          </p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const categoryPhotos = photos.filter((p) => p.category === category.key);

        if (categoryPhotos.length === 0) return null;

        return (
          <Card key={category.key}>
            <Card.Header>
              <Card.Title>{category.label}</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categoryPhotos.map((photo) => (
                  <div key={photo.id} className="group relative overflow-hidden rounded-lg">
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Project photo'}
                      className="h-64 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <p className="text-sm text-white">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        );
      })}
    </div>
  );
}

function DocumentsTab({ documents }: { documents: PortalJobDocument[] }) {
  if (documents.length === 0) {
    return (
      <Card>
        <Card.Content className="py-12 text-center">
          <p className="text-gray-600">No documents available yet.</p>
          <p className="mt-2 text-sm text-gray-500">
            Your project documents will appear here once they are ready.
          </p>
        </Card.Content>
      </Card>
    );
  }

  const getDocumentIcon = (type: PortalJobDocument['type']) => {
    switch (type) {
      case 'CONTRACT':
        return '📄';
      case 'PERMIT':
        return '📋';
      case 'WARRANTY':
        return '🛡️';
      default:
        return '📎';
    }
  };

  const getDocumentBadgeColor = (type: PortalJobDocument['type']) => {
    switch (type) {
      case 'CONTRACT':
        return 'bg-blue-100 text-blue-700';
      case 'PERMIT':
        return 'bg-yellow-100 text-yellow-700';
      case 'WARRANTY':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>Project Documents</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="divide-y divide-gray-200">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getDocumentIcon(doc.type)}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{doc.name}</h4>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className={getDocumentBadgeColor(doc.type)}>{doc.type}</Badge>
                    {doc.uploadedAt && (
                      <span className="text-xs text-gray-500">
                        Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                View
              </a>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
