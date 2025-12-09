import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import UserFilter from '@/models/userFilter';
import { authenticateUser } from '@/lib/middleware';

// GET: list saved filters for authenticated user or fetch single by filterId
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const auth = await authenticateUser(req as any);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ status: 401, message: 'Authentication required', data: {} }, { status: 401 });
    }

    const decoded = auth.user as any;
    const userId = decoded.userId || decoded.user_id || decoded.id || decoded.id;

    // parse URL
    let url: URL;
    try {
      url = new URL(req.url);
    } catch (e) {
      const host = req.headers.get('host') || 'localhost:3000';
      url = new URL(req.url, `http://${host}`);
    }

    const filterId = url.searchParams.get('filterId') || url.searchParams.get('id');
    if (filterId) {
      const f = await UserFilter.findOne({ filterId, userId, isDeleted: false }).lean();
      if (!f) return NextResponse.json({ status: 404, message: 'Filter not found', data: {} }, { status: 404 });
      return NextResponse.json({ status: 200, message: 'Filter fetched', data: f }, { status: 200 });
    }

    const items = await UserFilter.find({ userId, isDeleted: false }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ status: 200, message: 'Filters fetched', data: items }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/product/filters error', error);
    return NextResponse.json({ status: 500, message: error.message || 'Failed to fetch filters', data: {} }, { status: 500 });
  }
}

// POST: create or update a filter for the authenticated user
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const auth = await authenticateUser(req as any);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ status: 401, message: 'Authentication required', data: {} }, { status: 401 });
    }
    const decoded = auth.user as any;
    const userId = decoded.userId || decoded.user_id || decoded.id || decoded.id;

    const body = await req.json().catch(() => ({}));
    const filterId = body.filterId || body.id || null;
    const name = body.name || body.title || null;
    const filters = body.filters || body.data || body;

    if (!filters || typeof filters !== 'object') {
      return NextResponse.json({ status: 400, message: 'filters object is required in body', data: {} }, { status: 400 });
    }

    if (filterId) {
      // update existing filter but ensure ownership
      const existing = await UserFilter.findOne({ filterId, userId, isDeleted: false });
      if (!existing) return NextResponse.json({ status: 404, message: 'Filter not found or not owned by user', data: {} }, { status: 404 });
      existing.name = name ?? existing.name;
      existing.filters = filters;
      await existing.save();
      return NextResponse.json({ status: 200, message: 'Filter updated', data: existing }, { status: 200 });
    }

    // create new filter
    const nf = new UserFilter({ userId, name, filters });
    await nf.save();
    return NextResponse.json({ status: 201, message: 'Filter created', data: nf }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/product/filters error', error);
    return NextResponse.json({ status: 500, message: error.message || 'Failed to save filter', data: {} }, { status: 500 });
  }
}

// DELETE: soft-delete a filter owned by the authenticated user
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const auth = await authenticateUser(req as any);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ status: 401, message: 'Authentication required', data: {} }, { status: 401 });
    }
    const decoded = auth.user as any;
    const userId = decoded.userId || decoded.user_id || decoded.id || decoded.id;

    // try query param first
    let filterId: string | null = null;
    try {
      const url = new URL(req.url);
      filterId = url.searchParams.get('filterId') || url.searchParams.get('id');
    } catch (e) {
      // ignore
    }

    // fallback to body
    if (!filterId) {
      const b = await req.json().catch(() => ({}));
      filterId = b.filterId || b.id || null;
    }

    if (!filterId) return NextResponse.json({ status: 400, message: 'filterId is required', data: {} }, { status: 400 });

    const existing = await UserFilter.findOne({ filterId, userId, isDeleted: false });
    if (!existing) return NextResponse.json({ status: 404, message: 'Filter not found or not owned by user', data: {} }, { status: 404 });

    existing.isDeleted = true;
    await existing.save();
    return NextResponse.json({ status: 200, message: 'Filter deleted', data: {} }, { status: 200 });
  } catch (error: any) {
    console.error('DELETE /api/product/filters error', error);
    return NextResponse.json({ status: 500, message: error.message || 'Failed to delete filter', data: {} }, { status: 500 });
  }
}
