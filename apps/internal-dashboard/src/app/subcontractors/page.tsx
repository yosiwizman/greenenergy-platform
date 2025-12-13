'use client';

import { ComingSoon } from '@/components/ComingSoon';

export default function SubcontractorsPage() {
  return (
    <ComingSoon
      title="Subcontractors"
      callouts={[
        'Planned: compliance status, performance scoring, and assignments.',
        'Disabled in staging UI to avoid calling unstable endpoints.',
      ]}
    />
  );
}
