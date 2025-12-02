import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/order';

// This is a placeholder for Payment Gateway integration (e.g., Razorpay, Stripe)
// In a real implementation, you would use the SDK of the chosen provider

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();
        const { action, orderId, paymentId, signature } = body;

        // INITIATE PAYMENT
        if (action === 'initiate') {
            if (!orderId) {
                return NextResponse.json(
                    { status: 400, message: 'Order ID is required', data: {} },
                    { status: 400 }
                );
            }

            const order = await Order.findOne({ orderId });
            if (!order) {
                return NextResponse.json(
                    { status: 404, message: 'Order not found', data: {} },
                    { status: 404 }
                );
            }

            // Mock creating a payment order with provider
            const providerOrderId = `pay_${Math.random().toString(36).substring(7)}`;
            const amount = order.total * 100; // Amount in smallest currency unit (paise)

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Payment initiated',
                    data: {
                        key: 'test_key_id', // Replace with env variable
                        amount,
                        currency: 'INR',
                        name: 'Ann Ganga',
                        description: `Order #${orderId}`,
                        order_id: providerOrderId, // Provider's order ID
                        prefill: {
                            contact: order.deliveryAddress.phone,
                        },
                    },
                },
                { status: 200 }
            );
        }

        // VERIFY PAYMENT (Webhook or Client Callback)
        if (action === 'verify') {
            if (!orderId || !paymentId) {
                return NextResponse.json(
                    { status: 400, message: 'Missing payment details', data: {} },
                    { status: 400 }
                );
            }

            // Verify signature here using provider's secret
            // const isValid = verifySignature(paymentId, signature, secret);
            const isValid = true; // Mock validation

            if (isValid) {
                const order = await Order.findOne({ orderId });
                if (order) {
                    order.paymentStatus = 'completed';
                    order.orderStatus = 'confirmed'; // Auto-confirm on payment
                    await order.save();
                }

                return NextResponse.json(
                    {
                        status: 200,
                        message: 'Payment verified successfully',
                        data: { orderId, status: 'success' },
                    },
                    { status: 200 }
                );
            } else {
                return NextResponse.json(
                    { status: 400, message: 'Payment verification failed', data: {} },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            { status: 400, message: 'Invalid action', data: {} },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('POST /api/payment error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to process payment',
                data: {},
            },
            { status: 500 }
        );
    }
}
