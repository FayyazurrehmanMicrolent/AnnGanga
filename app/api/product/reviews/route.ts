import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Review from '@/models/review';
import Product from '@/models/product';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url);
        const userId = url.searchParams.get('userId');
        const status = url.searchParams.get('status');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

        if (!userId) {
            return NextResponse.json(
                { status: 400, message: 'User ID is required', data: {} },
                { status: 400 }
            );
        }

        const skip = (page - 1) * limit;

        // Build query
        const query: any = { userId, isDeleted: false };

        if (status && status !== 'all') {
            query.status = status;
        }

        // Get total count
        const total = await Review.countDocuments(query);

        // Fetch reviews
        const reviews = await Review.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get product details for each review
        const productIds = [...new Set(reviews.map((r) => r.productId))];
        const products = await Product.find({ productId: { $in: productIds } })
            .select('productId title images')
            .lean();

        const productMap = new Map(products.map((p) => [p.productId, p]));

        const reviewsWithProducts = reviews.map((review) => {
            const product = productMap.get(review.productId);
            return {
                ...review,
                productTitle: product?.title || 'Unknown Product',
                productImage: product?.images?.[0] || null,
            };
        });

        const pages = Math.ceil(total / limit);

        return NextResponse.json(
            {
                status: 200,
                message: 'Reviews fetched successfully',
                data: {
                    reviews: reviewsWithProducts,
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
        console.error('GET /api/product/reviews error:', error);
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
