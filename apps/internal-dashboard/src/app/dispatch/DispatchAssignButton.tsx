'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DispatchAssignButtonProps {
  jobId: string;
  subcontractorId: string;
  scheduledDate: string;
}

export function DispatchAssignButton({
  jobId,
  subcontractorId,
  scheduledDate,
}: DispatchAssignButtonProps) {
  const router = useRouter();
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAssign = async () => {
    setIsAssigning(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/v1/dispatch/jobs/${jobId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': '',
        },
        body: JSON.stringify({
          subcontractorId,
          scheduledDate,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to assign subcontractor');
      }

      setSuccess(true);
      
      // Refresh the page data after a short delay
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsAssigning(false);
    }
  };

  if (success) {
    return (
      <span className="text-xs text-green-600 font-medium">
        ✓ Assigned
      </span>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-600">
        <div className="font-medium">Error</div>
        <button
          onClick={() => setError(null)}
          className="text-blue-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleAssign}
      disabled={isAssigning}
      className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {isAssigning ? 'Assigning...' : 'Assign'}
    </button>
  );
}
