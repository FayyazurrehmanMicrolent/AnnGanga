import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Subscription from '@/models/subscription';
import UserSubscription from '@/models/userSubscription';
import Product from '@/models/product';
import Address from '@/models/address';

// Helper: find subscription by id
async function findSubscriptionByIdSafe(id: string) {
    if (!id) return null;
    let sub = await Subscription.findOne({ subscriptionId: id });
    if (sub) return sub;
    try {
        sub = await Subscription.findOne({ _id: id });
        return sub;
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url);
        const userId = url.searchParams.get('userId');
        const type = url.searchParams.get('type'); // 'plans' | 'active'
        const activeOnly = url.searchParams.get('activeOnly') === 'true';

        // LIST ACTIVE USER SUBSCRIPTIONS
        if (type === 'active' && userId) {
            const userSubs = await UserSubscription.find({ userId, isDeleted: false })
                .sort({ createdAt: -1 })
                .lean();

            // Enrich with subscription details
            const subIds = userSubs.map((s) => s.subscriptionId);
            const plans = await Subscription.find({ subscriptionId: { $in: subIds } }).lean();
            const planMap = new Map(plans.map((p) => [p.subscriptionId, p]));

            const enrichedSubs = userSubs.map((sub) => {
                const plan = planMap.get(sub.subscriptionId);
                return {
                    ...sub,
                    planName: plan?.name || 'Unknown Plan',
                    planImage: plan?.image || null,
                    frequency: plan?.frequency,
                    price: plan?.price,
                };
            });

            return NextResponse.json(
                {
                    status: 200,
                    message: 'User subscriptions fetched successfully',
                    data: enrichedSubs,
                },
                { status: 200 }
            );
        }

        // LIST SUBSCRIPTION PLANS (Public/Admin)
        const query: any = { isDeleted: false };
        if (activeOnly) {
            query.isActive = true;
            query.isInviteOnly = false; // Public only sees non-invite plans
        }

        const plans = await Subscription.find(query).sort({ createdAt: -1 }).lean();

        // Enrich with product details
        const allProductIds = new Set<string>();
        plans.forEach((plan) => {
            plan.items.forEach((item: any) => allProductIds.add(item.productId));
        });

        const products = await Product.find({ productId: { $in: Array.from(allProductIds) } })
            .select('productId title images')
            .lean();
        const productMap = new Map(products.map((p) => [p.productId, p]));

        const enrichedPlans = plans.map((plan) => {
            const enrichedItems = plan.items.map((item: any) => {
                const product = productMap.get(item.productId);
                return {
                    ...item,
                    productName: product?.title || 'Unknown Product',
                    productImage: product?.images?.[0] || null,
                };
            });
            return { ...plan, items: enrichedItems };
        });

        return NextResponse.json(
            {
                status: 200,
                message: 'Subscription plans fetched successfully',
                data: enrichedPlans,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/subscriptions error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to fetch subscriptions',
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

        // CREATE PLAN (Admin)
        if (action === 'createplan') {
            const {
                name,
                description,
                items,
                frequency,
                customDays,
                price,
                discount,
                isInviteOnly,
                isActive,
                image,
            } = data;

            if (!name || !items || items.length === 0 || !frequency || !price) {
                return NextResponse.json(
                    { status: 400, message: 'Missing required fields', data: {} },
                    { status: 400 }
                );
            }

            const plan = new Subscription({
                name: String(name).trim(),
                description: description ? String(description).trim() : null,
                items,
                frequency,
                customDays: Array.isArray(customDays) ? customDays : [],
                price: Number(price),
                discount: Number(discount || 0),
                isInviteOnly: Boolean(isInviteOnly),
                isActive: isActive !== undefined ? Boolean(isActive) : true,
                image: image || null,
            });

            await plan.save();

            return NextResponse.json(
                {
                    status: 201,
                    message: 'Subscription plan created successfully',
                    data: plan,
                },
                { status: 201 }
            );
        }

        // SUBSCRIBE (User)
        if (action === 'subscribe') {
            const { userId, subscriptionId, addressId, paymentMethod, startDate } = data;

            if (!userId || !subscriptionId || !addressId || !paymentMethod) {
                return NextResponse.json(
                    { status: 400, message: 'Missing required fields', data: {} },
                    { status: 400 }
                );
            }

            const plan = await findSubscriptionByIdSafe(subscriptionId);
            if (!plan || !plan.isActive || plan.isDeleted) {
                return NextResponse.json(
                    { status: 404, message: 'Subscription plan not found or inactive', data: {} },
                    { status: 404 }
                );
            }

            // Calculate next delivery date
            const start = startDate ? new Date(startDate) : new Date();
            // Logic to calculate next date based on frequency would go here
            // For now, just use start date + 1 day
            const nextDelivery = new Date(start);
            nextDelivery.setDate(nextDelivery.getDate() + 1);

            const userSub = new UserSubscription({
                userId,
                subscriptionId,
                addressId,
                startDate: start,
                nextDeliveryDate: nextDelivery,
                paymentMethod,
                status: 'active',
            });

            await userSub.save();

            return NextResponse.json(
                {
                    status: 201,
                    message: 'Subscribed successfully',
                    data: userSub,
                },
                { status: 201 }
            );
        }

        // PAUSE/RESUME/CANCEL (User)
        if (['pause', 'resume', 'cancel'].includes(action)) {
            const { userSubscriptionId, userId } = data;

            if (!userSubscriptionId) {
                return NextResponse.json(
                    { status: 400, message: 'User Subscription ID is required', data: {} },
                    { status: 400 }
                );
            }

            const sub = await UserSubscription.findOne({ userSubscriptionId });
            if (!sub) {
                return NextResponse.json(
                    { status: 404, message: 'Subscription not found', data: {} },
                    { status: 404 }
                );
            }

            if (userId && sub.userId !== userId) {
                return NextResponse.json(
                    { status: 403, message: 'Access denied', data: {} },
                    { status: 403 }
                );
            }

            if (action === 'pause') sub.status = 'paused';
            if (action === 'resume') sub.status = 'active';
            if (action === 'cancel') sub.status = 'cancelled';

            await sub.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: `Subscription ${action}d successfully`,
                    data: { userSubscriptionId, status: sub.status },
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { status: 400, message: 'Invalid action', data: {} },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('POST /api/subscriptions error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to process subscription action',
                data: {},
            },
            { status: 500 }
        );
    }
}
