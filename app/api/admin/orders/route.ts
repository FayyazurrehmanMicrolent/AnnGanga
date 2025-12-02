import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/order';
import User from '@/models/users';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url);
        const status = url.searchParams.get('status');
        const userId = url.searchParams.get('userId');
        const productId = url.searchParams.get('productId');
        const fromDate = url.searchParams.get('fromDate');
        const toDate = url.searchParams.get('toDate');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

        const skip = (page - 1) * limit;

        // Build query
        const query: any = { isDeleted: false };

        if (status) {
            query.orderStatus = status;
        }

        if (userId) {
            query.userId = userId;
        }

        if (productId) {
            query['items.productId'] = productId;
        }

        if (fromDate || toDate) {
            query.createdAt = {};
            if (fromDate) {
                query.createdAt.$gte = new Date(fromDate);
            }
            if (toDate) {
                query.createdAt.$lte = new Date(toDate);
            }
        }

        // Get total count
        const total = await Order.countDocuments(query);

        // Fetch orders
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get user details
        const userIds = [...new Set(orders.map((o) => o.userId))];
        const users = await User.find({ id: { $in: userIds } })
            .select('id name email phone')
            .lean();

        const userMap = new Map(users.map((u) => [u.id, u]));

        const ordersWithUsers = orders.map((order) => {
            const user = userMap.get(order.userId);
            return {
                ...order,
                userName: user?.name || 'Unknown',
                userEmail: user?.email || null,
                userPhone: user?.phone || null,
            };
        });

        const pages = Math.ceil(total / limit);

        // Get status counts
        const statusCounts = await Order.aggregate([
            { $match: { isDeleted: false } },
            {
                $group: {
                    _id: '$orderStatus',
                    count: { $sum: 1 },
                },
            },
        ]);

        const counts: any = {
            pending: 0,
            confirmed: 0,
            packed: 0,
            dispatched: 0,
            delivered: 0,
            cancelled: 0,
        };
        statusCounts.forEach((item) => {
            counts[item._id] = item.count;
        });

        // Calculate total revenue
        const revenueData = await Order.aggregate([
            { $match: { isDeleted: false, paymentStatus: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    totalOrders: { $sum: 1 },
                },
            },
        ]);

        const stats = {
            totalRevenue: revenueData[0]?.totalRevenue || 0,
            totalOrders: revenueData[0]?.totalOrders || 0,
            statusCounts: counts,
        };

        return NextResponse.json(
            {
                status: 200,
                message: 'Orders fetched successfully',
                data: {
                    orders: ordersWithUsers,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages,
                    },
                    stats,
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/admin/orders error:', error);
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
