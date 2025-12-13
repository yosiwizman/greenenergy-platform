'use client';

import { ComingSoon } from '@/components/ComingSoon';

export default function SafetyOverviewPage() {
  return (
    <ComingSoon
      title="Safety & Incidents"
      callouts={[
        'Planned: incident rollups, severity trends, and required follow-ups.',
        'Disabled in staging UI to avoid calling unstable endpoints.',
      ]}
    />
  );
}
