import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RewardTransaction from '@/models/rewardTransaction';
import {
    getOrCreateReward,
    calculateRewardsForOrder,
    redeemRewards,
    getUserRewardBalance,
} from '@/lib/rewards';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url);
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { status: 400, message: 'User ID is required', data: {} },
                { status: 400 }
            );
        }

        // Get reward account
        const reward = await getOrCreateReward(userId);

        // Get recent transactions
        const transactions = await RewardTransaction.find({ userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        return NextResponse.json(
            {
                status: 200,
                message: 'Reward details fetched successfully',
                data: {
                    balance: reward.balance,
                    lifetimeEarned: reward.lifetimeEarned,
                    lifetimeRedeemed: reward.lifetimeRedeemed,
                    isActive: reward.isActive,
                    transactions,
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/rewards error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to fetch reward details',
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

        // CALCULATE REWARDS
        if (action === 'calculate') {
            const { userId, cartTotal } = data;

            if (!userId) {
                return NextResponse.json(
                    { status: 400, message: 'User ID is required', data: {} },
                    { status: 400 }
                );
            }

            if (!cartTotal || cartTotal <= 0) {
                return NextResponse.json(
                    { status: 400, message: 'Valid cart total is required', data: {} },
                    { status: 400 }
                );
            }

            const result = await calculateRewardsForOrder(userId, Number(cartTotal));

            return NextResponse.json(
                {
                    status: 200,
                    message: result.eligible ? 'Rewards calculated' : result.reason,
                    data: {
                        eligible: result.eligible,
                        points: result.points,
                        reason: result.reason,
                    },
                },
                { status: 200 }
            );
        }

        // REDEEM REWARDS
        if (action === 'redeem') {
            const { userId, points, orderId } = data;

            if (!userId) {
                return NextResponse.json(
                    { status: 400, message: 'User ID is required', data: {} },
                    { status: 400 }
                );
            }

            if (!points || points <= 0) {
                return NextResponse.json(
                    { status: 400, message: 'Valid points amount is required', data: {} },
                    { status: 400 }
                );
            }

            const result = await redeemRewards(userId, Number(points), orderId);

            if (!result.success) {
                return NextResponse.json(
                    { status: 400, message: result.message, data: {} },
                    { status: 400 }
                );
            }

            const newBalance = await getUserRewardBalance(userId);

            return NextResponse.json(
                {
                    status: 200,
                    message: result.message,
                    data: {
                        discountAmount: result.discountAmount,
                        pointsRedeemed: points,
                        newBalance,
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
        console.error('POST /api/rewards error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to process reward action',
                data: {},
            },
            { status: 500 }
        );
    }
}
