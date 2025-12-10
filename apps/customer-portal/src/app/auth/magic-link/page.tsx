'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@greenenergy/ui';
import { resolvePortalSession, PortalAPIError } from '@/lib/api';

function MagicLinkContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('No authentication token provided');
      setIsLoading(false);
      return;
    }

    // Resolve the session token
    resolvePortalSession(token)
      .then((response) => {
        // Store token in sessionStorage for subsequent requests
        sessionStorage.setItem('portal_token', token);

        // Redirect to job page
        router.push(`/jobs/${response.jobId}?token=${token}`);
      })
      .catch((err) => {
        if (err instanceof PortalAPIError) {
          if (err.statusCode === 401) {
            setError(
              'This link is invalid or has expired. Please contact our office for a new link.'
            );
          } else {
            setError(err.message);
          }
        } else {
          setError('An unexpected error occurred. Please try again later.');
        }
        setIsLoading(false);
      });
  }, [searchParams, router]);

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-8">
        <Card>
          <Card.Content className="py-12 text-center">
            <div className="mb-4">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-600"></div>
            </div>
            <h2 className="mb-2 text-xl font-semibold">Verifying your link...</h2>
            <p className="text-gray-600">Please wait while we authenticate your session</p>
          </Card.Content>
        </Card>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-8">
        <Card>
          <Card.Header>
            <Card.Title className="text-red-600">Authentication Failed</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="mb-4 rounded-lg bg-red-50 p-4">
              <p className="text-red-800">{error}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="mb-2 font-semibold text-blue-900">Need help?</h3>
              <p className="mb-2 text-sm text-blue-800">
                If you're having trouble accessing your project portal, please contact our support
                team.
              </p>
              <p className="text-sm text-blue-700">
                <strong>Phone:</strong> (555) 123-4567
                <br />
                <strong>Email:</strong> support@greenenergy.com
              </p>
            </div>
          </Card.Content>
        </Card>
      </main>
    );
  }

  return null;
}

export default function MagicLinkPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-8">
          <Card>
            <Card.Content className="py-12 text-center">
              <div className="mb-4">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-600"></div>
              </div>
              <h2 className="mb-2 text-xl font-semibold">Loading...</h2>
            </Card.Content>
          </Card>
        </main>
      }
    >
      <MagicLinkContent />
    </Suspense>
  );
}
