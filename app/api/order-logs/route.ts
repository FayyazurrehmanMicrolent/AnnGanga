import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/order';
import OrderLog from '@/models/orderLog';
import { authenticateUser } from '@/lib/middleware';
import { verifyToken } from '@/lib/auth';

function mapLabelToOrderStatus(label: string): string | null {
    if (!label) return null;
    const l = String(label).toLowerCase();
    if (l.includes('placed')) return 'pending';
    if (l.includes('confirmed')) return 'confirmed';
    if (l.includes('packed')) return 'packed';
    if (l.includes('shipped') || l.includes('dispatched')) return 'dispatched';
    if (l.includes('out for') || l.includes('outfor') || l.includes('out_for')) return 'dispatched';
    if (l.includes('delivered')) return 'delivered';
    if (l.includes('cancel')) return 'cancelled';
    return null;
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url);
        const orderId = url.searchParams.get('orderId');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

        if (!orderId) {
            return NextResponse.json({ status: 400, message: 'orderId is required', data: {} }, { status: 400 });
        }

        const logs = await OrderLog.find({ orderId }).sort({ createdAt: 1 }).limit(limit).lean();

        return NextResponse.json({ status: 200, message: 'Logs fetched', data: logs }, { status: 200 });
    } catch (error: any) {
        console.error('GET /api/order-logs error:', error);
        return NextResponse.json({ status: 500, message: error.message || 'Failed to fetch logs', data: {} }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json().catch(() => ({}));
        const { orderId, status } = body;

        if (!orderId) {
            return NextResponse.json({ status: 400, message: 'orderId is required', data: {} }, { status: 400 });
        }

        if (!status) {
            return NextResponse.json({ status: 400, message: 'status is required', data: {} }, { status: 400 });
        }

        // Determine actor (admin vs system) if token present
        let actor = 'system';
        let actorId: string | null = null;
        try {
            let authResult = await authenticateUser(req);
            if (!authResult.authenticated) {
                const token = req.cookies.get('token')?.value;
                if (token) {
                    const decoded = verifyToken(token);
                    if (decoded) {
                        authResult = { authenticated: true, user: decoded, error: null } as any;
                    }
                }
            }

            if (authResult.authenticated && authResult.user) {
                actor = 'admin';
                actorId = authResult.user.userId || authResult.user.user_id || authResult.user.id || String(authResult.user._id || '');
            }
        } catch (e) {
            // ignore and keep actor as system
        }

        const log = new OrderLog({ orderId, status, actor, actorId });
        await log.save();

        // Optionally update Order.orderStatus when label maps to a known status
        const mapped = mapLabelToOrderStatus(status);
        if (mapped) {
            const order = await Order.findOne({ orderId });
            if (order) {
                order.orderStatus = mapped as any;
                await order.save();
            }
        }

        return NextResponse.json({ status: 201, message: 'Log created', data: log }, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/order-logs error:', error);
        return NextResponse.json({ status: 500, message: error.message || 'Failed to create log', data: {} }, { status: 500 });
    }
}
