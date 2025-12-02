import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Cart from '@/models/cart';
import Order from '@/models/order';
import Product from '@/models/product';
import Coupon from '@/models/coupon';
import Address from '@/models/address';
import { redeemRewards, awardRewards, calculateRewardsForOrder } from '@/lib/rewards';

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();
        const {
            userId,
            addressId,
            paymentMethod,
            deliveryType,
            couponCode,
            rewardPoints,
        } = body;

        // Validation
        if (!userId) {
            return NextResponse.json(
                { status: 400, message: 'User ID is required', data: {} },
                { status: 400 }
            );
        }

        if (!addressId) {
            return NextResponse.json(
                { status: 400, message: 'Delivery address is required', data: {} },
                { status: 400 }
            );
        }

        if (!paymentMethod) {
            return NextResponse.json(
                { status: 400, message: 'Payment method is required', data: {} },
                { status: 400 }
            );
        }

        // Get cart
        const cart = await Cart.findOne({ userId });
        if (!cart || cart.items.length === 0) {
            return NextResponse.json(
                { status: 400, message: 'Cart is empty', data: {} },
                { status: 400 }
            );
        }

        // Get delivery address
        const address = await Address.findOne({ addressId, userId, isDeleted: false });
        if (!address) {
            return NextResponse.json(
                { status: 404, message: 'Delivery address not found', data: {} },
                { status: 404 }
            );
        }

        // Get product details and validate
        const productIds = cart.items.map((item: any) => item.productId);
        const products = await Product.find({ productId: { $in: productIds }, isDeleted: false }).lean();
        const productMap = new Map(products.map((p) => [p.productId, p]));

        // Build order items
        const orderItems = cart.items.map((item: any) => {
            const product = productMap.get(item.productId);
            if (!product) {
                throw new Error(`Product ${item.productId} not found or unavailable`);
            }
            return {
                productId: item.productId,
                productName: product.title,
                quantity: item.quantity,
                weightOption: item.weightOption,
                price: item.price,
                total: item.price * item.quantity,
            };
        });

        // Calculate subtotal
        const subtotal = orderItems.reduce((sum: number, item: any) => sum + item.total, 0);

        // Apply coupon if provided
        let discount = 0;
        let appliedCouponCode = null;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isDeleted: false });
            if (coupon && coupon.isActive) {
                // Validate coupon (simplified - full validation in /api/coupons/validate)
                if (!coupon.expiryDate || new Date(coupon.expiryDate) >= new Date()) {
                    if (subtotal >= coupon.minOrderValue) {
                        if (coupon.discountType === 'percentage') {
                            discount = (subtotal * coupon.discountValue) / 100;
                            if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                                discount = coupon.maxDiscount;
                            }
                        } else {
                            discount = Math.min(coupon.discountValue, subtotal);
                        }
                        appliedCouponCode = coupon.code;

                        // Update coupon usage
                        coupon.usedCount += 1;
                        if (!coupon.userUsage) coupon.userUsage = new Map();
                        const userUsage = coupon.userUsage.get(userId) || 0;
                        coupon.userUsage.set(userId, userUsage + 1);
                        await coupon.save();
                    }
                }
            }
        }

        // Redeem reward points if provided
        let rewardDiscount = 0;
        let rewardPointsUsed = 0;
        if (rewardPoints && rewardPoints > 0) {
            const redeemResult = await redeemRewards(userId, Number(rewardPoints));
            if (redeemResult.success) {
                rewardDiscount = redeemResult.discountAmount;
                rewardPointsUsed = Number(rewardPoints);
            }
        }

        // Calculate delivery charges
        const deliveryCharges = deliveryType === 'expedited' ? 100 : 50;

        // Calculate total
        const total = Math.max(0, subtotal - discount - rewardDiscount + deliveryCharges);

        // Create order
        const order = new Order({
            userId,
            items: orderItems,
            subtotal,
            discount,
            deliveryCharges,
            total,
            couponCode: appliedCouponCode,
            rewardPointsUsed,
            rewardDiscount,
            paymentMethod,
            paymentStatus: 'pending',
            deliveryAddress: {
                name: address.name,
                phone: address.phone,
                address: address.address,
                landmark: address.landmark,
                city: address.city,
                state: address.state,
                pincode: address.pincode,
            },
            deliveryType: deliveryType || 'normal',
            orderStatus: 'pending',
            estimatedDelivery: new Date(Date.now() + (deliveryType === 'expedited' ? 2 : 5) * 24 * 60 * 60 * 1000),
        });

        await order.save();

        // Clear cart
        cart.items = [];
        await cart.save();

        // Calculate and award rewards for this order
        const rewardCalc = await calculateRewardsForOrder(userId, total);
        if (rewardCalc.eligible && rewardCalc.points > 0) {
            await awardRewards(
                userId,
                order.orderId,
                rewardCalc.points,
                `Earned ${rewardCalc.points} points for order ${order.orderId}`
            );
        }

        // TODO: Create notification for order placed
        // TODO: Integrate with payment gateway
        // TODO: Create delivery job with delivery partner

        return NextResponse.json(
            {
                status: 201,
                message: 'Order placed successfully',
                data: {
                    orderId: order.orderId,
                    total: order.total,
                    estimatedDelivery: order.estimatedDelivery,
                    rewardsEarned: rewardCalc.eligible ? rewardCalc.points : 0,
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('POST /api/checkout error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to process checkout',
                data: {},
            },
            { status: 500 }
        );
    }
}
