'use client';

import { useParams } from 'next/navigation';
import { ComingSoon } from '@/components/ComingSoon';

export default function RiskDetailPage() {
  const params = useParams();
  const jobId = (params.jobId as string | undefined) ?? null;

  return (
    <ComingSoon
      title="Risk Details"
      description="This job-level view is planned, but not wired in staging UI yet."
      callouts={jobId ? [`Job ID: ${jobId}`] : undefined}
    />
  );
}
