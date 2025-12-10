import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Green Energy Customer Portal',
  description: 'Track your solar installation project',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 antialiased">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <h1 className="text-2xl font-bold text-primary-600">Green Energy</h1>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
