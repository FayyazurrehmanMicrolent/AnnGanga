import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SelectedCoupon from '@/models/selectedCoupon';

async function getUrl(req: NextRequest) {
  try {
    return new URL(req.url);
  } catch (e) {
    const host = req.headers.get('host') || 'localhost:3000';
    return new URL(req.url, `http://${host}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const userId = (body.userId || body.userid || body.user || '').toString();
    const couponCode = (body.couponCode || body.code || body.coupon || '').toString();

    if (!userId) {
      return NextResponse.json({ status: 400, message: 'userId is required', data: {} }, { status: 400 });
    }
    if (!couponCode) {
      return NextResponse.json({ status: 400, message: 'couponCode is required', data: {} }, { status: 400 });
    }

    // Upsert: one selected coupon per user
    const updated = await SelectedCoupon.findOneAndUpdate(
      { userId },
      { userId, couponCode },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ status: 200, message: 'Coupon selected', data: updated }, { status: 200 });
  } catch (error: any) {
    console.error('POST /api/coupons/select error:', error);
    return NextResponse.json({ status: 500, message: error.message || 'Failed to select coupon', data: {} }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const url = await getUrl(req);
    const userId = url.searchParams.get('userId');
    const couponCode = url.searchParams.get('couponCode') || url.searchParams.get('code');

    if (!userId && !couponCode) {
      return NextResponse.json({ status: 400, message: 'Provide userId or couponCode as query param', data: {} }, { status: 400 });
    }

    const query: any = {};
    if (userId) query.userId = userId;
    if (couponCode) query.couponCode = couponCode;

    // If userId provided, return single record; otherwise return array
    if (userId) {
      const doc = await SelectedCoupon.findOne(query).lean();
      return NextResponse.json({ status: 200, message: 'Selected coupon fetched', data: doc || null }, { status: 200 });
    }

    const docs = await SelectedCoupon.find(query).lean();
    return NextResponse.json({ status: 200, message: 'Selected coupons fetched', data: docs }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/coupons/select error:', error);
    return NextResponse.json({ status: 500, message: error.message || 'Failed to fetch selected coupon', data: {} }, { status: 500 });
  }
}
