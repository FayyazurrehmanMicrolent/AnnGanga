import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Review from '@/models/review';
import User from '@/models/users';
import Product from '@/models/product';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url);
        const status = url.searchParams.get('status'); // 'pending' | 'approved' | 'rejected' | 'all'
        const productId = url.searchParams.get('productId');
        const userId = url.searchParams.get('userId');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

        const skip = (page - 1) * limit;

        // Build query
        const query: any = { isDeleted: false };

        if (status && status !== 'all') {
            query.status = status;
        }

        if (productId) {
            query.productId = productId;
        }

        if (userId) {
            query.userId = userId;
        }

        // Get total count
        const total = await Review.countDocuments(query);

        // Fetch reviews
        const reviews = await Review.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get user and product details
        const userIds = [...new Set(reviews.map((r) => r.userId))];
        const productIds = [...new Set(reviews.map((r) => r.productId))];

        const [users, products] = await Promise.all([
            User.find({ id: { $in: userIds } }).select('id name email phone').lean(),
            Product.find({ productId: { $in: productIds } }).select('productId title images').lean(),
        ]);

        const userMap = new Map(users.map((u) => [u.id, u]));
        const productMap = new Map(products.map((p) => [p.productId, p]));

        const reviewsWithDetails = reviews.map((review) => {
            const user = userMap.get(review.userId);
            const product = productMap.get(review.productId);
            return {
                ...review,
                userName: user?.name || 'Unknown',
                userEmail: user?.email || null,
                userPhone: user?.phone || null,
                productTitle: product?.title || 'Unknown Product',
                productImage: product?.images?.[0] || null,
            };
        });

        const pages = Math.ceil(total / limit);

        // Get status counts
        const statusCounts = await Review.aggregate([
            { $match: { isDeleted: false } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);

        const counts = { pending: 0, approved: 0, rejected: 0 };
        statusCounts.forEach((item) => {
            counts[item._id as keyof typeof counts] = item.count;
        });

        return NextResponse.json(
            {
                status: 200,
                message: 'Reviews fetched successfully',
                data: {
                    reviews: reviewsWithDetails,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages,
                    },
                    statusCounts: counts,
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/admin/reviews error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to fetch reviews',
                data: {},
            },
            { status: 500 }
        );
    }
}
