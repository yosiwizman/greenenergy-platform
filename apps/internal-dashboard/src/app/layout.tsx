import type { Metadata } from 'next';
import { LayoutShell } from '@greenenergy/ui';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Green Energy Internal Dashboard',
  description: 'Operations and project management dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const navigation = [
    { name: 'Command Center', href: '/command-center' },
    { name: 'Jobs', href: '/jobs' },
    { name: 'QC Panel', href: '/qc' },
    { name: 'Risk Dashboard', href: '/risk' },
    { name: 'Subcontractors', href: '/subcontractors' },
    { name: 'Safety', href: '/safety' },
    { name: 'Warranty', href: '/warranty' },
    { name: 'Materials', href: '/materials' },
    { name: 'Schedule', href: '/schedule' },
    { name: 'AI Assistant', href: '/ai-ops' },
    { name: 'Profit', href: '/profit' },
    { name: 'Workflows', href: '/workflows' },
    { name: 'Home', href: '/' },
  ];

  return (
    <html lang="en">
      <body className="antialiased">
        <LayoutShell
          header={
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-primary-600">Green Energy Ops</h1>
              <div className="text-sm text-gray-600">Internal Dashboard</div>
            </div>
          }
          sidebar={
            <nav className="flex flex-col gap-1 p-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          }
        >
          {children}
        </LayoutShell>
      </body>
    </html>
  );
}
