'use client';

import { ComingSoon } from '@/components/ComingSoon';

export default function MaterialsPage() {
  return (
    <ComingSoon
      title="Materials & ETA"
      callouts={[
        'Planned: material order tracking, ETA risk, and supplier performance.',
        'Disabled in staging UI to avoid calling unstable endpoints.',
      ]}
    />
  );
}
