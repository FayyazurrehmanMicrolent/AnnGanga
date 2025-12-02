import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Coupon from '@/models/coupon';

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();
        const { code, userId, cartTotal, items } = body;

        // Validation
        if (!code || !String(code).trim()) {
            return NextResponse.json(
                { status: 400, message: 'Coupon code is required', valid: false, data: {} },
                { status: 400 }
            );
        }

        if (!userId) {
            return NextResponse.json(
                { status: 400, message: 'User ID is required', valid: false, data: {} },
                { status: 400 }
            );
        }

        if (!cartTotal || cartTotal <= 0) {
            return NextResponse.json(
                { status: 400, message: 'Valid cart total is required', valid: false, data: {} },
                { status: 400 }
            );
        }

        // Find coupon (case-insensitive)
        const upperCode = String(code).trim().toUpperCase();
        const coupon = await Coupon.findOne({ code: upperCode, isDeleted: false });

        if (!coupon) {
            return NextResponse.json(
                { status: 404, message: 'Invalid coupon code', valid: false, data: {} },
                { status: 404 }
            );
        }

        // Check if active
        if (!coupon.isActive) {
            return NextResponse.json(
                { status: 400, message: 'This coupon is currently inactive', valid: false, data: {} },
                { status: 400 }
            );
        }

        // Check expiry
        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
            return NextResponse.json(
                { status: 400, message: 'This coupon has expired', valid: false, data: {} },
                { status: 400 }
            );
        }

        // Check total usage limit
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return NextResponse.json(
                { status: 400, message: 'Coupon usage limit has been reached', valid: false, data: {} },
                { status: 400 }
            );
        }

        // Check per-user usage limit
        const userUsageCount = coupon.userUsage?.get(userId) || 0;
        if (userUsageCount >= coupon.usageLimitPerUser) {
            return NextResponse.json(
                { status: 400, message: 'You have already used this coupon the maximum number of times', valid: false, data: {} },
                { status: 400 }
            );
        }

        // Check minimum order value
        if (cartTotal < coupon.minOrderValue) {
            return NextResponse.json(
                {
                    status: 400,
                    message: `Minimum order value of ₹${coupon.minOrderValue} required to use this coupon`,
                    valid: false,
                    data: { minOrderValue: coupon.minOrderValue },
                },
                { status: 400 }
            );
        }

        // Check applicable products/categories
        if (items && Array.isArray(items) && items.length > 0) {
            // If specific products are set, check if at least one cart item matches
            if (coupon.applicableProducts.length > 0) {
                const hasApplicableProduct = items.some((item: any) =>
                    coupon.applicableProducts.includes(item.productId)
                );
                if (!hasApplicableProduct) {
                    return NextResponse.json(
                        { status: 400, message: 'This coupon is not applicable to the items in your cart', valid: false, data: {} },
                        { status: 400 }
                    );
                }
            }

            // If specific categories are set, check if at least one cart item matches
            if (coupon.applicableCategories.length > 0) {
                const hasApplicableCategory = items.some((item: any) =>
                    coupon.applicableCategories.includes(item.categoryId)
                );
                if (!hasApplicableCategory) {
                    return NextResponse.json(
                        { status: 400, message: 'This coupon is not applicable to the items in your cart', valid: false, data: {} },
                        { status: 400 }
                    );
                }
            }
        }

        // Calculate discount
        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (cartTotal * coupon.discountValue) / 100;
            // Apply max discount cap if set
            if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                discount = coupon.maxDiscount;
            }
        } else if (coupon.discountType === 'fixed') {
            discount = coupon.discountValue;
            // Discount cannot exceed cart total
            if (discount > cartTotal) {
                discount = cartTotal;
            }
        }

        // Round to 2 decimal places
        discount = Math.round(discount * 100) / 100;
        const finalTotal = Math.max(0, cartTotal - discount);

        return NextResponse.json(
            {
                status: 200,
                message: 'Coupon applied successfully',
                valid: true,
                coupon: {
                    code: coupon.code,
                    description: coupon.description,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue,
                },
                discount,
                finalTotal,
                data: {
                    couponId: coupon.couponId,
                    discount,
                    finalTotal,
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('POST /api/coupons/validate error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to validate coupon',
                valid: false,
                data: {},
            },
            { status: 500 }
        );
    }
}
