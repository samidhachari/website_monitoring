import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Only apply CORS handling for API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    // For preflight requests, return early with the proper headers
    if (req.method === 'OPTIONS') {
      const resp = new NextResponse(null, { status: 204 });
      resp.headers.set('Access-Control-Allow-Origin', '*');
      resp.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      resp.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return resp;
    }

    const res = NextResponse.next();
    // Allow all origins for now; consider restricting to your Vercel origin in production
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
