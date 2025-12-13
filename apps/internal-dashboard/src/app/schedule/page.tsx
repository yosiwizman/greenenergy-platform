'use client';

import { ComingSoon } from '@/components/ComingSoon';

export default function SchedulingPage() {
  return (
    <ComingSoon
      title="Scheduling"
      callouts={[
        'Planned: scheduling risk dashboard, blocked reasons, and recommended actions.',
        'Disabled in staging UI to avoid calling unstable endpoints.',
      ]}
    />
  );
}
