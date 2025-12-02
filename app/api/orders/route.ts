import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/order';
import { authenticateUser } from '@/lib/middleware';
import { verifyToken } from '@/lib/auth';
import User from '@/models/users';
import Role from '@/models/roles';

// Helper: find order by orderId or _id
async function findOrderByIdSafe(id: string) {
    if (!id) return null;
    let order = await Order.findOne({ orderId: id });
    if (order) return order;
    try {
        order = await Order.findOne({ _id: id });
        return order;
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url);
        const userId = url.searchParams.get('userId');
        const orderId = url.searchParams.get('orderId');
        const status = url.searchParams.get('status');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

        // Get single order by ID
        if (orderId) {
            const order = await findOrderByIdSafe(orderId);
            if (!order || order.isDeleted) {
                return NextResponse.json(
                    { status: 404, message: 'Order not found', data: {} },
                    { status: 404 }
                );
            }

            // If userId provided, verify ownership
            if (userId && order.userId !== userId) {
                return NextResponse.json(
                    { status: 403, message: 'Access denied', data: {} },
                    { status: 403 }
                );
            }

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Order fetched successfully',
                    data: order,
                },
                { status: 200 }
            );
        }

        // List orders
        if (!userId) {
            return NextResponse.json(
                { status: 400, message: 'User ID is required', data: {} },
                { status: 400 }
            );
        }

        const skip = (page - 1) * limit;

        // Build query
        const query: any = { userId, isDeleted: false };

        if (status) {
            query.orderStatus = status;
        }

        // Get total count
        const total = await Order.countDocuments(query);

        // Fetch orders
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const pages = Math.ceil(total / limit);

        return NextResponse.json(
            {
                status: 200,
                message: 'Orders fetched successfully',
                data: {
                    orders,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages,
                    },
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/orders error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to fetch orders',
                data: {},
            },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url);
        const actionQuery = url.searchParams.get('action');

        const body = await req.json().catch(() => ({}));
        const action = (body.action || actionQuery || '').toLowerCase();
        const data = body.data || body;

        // CANCEL ORDER
        if (action === 'cancel') {
            const { orderId, userId, reason } = data;

            if (!orderId) {
                return NextResponse.json(
                    { status: 400, message: 'Order ID is required', data: {} },
                    { status: 400 }
                );
            }

            const order = await findOrderByIdSafe(String(orderId));
            if (!order || order.isDeleted) {
                return NextResponse.json(
                    { status: 404, message: 'Order not found', data: {} },
                    { status: 404 }
                );
            }

            // Verify ownership if userId provided
            if (userId && order.userId !== userId) {
                return NextResponse.json(
                    { status: 403, message: 'Access denied', data: {} },
                    { status: 403 }
                );
            }

            // Check if order can be cancelled
            if (['dispatched', 'delivered', 'cancelled'].includes(order.orderStatus)) {
                return NextResponse.json(
                    { status: 400, message: `Order cannot be cancelled (status: ${order.orderStatus})`, data: {} },
                    { status: 400 }
                );
            }

            order.orderStatus = 'cancelled';
            order.cancelReason = reason ? String(reason).trim() : 'Cancelled by user';
            await order.save();

            // TODO: Process refund if payment was completed
            // TODO: Send notification

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Order cancelled successfully',
                    data: { orderId: order.orderId, status: order.orderStatus },
                },
                { status: 200 }
            );
        }

        // UPDATE ORDER STATUS (Admin)
        if (action === 'updatestatus') {
            const { orderId, status, trackingId, trackingUrl, deliveryPartnerId } = data;

            if (!orderId) {
                return NextResponse.json(
                    { status: 400, message: 'Order ID is required', data: {} },
                    { status: 400 }
                );
            }

            if (!status) {
                return NextResponse.json(
                    { status: 400, message: 'Status is required', data: {} },
                    { status: 400 }
                );
            }

            const validStatuses = ['pending', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return NextResponse.json(
                    { status: 400, message: 'Invalid status', data: {} },
                    { status: 400 }
                );
            }

            // Authenticate and require admin role
            let authResult = await authenticateUser(req);
            if (!authResult.authenticated) {
                try {
                    const token = req.cookies.get('token')?.value;
                    if (token) {
                        const decoded = verifyToken(token);
                        if (decoded) {
                            authResult = { authenticated: true, user: decoded, error: null } as any;
                        }
                    }
                } catch (e) {
                    // ignore
                }
            }

            if (!authResult.authenticated || !authResult.user) {
                return NextResponse.json(
                    { status: 401, message: 'Authentication required to update order status', data: {} },
                    { status: 401 }
                );
            }

            const tokenUserId = authResult.user.userId || authResult.user.user_id || authResult.user.id;

            if (!tokenUserId) {
                return NextResponse.json(
                    { status: 401, message: 'User id not found in token.', data: {} },
                    { status: 401 }
                );
            }

            // Find user document (try id, then _id)
            let user = await User.findOne({ id: tokenUserId, isDeleted: false });
            if (!user) {
                try {
                    user = await User.findOne({ _id: tokenUserId, isDeleted: false } as any);
                } catch (e) {
                    user = null as any;
                }
            }

            if (!user) {
                return NextResponse.json(
                    { status: 404, message: 'User not found', data: {} },
                    { status: 404 }
                );
            }

            const role = await Role.findOne({ roleId: user.roleId, isRoleActive: true });
            if (!role || String(role.role || '').toLowerCase() !== 'admin') {
                return NextResponse.json(
                    { status: 403, message: 'Admin privileges required to update order status', data: {} },
                    { status: 403 }
                );
            }

            const order = await findOrderByIdSafe(String(orderId));
            if (!order || order.isDeleted) {
                return NextResponse.json(
                    { status: 404, message: 'Order not found', data: {} },
                    { status: 404 }
                );
            }

            order.orderStatus = status;
            if (trackingId) order.trackingId = String(trackingId);
            if (trackingUrl) order.trackingUrl = String(trackingUrl);
            if (deliveryPartnerId) order.deliveryPartnerId = String(deliveryPartnerId);

            await order.save();

            // TODO: Send notification about status change

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Order status updated successfully',
                    data: { orderId: order.orderId, status: order.orderStatus },
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { status: 400, message: 'Invalid action', data: {} },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('POST /api/orders error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to process order action',
                data: {},
            },
            { status: 500 }
        );
    }
}
