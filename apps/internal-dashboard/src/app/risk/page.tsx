'use client';

import { ComingSoon } from '@/components/ComingSoon';

export default function RiskOverviewPage() {
  return (
    <ComingSoon
      title="Risk Dashboard"
      callouts={[
        'Planned: job risk snapshots, top issues, and one-click re-evaluation.',
        'Disabled in staging UI to prevent noisy calls while APIs stabilize.',
      ]}
    />
  );
}
