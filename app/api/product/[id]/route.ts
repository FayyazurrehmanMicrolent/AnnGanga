import { NextRequest, NextResponse } from 'next/server';
import * as productHandler from '../route';

// Wrapper to allow callers to POST/GET to /api/product/:id
// Forwards request to the main handlers with `?id=` query param preserved.

export async function GET(req: NextRequest, context: any) {
  try {
    console.log('[/api/product/[id]] Processing request...');
    const params = await (context && context.params ? context.params : {});
    const id = params?.id;
    
    console.log('[/api/product/[id]] Request params:', { params, id });
    
    if (!id) {
      console.error('[/api/product/[id]] Error: Product ID is required');
      return NextResponse.json(
        { status: 400, message: 'Product id is required', data: {} }, 
        { status: 400 }
      );
    }

    // Ensure we have a proper URL to work with
    let urlStr = req.url;
    if (!urlStr.startsWith('http')) {
      const host = req.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      urlStr = `${protocol}://${host}${urlStr}`;
    }

    const url = new URL(urlStr);
    const urlBase = url.origin + url.pathname.replace(new RegExp(`/${encodeURIComponent(id)}$`), '');
    const newUrl = `${urlBase}?id=${encodeURIComponent(id)}`;
    
    console.log('[/api/product/[id]] Proxying to:', newUrl);
    
    const proxyReq = new Request(newUrl, {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
    });
    
    // Add a custom header to identify this as a proxied request
    proxyReq.headers.set('x-proxied', 'true');
    
    // Forward the request to the main handler
    return await (productHandler.GET as any)(proxyReq as unknown as NextRequest);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[/api/product/[id]] Error in route handler:', error);
    return NextResponse.json(
      { 
        status: 500, 
        message: 'Internal server error', 
        error: errorMessage
      }, 
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: any) {
  const params = await (context && context.params ? context.params : {});
  const id = params?.id;
  if (!id) return NextResponse.json({ status: 400, message: 'Product id is required', data: {} }, { status: 400 });

  const urlBase = req.url.split('?')[0].replace(new RegExp(`/(${encodeURIComponent(id)})$`), '');
  const newUrl = `${urlBase}?id=${encodeURIComponent(id)}`;

  // Read raw body as arrayBuffer (works for JSON and multipart/form-data)
  const buffer = await req.arrayBuffer();

  const proxyReq = new Request(newUrl, {
    method: req.method,
    headers: req.headers as unknown as Headers,
    body: buffer,
  });

  return await (productHandler.POST as any)(proxyReq as unknown as NextRequest);
}
