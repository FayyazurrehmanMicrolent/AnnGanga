import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Reward from '@/models/reward';
import User from '@/models/users';
import { adjustRewardBalance } from '@/lib/rewards';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
        const skip = (page - 1) * limit;

        // Get total count
        const total = await Reward.countDocuments({});

        // Fetch rewards with user info
        const rewards = await Reward.find({})
            .sort({ balance: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get user details for each reward
        const userIds = rewards.map((r) => r.userId);
        const users = await User.find({ id: { $in: userIds } })
            .select('id name email phone')
            .lean();

        const userMap = new Map(users.map((u) => [u.id, u]));

        const rewardsWithUsers = rewards.map((reward) => {
            const user = userMap.get(reward.userId);
            return {
                rewardId: reward.rewardId,
                userId: reward.userId,
                userName: user?.name || 'Unknown',
                userEmail: user?.email || null,
                userPhone: user?.phone || null,
                balance: reward.balance,
                lifetimeEarned: reward.lifetimeEarned,
                lifetimeRedeemed: reward.lifetimeRedeemed,
                isActive: reward.isActive,
                createdAt: reward.createdAt,
            };
        });

        const pages = Math.ceil(total / limit);

        return NextResponse.json(
            {
                status: 200,
                message: 'User rewards fetched successfully',
                data: {
                    rewards: rewardsWithUsers,
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
        console.error('GET /api/admin/rewards/users error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to fetch user rewards',
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

        // ADJUST USER BALANCE
        if (action === 'adjust') {
            const { userId, amount, reason } = data;

            if (!userId) {
                return NextResponse.json(
                    { status: 400, message: 'User ID is required', data: {} },
                    { status: 400 }
                );
            }

            if (amount === undefined || amount === 0) {
                return NextResponse.json(
                    { status: 400, message: 'Valid amount is required (positive to add, negative to deduct)', data: {} },
                    { status: 400 }
                );
            }

            if (!reason || !String(reason).trim()) {
                return NextResponse.json(
                    { status: 400, message: 'Reason is required for balance adjustment', data: {} },
                    { status: 400 }
                );
            }

            await adjustRewardBalance(userId, Number(amount), String(reason).trim());

            // Get updated reward
            const reward = await Reward.findOne({ userId }).lean() as { balance: number } | null;

            return NextResponse.json(
                {
                    status: 200,
                    message: 'User reward balance adjusted successfully',
                    data: {
                        userId,
                        newBalance: reward?.balance || 0,
                        adjustment: amount,
                        reason,
                    },
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { status: 400, message: 'Invalid action', data: {} },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('POST /api/admin/rewards/users error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to process reward adjustment',
                data: {},
            },
            { status: 500 }
        );
    }
}
