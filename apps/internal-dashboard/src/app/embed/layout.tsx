import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Green Energy - Embedded Panel',
  description: 'Embedded panel for JobNimbus integration',
};

/**
 * Minimal layout for embedded panels
 * No header, sidebar, or navigation - just the content
 * Designed to be iframe-friendly
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-white">
        <div className="min-h-screen p-4">{children}</div>
      </body>
    </html>
  );
}
