import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/api')) return NextResponse.next();

  const requestOrigin = req.headers.get('origin');

  // Allowed origins can be provided via ALLOWED_ORIGINS (comma-separated)
  // or NEXT_PUBLIC_API_URL. If none provided, middleware will echo the
  // request origin (permissive) which supports localhost, Vercel, etc.
  const rawAllowed = process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_API_URL || '';
  const allowedList = rawAllowed.split(',').map(s => s.trim()).filter(Boolean);
  const allowAllWildcard = allowedList.includes('*');

  let originHeader = '*';
  if (requestOrigin) {
    if (allowAllWildcard) originHeader = requestOrigin;
    else if (allowedList.length === 0) originHeader = requestOrigin; // echo when no list configured
    else if (allowedList.includes(requestOrigin)) originHeader = requestOrigin;
    else originHeader = allowedList[0] || requestOrigin; // fallback to first allowed origin
  }

  const allowCredentials = originHeader !== '*';

  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    res.headers.set('Access-Control-Allow-Origin', originHeader);
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.headers.set('Access-Control-Allow-Credentials', String(allowCredentials));
    return res;
  }

  const res = NextResponse.next();
  res.headers.set('Access-Control-Allow-Origin', originHeader);
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.headers.set('Access-Control-Allow-Credentials', String(allowCredentials));
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
