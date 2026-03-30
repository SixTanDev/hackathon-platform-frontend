import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'https://apisamp.gruslin.tech';

async function proxyRequest(req: NextRequest) {
  const url = new URL(req.url);
  // Extract the path after /api/proxy/
  const proxyPath = url.pathname.replace(/^\/api\/proxy/, '');
  const targetUrl = `${API_BACKEND_URL}/api/v1${proxyPath}${url.search}`;

  // Forward relevant headers
  const headers: Record<string, string> = {
    'Content-Type': req.headers.get('content-type') || 'application/json',
  };

  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;

  const contextToken = req.headers.get('x-context-token');
  if (contextToken) headers['X-Context-Token'] = contextToken;

  const zoneId = req.headers.get('x-zone-id');
  if (zoneId) headers['X-Zone-Id'] = zoneId;

  const accept = req.headers.get('accept');
  if (accept) headers['Accept'] = accept;

  try {
    const body = req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.text()
      : undefined;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const responseBody = await response.text();

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[API Proxy Error]', error?.message ?? error);
    return NextResponse.json(
      { detail: 'Error connecting to backend API', error_code: 'PROXY_ERROR' },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest) { return proxyRequest(req); }
export async function POST(req: NextRequest) { return proxyRequest(req); }
export async function PUT(req: NextRequest) { return proxyRequest(req); }
export async function PATCH(req: NextRequest) { return proxyRequest(req); }
export async function DELETE(req: NextRequest) { return proxyRequest(req); }
