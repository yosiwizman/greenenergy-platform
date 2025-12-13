'use client';

import { Card } from '@greenenergy/ui';

export function ComingSoon({
  title,
  description = 'This section is planned but not wired to production APIs yet.',
  callouts,
}: {
  title: string;
  description?: string;
  callouts?: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>

      <Card>
        <Card.Content>
          <div className="flex flex-col gap-3">
            <div className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
              Coming soon
            </div>

            {callouts && callouts.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                {callouts.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}

            <p className="text-sm text-gray-600">
              This page intentionally makes <span className="font-semibold">no</span> failing
              network calls.
            </p>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
