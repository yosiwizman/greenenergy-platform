'use client';

import { ComingSoon } from '@/components/ComingSoon';

export default function WarrantyOverviewPage() {
  return (
    <ComingSoon
      title="Warranty"
      callouts={[
        'Planned: warranty rollups, expiring-soon alerts, and claim workflow.',
        'Disabled in staging UI to avoid calling unstable endpoints.',
      ]}
    />
  );
}
