import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_COUNTRIES } from '@/lib/countries';

// POST removed: this route is GET-only and serves static country data

// GET /api/country  or /api/country?id=<countryId> or /api/country?countryId=<id>
export async function GET(req: NextRequest) {
  try {
    let url: URL;
    try { url = new URL(req.url); } catch (e) { const host = req.headers.get('host') || 'localhost:3000'; url = new URL(req.url, `http://${host}`); }

    const id = url.searchParams.get('id') || url.searchParams.get('countryId');
    if (id) {
      const found = DEFAULT_COUNTRIES.find(c => String(c.id) === String(id));
      if (!found) return NextResponse.json({ status: 404, message: 'Country not found', data: {} }, { status: 404 });
      return NextResponse.json({ status: 200, data: found }, { status: 200 });
    }

    return NextResponse.json({ status: 200, data: DEFAULT_COUNTRIES }, { status: 200 });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: 500, message: 'Failed to fetch countries', error: msg }, { status: 500 });
  }
}
