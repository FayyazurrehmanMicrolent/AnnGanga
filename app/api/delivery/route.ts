import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Delivery from '@/models/delivery';
import { v4 as uuidv4 } from 'uuid';
import { deliveryOptions, getDeliveryOptionByType } from '@/lib/delivary';

// POST /api/delivery
// Body: { name: string, userId: string }
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ status: 400, message: 'Invalid JSON body', data: {} }, { status: 400 });

    // Accept multiple shapes:
    // { userID, orderSummaryID, delivery: 'Normal' }
    // { userID, orderSummaryID, delivery: { type, description, price, currency } }
    const userId = body.userID || body.userId || body.user || null;
    const orderSummaryId = body.orderSummaryID || body.orderSummayID || body.orderId || body.order || null;
    let deliveryInput = body.delivery || body.Delivery || body.deliveryType || null;

    if (!userId) return NextResponse.json({ status: 400, message: 'userID is required', data: {} }, { status: 400 });
    if (!deliveryInput) return NextResponse.json({ status: 400, message: 'delivery is required', data: {} }, { status: 400 });

    // If deliveryInput is a string type, look up dummy options
    let chosen: any = null;
    if (typeof deliveryInput === 'string') {
      chosen = getDeliveryOptionByType(deliveryInput) || deliveryOptions.find((d) => d.id === deliveryInput) || null;
      if (!chosen) {
        // allow string to be used as name with fallback price
        chosen = { type: deliveryInput, description: deliveryInput, price: 0, currency: 'INR' };
      }
    } else if (typeof deliveryInput === 'object') {
      // if object provided, normalize fields
      chosen = {
        type: deliveryInput.type || deliveryInput.name || 'Custom',
        description: deliveryInput.description || deliveryInput.name || null,
        price: typeof deliveryInput.price === 'number' ? deliveryInput.price : Number(deliveryInput.price) || 0,
        currency: deliveryInput.currency || 'INR',
      };
    }

    const newDelivery = new Delivery({
      deliveryId: uuidv4(),
      name: chosen.description || chosen.type || 'Delivery',
      userId: String(userId),
      orderId: orderSummaryId || null,
      price: typeof chosen.price === 'number' && !isNaN(chosen.price) ? chosen.price : 0,
      currency: chosen.currency || 'INR',
    });

    await newDelivery.save();

    return NextResponse.json({
      status: 201,
      message: 'Delivery created',
      data: { deliveryId: newDelivery.deliveryId, type: chosen.type, price: newDelivery.price },
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/delivery error', error);
    return NextResponse.json({ status: 500, message: error?.message || 'Failed to create delivery', data: {} }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const deliveryId = url.searchParams.get('deliveryId');
    const userId = url.searchParams.get('userId');

    const filter: any = { isDeleted: false };
    if (deliveryId) filter.deliveryId = deliveryId;
    if (userId) filter.userId = userId;

    const deliveries = await Delivery.find(filter).lean();
    // Strip `status` if present on any existing records and return safe objects
    const deliveriesSafe = Array.isArray(deliveries)
      ? deliveries.map((d: any) => {
          const { status, ...rest } = d || {};
          return rest;
        })
      : [];
    return NextResponse.json({ status: 200, message: 'Deliveries fetched', data: deliveriesSafe }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/delivery error', error);
    return NextResponse.json({ status: 500, message: error?.message || 'Failed to fetch deliveries', data: {} }, { status: 500 });
  }
}

