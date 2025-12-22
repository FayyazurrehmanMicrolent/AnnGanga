import { NextRequest, NextResponse } from 'next/server';
import deliveryOptions, { getDeliveryOptionByType } from '@/lib/delivary';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qType = url.searchParams.get('type');

    if (qType) {
      const found = getDeliveryOptionByType(qType);
      if (!found) {
        return NextResponse.json({ status: 404, message: 'Delivery option not found', data: {} }, { status: 404 });
      }
      return NextResponse.json({ status: 200, message: 'Delivery option fetched', data: found }, { status: 200 });
    }

    return NextResponse.json({ status: 200, message: 'Delivery options fetched', data: deliveryOptions }, { status: 200 });
  } catch (err: any) {
    console.error('GET /api/delivery/options error', err);
    return NextResponse.json({ status: 500, message: err?.message || 'Failed to fetch delivery options', data: {} }, { status: 500 });
  }
}
