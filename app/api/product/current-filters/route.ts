import { NextRequest, NextResponse } from 'next/server';

function parseCookieFilters(req: NextRequest) {
  try {
    const anyReq: any = req as any;
    if (anyReq.cookies && typeof anyReq.cookies.get === 'function') {
      const c = anyReq.cookies.get('productFilters');
      if (c && c.value) {
        try {
          return JSON.parse(decodeURIComponent(c.value));
        } catch (e) {
          return null;
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    // Default shape
    const defaultFilters = {
      page: 1,
      limit: 20,
      minPrice: null,
      maxPrice: null,
      rating: null,
      categoryId: null,
      dietary: [],
      vitamins: [],
      sortBy: null,
    } as any;

    // Try query params first (explicit overrides)
    let url: URL;
    try {
      url = new URL(req.url);
    } catch (e) {
      const host = req.headers.get('host') || 'localhost:3000';
      url = new URL(req.url, `http://${host}`);
    }

    const qp = Object.fromEntries(url.searchParams.entries());
    const hasQueryFilter = ['minPrice', 'maxPrice', 'rating', 'page', 'limit', 'categoryId', 'dietary', 'vitamins', 'sortBy'].some(k => url.searchParams.has(k));

    if (hasQueryFilter) {
      const res: any = { ...defaultFilters };
      if (url.searchParams.has('page')) res.page = parseInt(url.searchParams.get('page') || '1');
      if (url.searchParams.has('limit')) res.limit = parseInt(url.searchParams.get('limit') || '20');
      if (url.searchParams.has('minPrice')) res.minPrice = Number(url.searchParams.get('minPrice')) || null;
      if (url.searchParams.has('maxPrice')) res.maxPrice = Number(url.searchParams.get('maxPrice')) || null;
      if (url.searchParams.has('rating')) res.rating = Number(url.searchParams.get('rating')) || null;
      if (url.searchParams.has('categoryId')) res.categoryId = url.searchParams.get('categoryId');
      if (url.searchParams.has('dietary')) {
        const d = url.searchParams.get('dietary') || '';
        res.dietary = d ? d.split(',').map(s => s.trim()).filter(Boolean) : [];
      }
      if (url.searchParams.has('vitamins')) {
        const v = url.searchParams.get('vitamins') || '';
        res.vitamins = v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];
      }
      if (url.searchParams.has('sortBy')) res.sortBy = url.searchParams.get('sortBy');

      return NextResponse.json({ status: 200, message: 'Current filters (from query)', data: res }, { status: 200 });
    }

    // Cookie fallback removed: clients should supply filters via query
    // parameters or call POST /api/product?action=filter with a body.
    return NextResponse.json({ status: 200, message: 'No filters set (cookie fallback disabled)', data: defaultFilters }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/product/current-filters error', error);
    return NextResponse.json({ status: 500, message: error.message || 'Failed to get current filters', data: {} }, { status: 500 });
  }
}
