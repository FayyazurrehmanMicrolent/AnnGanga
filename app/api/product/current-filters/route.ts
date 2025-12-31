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
      discount: false,
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
    const hasQueryFilter = ['minPrice', 'maxPrice', 'rating', 'page', 'limit', 'categoryId', 'dietary', 'vitamins', 'sortBy', 'discount'].some(k => url.searchParams.has(k));

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
      if (url.searchParams.has('discount')) {
        const d = String(url.searchParams.get('discount') || '').toLowerCase();
        res.discount = d === '1' || d === 'true';
      }

      return NextResponse.json({ status: 200, message: 'Current filters (from query)', data: res }, { status: 200 });
    }

    // If no query params, also accept JSON body with filters (clients may POST/GET a JSON filter object)
    try {
      const maybeBody = await (req.clone ? req.clone().json().catch(() => null) : req.json().catch(() => null));
      if (maybeBody && typeof maybeBody === 'object') {
        const res: any = { ...defaultFilters };
        if (maybeBody.page !== undefined && maybeBody.page !== null) res.page = parseInt(String(maybeBody.page)) || 1;
        if (maybeBody.limit !== undefined && maybeBody.limit !== null) res.limit = parseInt(String(maybeBody.limit)) || 20;
        if (maybeBody.minPrice !== undefined && maybeBody.minPrice !== null) res.minPrice = Number(maybeBody.minPrice) || null;
        if (maybeBody.maxPrice !== undefined && maybeBody.maxPrice !== null) res.maxPrice = Number(maybeBody.maxPrice) || null;
        if (maybeBody.rating !== undefined && maybeBody.rating !== null) res.rating = maybeBody.rating === '' ? null : Number(maybeBody.rating) || null;
        if (maybeBody.categoryId !== undefined && maybeBody.categoryId !== null) res.categoryId = maybeBody.categoryId || null;
        if (maybeBody.dietary !== undefined && maybeBody.dietary !== null) res.dietary = Array.isArray(maybeBody.dietary) ? maybeBody.dietary : String(maybeBody.dietary).split(',').map((s:any)=>s.trim()).filter(Boolean);
        if (maybeBody.vitamins !== undefined && maybeBody.vitamins !== null) res.vitamins = Array.isArray(maybeBody.vitamins) ? maybeBody.vitamins : String(maybeBody.vitamins).split(',').map((s:any)=>s.trim()).filter(Boolean);
        if (maybeBody.sortBy !== undefined && maybeBody.sortBy !== null) res.sortBy = maybeBody.sortBy || null;
        if (maybeBody.discount !== undefined && maybeBody.discount !== null) res.discount = Boolean(maybeBody.discount);

        return NextResponse.json({ status: 200, message: 'Current filters (from body)', data: res }, { status: 200 });
      }
    } catch (e) {
      // ignore body parse errors and fall back to default
    }

    // If body not provided, try cookie fallback (if client previously saved filters)
    try {
      const cookieFilters = parseCookieFilters(req as NextRequest);
      if (cookieFilters && typeof cookieFilters === 'object') {
        // Normalize cookieFilters to default shape
        const res: any = { ...defaultFilters };
        if (cookieFilters.page !== undefined) res.page = Number(cookieFilters.page) || res.page;
        if (cookieFilters.limit !== undefined) res.limit = Number(cookieFilters.limit) || res.limit;
        if (cookieFilters.minPrice !== undefined) res.minPrice = cookieFilters.minPrice !== null ? Number(cookieFilters.minPrice) : null;
        if (cookieFilters.maxPrice !== undefined) res.maxPrice = cookieFilters.maxPrice !== null ? Number(cookieFilters.maxPrice) : null;
        if (cookieFilters.rating !== undefined) res.rating = cookieFilters.rating !== null ? Number(cookieFilters.rating) : null;
        if (cookieFilters.categoryId !== undefined) res.categoryId = cookieFilters.categoryId || null;
        if (cookieFilters.dietary !== undefined) res.dietary = Array.isArray(cookieFilters.dietary) ? cookieFilters.dietary : String(cookieFilters.dietary).split(',').map((s:any)=>s.trim()).filter(Boolean);
        if (cookieFilters.vitamins !== undefined) res.vitamins = Array.isArray(cookieFilters.vitamins) ? cookieFilters.vitamins : String(cookieFilters.vitamins).split(',').map((s:any)=>s.trim()).filter(Boolean);
        if (cookieFilters.sortBy !== undefined) res.sortBy = cookieFilters.sortBy || null;
        if (cookieFilters.discount !== undefined) res.discount = cookieFilters.discount === true || String(cookieFilters.discount) === '1' || String(cookieFilters.discount).toLowerCase() === 'true';

        return NextResponse.json({ status: 200, message: 'Current filters (from cookie)', data: res }, { status: 200 });
      }
    } catch (e) {
      // ignore cookie parse errors
    }

    // No filters supplied
    return NextResponse.json({ status: 200, message: 'No filters set (cookie fallback disabled)', data: defaultFilters }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/product/current-filters error', error);
    return NextResponse.json({ status: 500, message: error.message || 'Failed to get current filters', data: {} }, { status: 500 });
  }
}
