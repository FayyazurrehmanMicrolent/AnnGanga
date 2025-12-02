import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Coupon from '@/models/coupon';

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
        await connectDB();

        const url = new URL(req.url);
        const active = url.searchParams.get('active');
        const expired = url.searchParams.get('expired');
        const search = url.searchParams.get('search');

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

        const coupons = await Coupon.find(query).sort({ createdAt: -1 }).lean();

        return NextResponse.json(
            {
                status: 200,
                message: 'Coupons fetched successfully',
                data: coupons,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/coupons error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to fetch coupons',
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
