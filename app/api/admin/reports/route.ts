import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/order';
import User from '@/models/users';
import Product from '@/models/product';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url);
        const type = url.searchParams.get('type') || 'dashboard'; // dashboard, sales, products, customers
        const fromDate = url.searchParams.get('fromDate');
        const toDate = url.searchParams.get('toDate');

        const dateQuery: any = {};
        if (fromDate || toDate) {
            dateQuery.createdAt = {};
            if (fromDate) dateQuery.createdAt.$gte = new Date(fromDate);
            if (toDate) dateQuery.createdAt.$lte = new Date(toDate);
        }

        // DASHBOARD OVERVIEW
        if (type === 'dashboard') {
            const [
                totalOrders,
                totalRevenue,
                totalUsers,
                totalProducts,
                recentOrders,
                lowStockProducts,
            ] = await Promise.all([
                Order.countDocuments({ isDeleted: false }),
                Order.aggregate([
                    { $match: { isDeleted: false, paymentStatus: 'completed' } },
                    { $group: { _id: null, total: { $sum: '$total' } } },
                ]),
                User.countDocuments({ isDeleted: false }),
                Product.countDocuments({ isDeleted: false }),
                Order.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(5).lean(),
                Product.find({ isDeleted: false, stock: { $lt: 10 } }).limit(5).lean(),
            ]);

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Dashboard data fetched',
                    data: {
                        totalOrders,
                        totalRevenue: totalRevenue[0]?.total || 0,
                        totalUsers,
                        totalProducts,
                        recentOrders,
                        lowStockProducts,
                    },
                },
                { status: 200 }
            );
        }

        // SALES REPORT
        if (type === 'sales') {
            const salesData = await Order.aggregate([
                { $match: { isDeleted: false, paymentStatus: 'completed', ...dateQuery } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        revenue: { $sum: '$total' },
                        orders: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]);

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Sales report fetched',
                    data: salesData,
                },
                { status: 200 }
            );
        }

        // PRODUCT PERFORMANCE
        if (type === 'products') {
            const productPerformance = await Order.aggregate([
                { $match: { isDeleted: false, ...dateQuery } },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.productId',
                        productName: { $first: '$items.productName' },
                        totalSold: { $sum: '$items.quantity' },
                        revenue: { $sum: '$items.total' },
                    },
                },
                { $sort: { totalSold: -1 } },
                { $limit: 20 },
            ]);

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Product performance report fetched',
                    data: productPerformance,
                },
                { status: 200 }
            );
        }

        // CUSTOMER ANALYTICS
        if (type === 'customers') {
            const customerStats = await Order.aggregate([
                { $match: { isDeleted: false, ...dateQuery } },
                {
                    $group: {
                        _id: '$userId',
                        totalOrders: { $sum: 1 },
                        totalSpent: { $sum: '$total' },
                        lastOrder: { $max: '$createdAt' },
                    },
                },
                { $sort: { totalSpent: -1 } },
                { $limit: 20 },
            ]);

            // Enrich with user names
            const userIds = customerStats.map((c) => c._id);
            const users = await User.find({ id: { $in: userIds } }).select('id name email').lean();
            const userMap = new Map(users.map((u) => [u.id, u]));

            const enrichedStats = customerStats.map((stat) => {
                const user = userMap.get(stat._id);
                return {
                    ...stat,
                    name: user?.name || 'Unknown',
                    email: user?.email || 'Unknown',
                };
            });

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Customer analytics fetched',
                    data: enrichedStats,
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { status: 400, message: 'Invalid report type', data: {} },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('GET /api/admin/reports error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to fetch reports',
                data: {},
            },
            { status: 500 }
        );
    }
}
