/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@greenenergy/ui', '@greenenergy/shared-types'],

  /**
   * Proxy same-origin /api/v1/* calls (from client components) to the deployed Core API.
   *
   * This keeps frontend code simple (it can call /api/v1/...) while still working in
   * hosted environments where the Core API is on a different domain.
   */
  async rewrites() {
    const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

    if (!apiBaseUrl) {
      return [];
    }

    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBaseUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
