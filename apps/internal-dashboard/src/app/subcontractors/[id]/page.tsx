'use client';

import { useParams } from 'next/navigation';
import { ComingSoon } from '@/components/ComingSoon';

export default function SubcontractorDetailPage() {
  const params = useParams();
  const id = (params.id as string | undefined) ?? null;

  return (
    <ComingSoon
      title="Subcontractor Details"
      description="This view is planned, but not wired in staging UI yet."
      callouts={id ? [`Subcontractor ID: ${id}`] : undefined}
    />
  );
}
