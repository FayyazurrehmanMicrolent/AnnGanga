import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Coupon from '@/models/coupon';
import Cart from '@/models/cart';
import SelectedCoupon from '@/models/selectedCoupon';

// Helper: find coupon by couponId or _id
async function findCouponByIdSafe(id: string) {
    if (!id) return null;
    let coupon = await Coupon.findOne({ couponId: id });
    if (coupon) return coupon;
    try {
        coupon = await Coupon.findOne({ _id: id });
        return coupon;
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest) {
    try {
        console.log('GET /api/coupons - Starting request');
        await connectDB();
        console.log('Database connected');

        // Parse URL with fallback for relative URLs
        let url: URL;
        try {
            url = new URL(req.url);
        } catch (e) {
            const host = req.headers.get('host') || 'localhost:3000';
            url = new URL(req.url, `http://${host}`);
        }
        
        const active = url.searchParams.get('active');
        const expired = url.searchParams.get('expired');
        const search = url.searchParams.get('search');
        
        console.log('Query params:', { active, expired, search });

        const query: any = { isDeleted: false };

        // Filter by active status
        if (active !== null) {
            query.isActive = active === 'true';
        }

        // Filter by expiry
        if (expired === 'true') {
            query.expiryDate = { $lt: new Date() };
        } else if (expired === 'false') {
            query.$or = [
                { expiryDate: null },
                { expiryDate: { $gte: new Date() } }
            ];
        }

        // Search by code or description
        if (search) {
            query.$or = [
                { code: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        console.log('Coupon query:', JSON.stringify(query));
        const coupons = await Coupon.find(query).sort({ createdAt: -1 }).lean();
        console.log(`Found ${coupons.length} coupons`);

        // If client passes userId, mark which coupon is applied on that user's cart
        const userId = url.searchParams.get('userId');
        let cart: any = null;
        if (userId) {
            try {
                cart = await Cart.findOne({ userId }).lean();
            } catch (err) {
                // ignore cart errors, still return coupons
                console.error('Error fetching cart for coupon GET:', err);
            }
        }

        const couponsWithApplied = coupons.map((c: any) => {
            const isApplied = !!(
                cart && cart.appliedCoupon && (
                    (cart.appliedCoupon.couponId && cart.appliedCoupon.couponId === c.couponId) ||
                    (cart.appliedCoupon.code && cart.appliedCoupon.code === c.code)
                )
            );
            return {
                ...c,
                isApplied,
                appliedToProducts: isApplied ? (cart?.appliedCoupon?.appliedToProducts || []) : [],
            };
        });

        console.log('Returning response with', couponsWithApplied.length, 'coupons');
        return NextResponse.json(
            {
                status: 200,
                message: 'Coupons fetched successfully',
                data: couponsWithApplied,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/coupons error:', error);
        console.error('Error stack:', error.stack);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to fetch coupons',
                error: error.toString(),
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

        // CREATE COUPON
        if (action === 'create') {
            const {
                code,
                description,
                discountType,
                discountValue,
                minOrderValue,
                maxDiscount,
                usageLimit,
                usageLimitPerUser,
                expiryDate,
                isActive,
                applicableProducts,
                applicableCategories,
            } = data;

            // Validation
            if (!code || !String(code).trim()) {
                return NextResponse.json(
                    { status: 400, message: 'Coupon code is required', data: {} },
                    { status: 400 }
                );
            }

            if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
                return NextResponse.json(
                    { status: 400, message: 'Valid discount type is required (percentage or fixed)', data: {} },
                    { status: 400 }
                );
            }

            if (!discountValue || discountValue <= 0) {
                return NextResponse.json(
                    { status: 400, message: 'Discount value must be greater than 0', data: {} },
                    { status: 400 }
                );
            }

            if (discountType === 'percentage' && discountValue > 100) {
                return NextResponse.json(
                    { status: 400, message: 'Percentage discount cannot exceed 100', data: {} },
                    { status: 400 }
                );
            }

            // Check if code already exists
            const upperCode = String(code).trim().toUpperCase();
            const existing = await Coupon.findOne({ code: upperCode, isDeleted: false });
            if (existing) {
                return NextResponse.json(
                    { status: 409, message: 'Coupon code already exists', data: {} },
                    { status: 409 }
                );
            }

            // Validate expiry date
            let parsedExpiryDate = null;
            if (expiryDate) {
                parsedExpiryDate = new Date(expiryDate);
                if (isNaN(parsedExpiryDate.getTime())) {
                    return NextResponse.json(
                        { status: 400, message: 'Invalid expiry date format', data: {} },
                        { status: 400 }
                    );
                }
                if (parsedExpiryDate < new Date()) {
                    return NextResponse.json(
                        { status: 400, message: 'Expiry date must be in the future', data: {} },
                        { status: 400 }
                    );
                }
            }

            const coupon = new Coupon({
                code: upperCode,
                description: description || null,
                discountType,
                discountValue: Number(discountValue),
                minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
                maxDiscount: maxDiscount ? Number(maxDiscount) : null,
                usageLimit: usageLimit ? Number(usageLimit) : null,
                usageLimitPerUser: usageLimitPerUser ? Number(usageLimitPerUser) : 1,
                expiryDate: parsedExpiryDate,
                isActive: isActive !== undefined ? Boolean(isActive) : true,
                applicableProducts: Array.isArray(applicableProducts) ? applicableProducts : [],
                applicableCategories: Array.isArray(applicableCategories) ? applicableCategories : [],
            });

            await coupon.save();

            return NextResponse.json(
                {
                    status: 201,
                    message: 'Coupon created successfully',
                    data: coupon,
                },
                { status: 201 }
            );
        }

        // EDIT COUPON
        if (action === 'edit') {
            const id = data.id || data.couponId;
            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Coupon ID is required for edit', data: {} },
                    { status: 400 }
                );
            }

            const coupon = await findCouponByIdSafe(String(id));
            if (!coupon || coupon.isDeleted) {
                return NextResponse.json(
                    { status: 404, message: 'Coupon not found', data: {} },
                    { status: 404 }
                );
            }

            // Update fields
            if (data.code !== undefined) {
                const upperCode = String(data.code).trim().toUpperCase();
                if (upperCode !== coupon.code) {
                    const existing = await Coupon.findOne({ code: upperCode, isDeleted: false });
                    if (existing) {
                        return NextResponse.json(
                            { status: 409, message: 'Coupon code already exists', data: {} },
                            { status: 409 }
                        );
                    }
                    coupon.code = upperCode;
                }
            }

            if (data.description !== undefined) coupon.description = data.description || null;
            if (data.discountType !== undefined) {
                if (!['percentage', 'fixed'].includes(data.discountType)) {
                    return NextResponse.json(
                        { status: 400, message: 'Invalid discount type', data: {} },
                        { status: 400 }
                    );
                }
                coupon.discountType = data.discountType;
            }

            if (data.discountValue !== undefined) {
                const val = Number(data.discountValue);
                if (val <= 0) {
                    return NextResponse.json(
                        { status: 400, message: 'Discount value must be greater than 0', data: {} },
                        { status: 400 }
                    );
                }
                if (coupon.discountType === 'percentage' && val > 100) {
                    return NextResponse.json(
                        { status: 400, message: 'Percentage discount cannot exceed 100', data: {} },
                        { status: 400 }
                    );
                }
                coupon.discountValue = val;
            }

            if (data.minOrderValue !== undefined) coupon.minOrderValue = Number(data.minOrderValue) || 0;
            if (data.maxDiscount !== undefined) coupon.maxDiscount = data.maxDiscount ? Number(data.maxDiscount) : null;
            if (data.usageLimit !== undefined) coupon.usageLimit = data.usageLimit ? Number(data.usageLimit) : null;
            if (data.usageLimitPerUser !== undefined) coupon.usageLimitPerUser = Number(data.usageLimitPerUser) || 1;
            if (data.isActive !== undefined) coupon.isActive = Boolean(data.isActive);
            if (data.applicableProducts !== undefined) coupon.applicableProducts = Array.isArray(data.applicableProducts) ? data.applicableProducts : [];
            if (data.applicableCategories !== undefined) coupon.applicableCategories = Array.isArray(data.applicableCategories) ? data.applicableCategories : [];

            if (data.expiryDate !== undefined) {
                if (data.expiryDate === null) {
                    coupon.expiryDate = null;
                } else {
                    const parsedDate = new Date(data.expiryDate);
                    if (isNaN(parsedDate.getTime())) {
                        return NextResponse.json(
                            { status: 400, message: 'Invalid expiry date format', data: {} },
                            { status: 400 }
                        );
                    }
                    coupon.expiryDate = parsedDate;
                }
            }

            await coupon.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Coupon updated successfully',
                    data: coupon,
                },
                { status: 200 }
            );
        }

        // DELETE COUPON
        if (action === 'delete') {
            const id = data.id || data.couponId;
            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Coupon ID is required for delete', data: {} },
                    { status: 400 }
                );
            }

            const coupon = await findCouponByIdSafe(String(id));
            if (!coupon) {
                return NextResponse.json(
                    { status: 404, message: 'Coupon not found', data: {} },
                    { status: 404 }
                );
            }

            coupon.isDeleted = true;
            await coupon.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Coupon deleted successfully',
                    data: {},
                },
                { status: 200 }
            );
        }

        // SELECT / UNSELECT COUPON FOR USER CART (does NOT delete coupon from DB)
        if (action === 'select' || action === 'unselect') {
            const userId = data.userId || url.searchParams.get('userId');
            const id = data.id || data.couponId;
            const code = data.code || null;

            if (!userId) {
                return NextResponse.json(
                    { status: 400, message: 'User ID is required', data: {} },
                    { status: 400 }
                );
            }

            // For unselect, we just clear appliedCoupon on cart
            if (action === 'unselect') {
                const cart = await Cart.findOne({ userId });
                // Always remove the SelectedCoupon entry if present (client may have separate selected record)
                try {
                    await SelectedCoupon.deleteOne({ userId });
                } catch (e) {
                    console.warn('Failed to delete SelectedCoupon during unselect:', e);
                }

                // If cart exists but has no appliedCoupon, we've still removed the selected record above
                if (!cart || !cart.appliedCoupon) {
                    // ensure cart.appliedCoupon is null if cart exists
                    if (cart && cart.appliedCoupon) {
                        cart.appliedCoupon = null;
                        try { await cart.save(); } catch (e) { console.warn('Failed to clear appliedCoupon on cart:', e); }
                    }
                    return NextResponse.json({ status: 200, message: 'No coupon applied', data: {} }, { status: 200 });
                }

                cart.appliedCoupon = null;
                await cart.save();
                return NextResponse.json({ status: 200, message: 'Coupon removed from cart', data: {} }, { status: 200 });
            }

            // SELECT action
            if (!id && !code) {
                return NextResponse.json(
                    { status: 400, message: 'Coupon id or code is required to select', data: {} },
                    { status: 400 }
                );
            }

            let coupon = null;
            if (id) coupon = await findCouponByIdSafe(String(id));
            if (!coupon && code) {
                const up = String(code).trim().toUpperCase();
                coupon = await Coupon.findOne({ code: up, isDeleted: false });
            }

            if (!coupon || coupon.isDeleted) {
                return NextResponse.json({ status: 404, message: 'Coupon not found', data: {} }, { status: 404 });
            }

            if (!coupon.isActive) {
                return NextResponse.json({ status: 400, message: 'Coupon is not active', data: {} }, { status: 400 });
            }

            if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
                return NextResponse.json({ status: 400, message: 'Coupon is expired', data: {} }, { status: 400 });
            }

            // Find or create cart for user
            let cart = await Cart.findOne({ userId });
            if (!cart) {
                cart = new Cart({ userId, items: [], appliedCoupon: null });
            }

            cart.appliedCoupon = {
                couponId: coupon.couponId || null,
                code: coupon.code || null,
                discount: 0,
                discountType: coupon.discountType || null,
                discountValue: coupon.discountValue || null,
                appliedToProducts: [],
                appliedAt: new Date(),
            };

            await cart.save();

            return NextResponse.json({ status: 200, message: 'Coupon selected for cart', data: cart.appliedCoupon }, { status: 200 });
        }

        return NextResponse.json(
            { status: 400, message: 'Invalid action', data: {} },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('POST /api/coupons error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to process coupon action',
                data: {},
            },
            { status: 500 }
        );
    }
}
