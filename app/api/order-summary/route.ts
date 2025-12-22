import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/db';
import Cart from '@/models/cart';
import Product from '@/models/product';
import Delivery from '@/models/delivery';

async function getUserIdFromToken(req: NextRequest): Promise<string | null> {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (decoded && (decoded as any).userId) return (decoded as any).userId;
    }

    const token = req.cookies.get('authToken')?.value;
    if (token) {
        const decoded = verifyToken(token);
        if (decoded && (decoded as any).userId) return (decoded as any).userId;
    }

    return null;
}

function calculateCouponDiscount(appliedCoupon: any, itemsWithDetails: any[]) {
    if (!appliedCoupon) return { discountAmount: 0 };

    const { discountType, discountValue, appliedToProducts } = appliedCoupon;
    let discountAmount = 0;

    // If appliedToProducts specified, compute discount only for those items
    const targetProducts = Array.isArray(appliedToProducts) && appliedToProducts.length > 0
        ? new Set(appliedToProducts)
        : null;

    if (discountType === 'percentage') {
        // percentage on applicable subtotal
        const applicableSubtotal = itemsWithDetails.reduce((sum, it) => {
            if (!targetProducts || targetProducts.has(it.productId)) return sum + it.total;
            return sum;
        }, 0);
        discountAmount = (Number(discountValue) / 100) * applicableSubtotal;
    } else if (discountType === 'fixed') {
        // fixed amount: if applied to specific products, limit to their subtotal, else full fixed
        if (targetProducts) {
            const applicableSubtotal = itemsWithDetails.reduce((sum, it) => {
                if (targetProducts.has(it.productId)) return sum + it.total;
                return sum;
            }, 0);
            discountAmount = Math.min(Number(discountValue) || 0, applicableSubtotal);
        } else {
            discountAmount = Number(discountValue) || 0;
        }
    }

    // Ensure non-negative
    if (!isFinite(discountAmount) || discountAmount < 0) discountAmount = 0;
    return { discountAmount };
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        // Prefer authenticated user id
        const tokenUserId = await getUserIdFromToken(req);

        const url = new URL(req.url);
        const queryUserId = url.searchParams.get('userId');

        const userId = tokenUserId || queryUserId;
        if (!userId) {
            return NextResponse.json(
                { status: 401, message: 'Unauthorized. Please log in.', data: {} },
                { status: 401 }
            );
        }

        const cart = await Cart.findOne({ userId });
        if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
            return NextResponse.json(
                {
                    status: 200,
                    message: 'Order summary fetched successfully',
                    data: {
                        items: [],
                        subtotal: 0,
                        shipping: 0,
                        discount: 0,
                        orderId: cart ? cart.cartId : null,
                        total: 0,
                        appliedCoupon: null,
                    },
                },
                { status: 200 }
            );
        }

        const productIds = cart.items.map((it: any) => it.productId);
        const products = await Product.find({ productId: { $in: productIds }, isDeleted: false })
            .select('productId title actualPrice images')
            .lean();

        const productMap = new Map(products.map((p) => [p.productId, p]));

        const itemsWithDetails = cart.items.map((item: any) => {
            const product = productMap.get(item.productId);
            const productName = product?.title || 'Unknown Product';
            const unitPrice = Number(item.price || product?.actualPrice || 0);
            const quantity = Number(item.quantity || 1);
            const total = unitPrice * quantity;
            return {
                productId: item.productId,
                name: productName,
                image: product?.images?.[0] || null,
                unitPrice,
                quantity,
                total,
            };
        });

        const subtotal = itemsWithDetails.reduce((sum: any, it: any) => sum + it.total, 0);

        // Simple flat shipping rate (fallback). If a delivered Delivery exists for the user,
        // prefer its recorded price and include delivery info in the response.
        const SHIPPING_RATE = 1.5;
        let shipping = subtotal > 0 ? SHIPPING_RATE : 0;

        // Check for latest delivery for this user. Use most recent delivery record (no status filter).
        let deliveryInfo: any = null;
        try {
            let recent: any = await Delivery.findOne({ userId, isDeleted: false }).sort({ updatedAt: -1 }).lean();
            // Some mongoose typings or usages may return arrays in certain cases — normalize to an object or null
            if (Array.isArray(recent)) recent = recent.length > 0 ? recent[0] : null;
            if (recent && typeof recent === 'object') {
                const priceVal = recent.price;
                const dprice = (priceVal !== undefined && priceVal !== null) ? Number(priceVal) : shipping;
                if (!isNaN(dprice)) shipping = dprice;
                deliveryInfo = {
                    deliveryId: recent.deliveryId || null,
                    name: recent.name || null,
                    price: (dprice !== undefined && !isNaN(dprice)) ? dprice : null,
                    currency: recent.currency || 'INR',
                };
            }
        } catch (e) {
            // ignore delivery lookup errors
            deliveryInfo = null;
        }

        // Calculate coupon discount if any
        const appliedCoupon = cart.appliedCoupon || null;
        const { discountAmount } = calculateCouponDiscount(appliedCoupon, itemsWithDetails);

        const total = Math.max(0, subtotal + shipping - discountAmount);

        return NextResponse.json(
            {
                status: 200,
                message: 'Order summary fetched successfully',
                data: {
                    items: itemsWithDetails,
                    subtotal,
                    shipping,
                    discount: discountAmount,
                    orderId: cart.cartId || null,
                    total,
                    appliedCoupon: appliedCoupon
                        ? {
                            couponId: appliedCoupon.couponId || null,
                            code: appliedCoupon.code || null,
                            discountType: appliedCoupon.discountType || null,
                            discountValue: appliedCoupon.discountValue || null,
                            appliedToProducts: Array.isArray(appliedCoupon.appliedToProducts)
                                ? appliedCoupon.appliedToProducts
                                : [],
                        }
                        : null,
                    // include delivery info when available
                    delivery: deliveryInfo,
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/order-summary error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error?.message || 'Failed to fetch order summary',
                data: {},
            },
            { status: 500 }
        );
    }
}
