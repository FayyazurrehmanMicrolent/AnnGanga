import { NextRequest, NextResponse } from 'next/server';
import * as bannerHandler from '../route';

// Wrapper to allow callers to POST/GET to /api/banner/:id
// Forwards request to the main handlers with `?id=` query param preserved and
// forces `action=edit` for POST requests so the main handler treats it as an update.

export async function GET(req: NextRequest, context: any) {
    const params = await (context && context.params ? context.params : {});
    const id = params?.id;
    if (!id) return NextResponse.json({ status: 400, message: 'Banner id is required', data: {} }, { status: 400 });

    const urlBase = req.url.split('?')[0].replace(new RegExp(`/(${encodeURIComponent(id)})$`), '');
    const newUrl = `${urlBase}?id=${encodeURIComponent(id)}`;
    const proxyReq = new Request(newUrl, {
        method: req.method,
        headers: req.headers as unknown as Headers,
    });
    return await (bannerHandler.GET as any)(proxyReq as unknown as NextRequest);
}

export async function POST(req: NextRequest, context: any) {
    const params = await (context && context.params ? context.params : {});
    const id = params?.id;
    if (!id) return NextResponse.json({ status: 400, message: 'Banner id is required', data: {} }, { status: 400 });

    const urlBase = req.url.split('?')[0].replace(new RegExp(`/(${encodeURIComponent(id)})$`), '');
    const newUrl = `${urlBase}?id=${encodeURIComponent(id)}&action=edit`;

    // Read raw body as arrayBuffer (works for JSON and multipart/form-data)
    const buffer = await req.arrayBuffer();

    const proxyReq = new Request(newUrl, {
        method: req.method,
        headers: req.headers as unknown as Headers,
        body: buffer,
    });

    return await (bannerHandler.POST as any)(proxyReq as unknown as NextRequest);
}

