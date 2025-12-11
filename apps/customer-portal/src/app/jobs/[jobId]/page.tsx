'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, StatusPill, Badge } from '@greenenergy/ui';
import { fetchJobView, fetchJobMessages, PortalAPIError } from '@/lib/api';
import type {
  PortalJobView,
  PortalJobPhoto,
  PortalJobDocument,
  CustomerMessageDTO,
} from '@greenenergy/shared-types';

type TabType = 'status' | 'photos' | 'documents' | 'messages';

export default function JobDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const jobId = params.jobId as string;
  const token =
    searchParams.get('token') ||
    (typeof window !== 'undefined' ? sessionStorage.getItem('portal_token') : null) ||
    '';

  const [jobView, setJobView] = useState<PortalJobView | null>(null);
  const [messages, setMessages] = useState<CustomerMessageDTO[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('status');
  const [isLoading, setIsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please use the link from your email.');
      setIsLoading(false);
      return;
    }

    Promise.all([
      fetchJobView(jobId, token),
      fetchJobMessages(jobId, token),
    ])
      .then(([jobData, messagesData]) => {
        setJobView(jobData);
        setMessages(messagesData);
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
            <TabButton
              label="Messages"
              count={messages.length}
              isActive={activeTab === 'messages'}
              onClick={() => setActiveTab('messages')}
            />
          </nav>
        </div>

        {activeTab === 'status' && <StatusTab statusTimeline={jobView.statusTimeline} />}
        {activeTab === 'photos' && <PhotosTab photos={jobView.photos} />}
        {activeTab === 'documents' && (
          <DocumentsTab
            documents={jobView.documents}
            warranty={jobView.warranty}
            jobId={jobId}
            token={token}
          />
        )}
        {activeTab === 'messages' && <MessagesTab messages={messages} />}
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

function DocumentsTab({
  documents,
  warranty,
  jobId,
  token,
}: {
  documents: PortalJobDocument[];
  warranty?: PortalJobView['warranty'];
  jobId: string;
  token: string;
}) {
  return (
    <div className="space-y-6">
      <WarrantyCard warranty={warranty} />
      <ServiceRequestForm jobId={jobId} token={token} />
      <DocumentsList documents={documents} />
    </div>
  );
}

function WarrantyCard({ warranty }: { warranty?: PortalJobView['warranty'] }) {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700';
      case 'PENDING_ACTIVATION':
        return 'bg-yellow-100 text-yellow-700';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-700';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!warranty) {
    return (
      <Card>
        <Card.Header>
          <Card.Title>Warranty Information</Card.Title>
        </Card.Header>
        <Card.Content>
          <p className="text-gray-600">
            Warranty information will appear here after your project is completed.
          </p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <Card.Title>Warranty Information</Card.Title>
          <Badge className={getStatusBadgeClass(warranty.status)}>{warranty.status}</Badge>
        </div>
      </Card.Header>
      <Card.Content>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Type</p>
              <p className="text-lg font-semibold">{warranty.type}</p>
            </div>
            {warranty.provider && (
              <div>
                <p className="text-sm font-medium text-gray-500">Provider</p>
                <p className="text-lg font-semibold">{warranty.provider}</p>
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Start Date</p>
              <p className="text-base">{formatDate(warranty.startDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">End Date</p>
              <p className="text-base">{formatDate(warranty.endDate)}</p>
            </div>
          </div>
          {warranty.coverageSummary && (
            <div>
              <p className="text-sm font-medium text-gray-500">Coverage</p>
              <p className="text-sm text-gray-700">{warranty.coverageSummary}</p>
            </div>
          )}
          {warranty.documentUrl && (
            <div className="pt-2">
              <a
                href={warranty.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                📄 Download Warranty Document
              </a>
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}

function ServiceRequestForm({ jobId, token }: { jobId: string; token: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSubmitStatus('idle');

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';
      const response = await fetch(
        `${API_BASE_URL}/portal/jobs/${jobId}/warranty-claims?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title, description }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to submit request' }));
        throw new Error(error.message || 'Failed to submit request');
      }

      setTitle('');
      setDescription('');
      setSubmitStatus('success');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Something went wrong. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>Request Service</Card.Title>
      </Card.Header>
      <Card.Content>
        <p className="mb-4 text-sm text-gray-600">
          If you're experiencing an issue with your system, you can request service here. Our team
          will review and follow up.
        </p>
        {/* TODO: Add support for photo/file uploads for claims */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Issue Summary <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., System not producing power"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe the issue in detail..."
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
              disabled={isSubmitting}
              required
            />
          </div>

          {errorMessage && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          )}

          {submitStatus === 'success' && (
            <div className="rounded-md bg-green-50 p-3">
              <p className="text-sm text-green-600">
                ✓ Your request has been received. Our team will review it and follow up.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:bg-gray-400 sm:w-auto"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </Card.Content>
    </Card>
  );
}

function DocumentsList({ documents }: { documents: PortalJobDocument[] }) {
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

function MessagesTab({ messages }: { messages: CustomerMessageDTO[] }) {
  const getTypeBadge = (type: CustomerMessageDTO['type']) => {
    switch (type) {
      case 'STATUS_UPDATE':
        return <Badge className="bg-blue-100 text-blue-700">Status Update</Badge>;
      case 'ETA_UPDATE':
        return <Badge className="bg-purple-100 text-purple-700">ETA Update</Badge>;
      case 'GENERIC':
        return <Badge className="bg-gray-100 text-gray-700">Message</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Message</Badge>;
    }
  };

  const getSourceLabel = (source: CustomerMessageDTO['source']) => {
    if (source === 'AI_SUGGESTED') {
      return (
        <span className="text-xs text-gray-500 italic">✨ AI-assisted</span>
      );
    }
    return null;
  };

  if (messages.length === 0) {
    return (
      <Card>
        <Card.Content className="py-12 text-center">
          <p className="text-gray-600">No updates yet.</p>
          <p className="mt-2 text-sm text-gray-500">
            You'll see status and ETA updates here as your project progresses.
          </p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title>Messages & Updates</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div key={message.id} className="relative">
              {index < messages.length - 1 && (
                <div
                  className="absolute left-4 top-12 h-full w-0.5 bg-gray-200"
                />
              )}
              <div className="flex gap-4">
                <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {getTypeBadge(message.type)}
                    {getSourceLabel(message.source)}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {message.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                    {message.body}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {new Date(message.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
