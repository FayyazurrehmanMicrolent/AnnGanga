import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/users';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
        const search = url.searchParams.get('search');
        const status = url.searchParams.get('status'); // 'active' | 'blocked' | 'all'
        const sortBy = url.searchParams.get('sortBy') || 'createdAt';
        const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 1 : -1;

        const skip = (page - 1) * limit;

        // Build query
        const query: any = { isDeleted: false };

        // Filter by status
        if (status === 'active') {
            query.isBlocked = false;
            query.isActive = true;
        } else if (status === 'blocked') {
            query.isBlocked = true;
        }

        // Search by name, email, or phone
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        // Get total count
        const total = await User.countDocuments(query);

        // Build sort object
        const sort: any = {};
        if (sortBy === 'name') {
            sort.name = sortOrder;
        } else if (sortBy === 'createdAt') {
            sort.createdAt = sortOrder;
        } else {
            sort.createdAt = -1; // default
        }

        // Fetch users
        const users = await User.find(query)
            .select('-__v')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();

        // TODO: Add order stats aggregation when Order model is created
        // For now, return users with placeholder stats
        const usersWithStats = users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            isActive: user.isActive,
            isBlocked: user.isBlocked,
            blockedAt: user.blockedAt,
            blockedReason: user.blockedReason,
            createdAt: user.createdAt,
            totalOrders: 0, // TODO: Calculate from Orders
            totalSpent: 0, // TODO: Calculate from Orders
        }));

        const pages = Math.ceil(total / limit);

        return NextResponse.json(
            {
                status: 200,
                message: 'Users fetched successfully',
                data: {
                    users: usersWithStats,
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
        console.error('GET /api/admin/users error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to fetch users',
                data: {},
            },
            { status: 500 }
        );
    }
}
