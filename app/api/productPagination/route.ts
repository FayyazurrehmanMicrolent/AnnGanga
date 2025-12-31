import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Product from '@/models/product';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url, `http://${req.headers.get('host') || 'localhost:3000'}`);
        const categoryId = url.searchParams.get('categoryId') || url.searchParams.get('category');
        const sortParam = url.searchParams.get('sort'); // '1' => high->low, '0' => low->high
        const pageParam = url.searchParams.get('page') || url.searchParams.get('pageNo') || '1';
        const limitParam = url.searchParams.get('limit') || url.searchParams.get('pageSize') || '20';

        const page = Math.max(1, Number(pageParam) || 1);
        const limit = Math.min(100, Math.max(1, Number(limitParam) || 20));

        const filter: any = { isDeleted: false };
        if (categoryId) filter.categoryId = categoryId;

        // determine sort
        let sort: any = { createdAt: -1 };
        if (typeof sortParam === 'string') {
            if (sortParam === '1' || sortParam.toLowerCase() === 'desc' || sortParam.toLowerCase() === 'high') {
                sort = { actualPrice: -1 };
            } else if (sortParam === '0' || sortParam.toLowerCase() === 'asc' || sortParam.toLowerCase() === 'low') {
                sort = { actualPrice: 1 };
            }
        }

        const total = await Product.countDocuments(filter);
        const totalPages = Math.max(1, Math.ceil(total / limit));

        const items = await Product.find(filter)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        return NextResponse.json(
            {
                status: 200,
                message: 'Products fetched',
                data: {
                    'all product': items,
                    total,
                    page,
                    limit,
                    totalPages
                }
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/productPagination error', error);
        return NextResponse.json(
            { status: 500, message: error?.message || 'Failed to fetch products', data: {} },
            { status: 500 }
        );
    }
}
