import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    path?: string[];
  };
};

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function getCoreApiBaseUrl(): string | null {
  const direct = process.env.CORE_API_BASE_URL?.trim();
  if (direct) return stripTrailingSlash(direct);

  // Backwards-compatible fallback for existing staging env vars.
  // Historically, the dashboard used NEXT_PUBLIC_API_BASE_URL that included `/api/v1`.
  const legacy = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!legacy) return null;

  return stripTrailingSlash(legacy).replace(/\/api\/v1$/, '');
}

function getInternalApiKey(): string | null {
  const direct = process.env.INTERNAL_API_KEY?.trim();
  if (direct) return direct;

  // Backwards-compatible fallback for existing staging env vars.
  const legacy = process.env.NEXT_PUBLIC_INTERNAL_API_KEY?.trim();
  if (legacy) return legacy;

  return null;
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status }
  );
}

async function proxy(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const coreApiBaseUrl = getCoreApiBaseUrl();
  const internalApiKey = getInternalApiKey();

  if (!coreApiBaseUrl) {
    return jsonError(500, 'CONFIG_ERROR', 'CORE_API_BASE_URL is not configured');
  }

  if (!internalApiKey) {
    return jsonError(500, 'CONFIG_ERROR', 'INTERNAL_API_KEY is not configured');
  }

  const rawPath = params.path ?? [];
  const safePath = rawPath.map((segment) => encodeURIComponent(segment)).join('/');

  const upstreamUrl = new URL(`${coreApiBaseUrl}/api/v1/${safePath}`);
  upstreamUrl.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();

    // Do not forward hop-by-hop headers.
    if (lower === 'host' || lower === 'connection' || lower === 'content-length') {
      return;
    }

    // Prevent client-side spoofing of internal auth.
    if (lower === 'x-internal-api-key') {
      return;
    }

    headers.set(key, value);
  });

  headers.set('x-internal-api-key', internalApiKey);

  try {
    const method = request.method.toUpperCase();

    const init: RequestInit & { cache?: RequestCache } = {
      method,
      headers,
      redirect: 'manual',
      cache: 'no-store',
    };

    if (method !== 'GET' && method !== 'HEAD') {
      const body = await request.arrayBuffer();
      init.body = body.byteLength ? body : undefined;
    }

    const upstreamResponse = await fetch(upstreamUrl, init);

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set('cache-control', 'no-store');

    // Ensure we never leak internal auth back to the client.
    responseHeaders.delete('x-internal-api-key');

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch {
    return jsonError(502, 'UPSTREAM_ERROR', 'Failed to reach Core API');
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}
