import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import RewardConfig from '@/models/rewardConfig';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const config = await RewardConfig.findOne({ isActive: true }).lean();

        if (!config) {
            return NextResponse.json(
                {
                    status: 404,
                    message: 'No active reward configuration found',
                    data: {},
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                status: 200,
                message: 'Reward configuration fetched successfully',
                data: config,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/admin/rewards/config error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to fetch reward configuration',
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
        const action = (body.action || actionQuery || 'create').toLowerCase();
        const data = body.data || body;

        // CREATE CONFIG
        if (action === 'create') {
            const {
                name,
                pointsPerOrder,
                pointsPerRupee,
                minOrderForReward,
                redemptionRate,
                minRedemptionPoints,
                maxRedemptionPercent,
                eligibilityAfterOrders,
            } = data;

            if (!name || !String(name).trim()) {
                return NextResponse.json(
                    { status: 400, message: 'Configuration name is required', data: {} },
                    { status: 400 }
                );
            }

            // Deactivate all existing configs
            await RewardConfig.updateMany({}, { isActive: false });

            const config = new RewardConfig({
                name: String(name).trim(),
                pointsPerOrder: pointsPerOrder !== undefined ? Number(pointsPerOrder) : 10,
                pointsPerRupee: pointsPerRupee !== undefined ? Number(pointsPerRupee) : 1,
                minOrderForReward: minOrderForReward !== undefined ? Number(minOrderForReward) : 500,
                redemptionRate: redemptionRate !== undefined ? Number(redemptionRate) : 10,
                minRedemptionPoints: minRedemptionPoints !== undefined ? Number(minRedemptionPoints) : 100,
                maxRedemptionPercent: maxRedemptionPercent !== undefined ? Number(maxRedemptionPercent) : 50,
                eligibilityAfterOrders: eligibilityAfterOrders !== undefined ? Number(eligibilityAfterOrders) : 1,
                isActive: true,
            });

            await config.save();

            return NextResponse.json(
                {
                    status: 201,
                    message: 'Reward configuration created successfully',
                    data: config,
                },
                { status: 201 }
            );
        }

        // EDIT CONFIG
        if (action === 'edit') {
            const id = data.id || data.configId;
            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Config ID is required for edit', data: {} },
                    { status: 400 }
                );
            }

            const config = await RewardConfig.findOne({ configId: id });
            if (!config) {
                return NextResponse.json(
                    { status: 404, message: 'Configuration not found', data: {} },
                    { status: 404 }
                );
            }

            // Update fields
            if (data.name !== undefined) config.name = String(data.name).trim();
            if (data.pointsPerOrder !== undefined) config.pointsPerOrder = Number(data.pointsPerOrder);
            if (data.pointsPerRupee !== undefined) config.pointsPerRupee = Number(data.pointsPerRupee);
            if (data.minOrderForReward !== undefined) config.minOrderForReward = Number(data.minOrderForReward);
            if (data.redemptionRate !== undefined) config.redemptionRate = Number(data.redemptionRate);
            if (data.minRedemptionPoints !== undefined) config.minRedemptionPoints = Number(data.minRedemptionPoints);
            if (data.maxRedemptionPercent !== undefined) config.maxRedemptionPercent = Number(data.maxRedemptionPercent);
            if (data.eligibilityAfterOrders !== undefined) config.eligibilityAfterOrders = Number(data.eligibilityAfterOrders);

            await config.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Reward configuration updated successfully',
                    data: config,
                },
                { status: 200 }
            );
        }

        // TOGGLE CONFIG
        if (action === 'toggle') {
            const id = data.id || data.configId;
            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Config ID is required for toggle', data: {} },
                    { status: 400 }
                );
            }

            const config = await RewardConfig.findOne({ configId: id });
            if (!config) {
                return NextResponse.json(
                    { status: 404, message: 'Configuration not found', data: {} },
                    { status: 404 }
                );
            }

            // If enabling, deactivate all others
            if (!config.isActive) {
                await RewardConfig.updateMany({}, { isActive: false });
            }

            config.isActive = !config.isActive;
            await config.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: `Reward configuration ${config.isActive ? 'enabled' : 'disabled'} successfully`,
                    data: config,
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { status: 400, message: 'Invalid action', data: {} },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('POST /api/admin/rewards/config error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to process reward configuration',
                data: {},
            },
            { status: 500 }
        );
    }
}
