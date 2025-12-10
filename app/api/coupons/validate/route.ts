import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Coupon from '@/models/coupon';
import Cart from '@/models/cart';
import { verifyToken } from '@/lib/auth';

// Helper to extract userId from Authorization header (Bearer) or authToken cookie
async function getUserIdFromToken(req: Request | any) {
    // Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded: any = verifyToken(token);
            if (decoded && decoded.userId) return decoded.userId;
        } catch (e) {
            // ignore invalid token
        }
    }

    // Cookie fallback
    try {
        const cookieToken = req.cookies?.get && req.cookies.get('authToken')?.value;
        if (cookieToken) {
            try {
                const decoded: any = verifyToken(cookieToken);
                if (decoded && decoded.userId) return decoded.userId;
            } catch (e) {
                // ignore
            }
        }
    } catch (e) {
        // ignore
    }

    return null;
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();
        const { code: bodyCode, userId: bodyUserId, cartTotal, items } = body;

        // Prefer authenticated user id (from token/cookie) when present
        const tokenUserId = await getUserIdFromToken(req as any);
        const userId = tokenUserId || bodyUserId;

        // Validation
        if (!bodyCode || !String(bodyCode).trim()) {
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
        const upperCode = String(bodyCode).trim().toUpperCase();
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

        // Handle remove request: if client wants to remove applied coupon from cart
        const { apply, remove } = body as any;

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

        // If remove flag sent, clear appliedCoupon from cart
        if (remove) {
            try {
                await Cart.findOneAndUpdate({ userId }, { $set: { appliedCoupon: null } });
            } catch (err) {
                console.error('Error removing applied coupon from cart:', err);
            }

            return NextResponse.json(
                { status: 200, message: 'Coupon removed from cart', valid: true, data: {} },
                { status: 200 }
            );
        }

        // If apply/save flag sent, store applied coupon into user's cart
        const { selectedProductId } = body as any;
        if (apply) {
            try {
                // Determine products to which coupon applies
                let appliedToProducts: string[] = [];
                if (selectedProductId) {
                    // If a specific product was selected on the client, only apply to that product
                    // but ensure it's present in the items list and coupon is applicable to it
                    const selectedInItems = items && Array.isArray(items) && items.some((it: any) => it.productId === selectedProductId);
                    if (selectedInItems) {
                        const isApplicableByProduct = !coupon.applicableProducts || coupon.applicableProducts.length === 0 || coupon.applicableProducts.includes(selectedProductId);
                        const matchesCategory = !coupon.applicableCategories || coupon.applicableCategories.length === 0 || items.some((it: any) => it.productId === selectedProductId && coupon.applicableCategories.includes(it.categoryId));
                        if (isApplicableByProduct && matchesCategory) {
                            appliedToProducts = [selectedProductId];
                        } else {
                            // fall back to the broader logic if selected product isn't applicable
                            appliedToProducts = [];
                        }
                    }
                }

                if (appliedToProducts.length === 0) {
                    if (items && Array.isArray(items) && items.length > 0) {
                        if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
                            appliedToProducts = items
                                .filter((it: any) => coupon.applicableProducts.includes(it.productId))
                                .map((it: any) => it.productId);
                        } else if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
                            appliedToProducts = items
                                .filter((it: any) => coupon.applicableCategories.includes(it.categoryId))
                                .map((it: any) => it.productId);
                        } else {
                            appliedToProducts = items.map((it: any) => it.productId);
                        }
                    }
                }

                const appliedObj: any = {
                    couponId: coupon.couponId,
                    code: coupon.code,
                    discount,
                    discountType: coupon.discountType || null,
                    discountValue: coupon.discountValue || null,
                    appliedToProducts,
                    appliedAt: new Date(),
                };

                const existingCart = await Cart.findOne({ userId });
                if (existingCart) {
                    existingCart.appliedCoupon = appliedObj;
                    await existingCart.save();
                } else {
                    const newCart = new Cart({ userId, items: [], appliedCoupon: appliedObj });
                    await newCart.save();
                }
            } catch (err) {
                console.error('Error saving applied coupon to cart:', err);
            }
        }

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
