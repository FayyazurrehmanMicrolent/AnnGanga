import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Cart from '@/models/cart';
import Order from '@/models/order';
import { verifyToken } from '@/lib/auth';
import Product from '@/models/product';
import Coupon from '@/models/coupon';
import SelectedCoupon from '@/models/selectedCoupon';
import Address from '@/models/address';
import User from '@/models/users';
import { redeemRewards, awardRewards, calculateRewardsForOrder } from '@/lib/rewards';
import OrderLog from '@/models/orderLog';

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();
        const {
            userId: incomingUserId,
            // accept either addressId or addressID
            addressId,
            addressID,
            address,
            paymentMethod,
            orderId,
            orderSummaryID,
            deliveryType,
            couponCode,
            rewardPoints,
        } = body;

        // Normalize userId: allow clients to send either users.id (UUID) or Mongo _id
        let userId = incomingUserId;

        const addrId = addressId || addressID || null;

        // Validation
        if (!userId) {
            return NextResponse.json(
                { status: 400, message: 'User ID is required', data: {} },
                { status: 400 }
            );
        }

        if (!paymentMethod) {
            return NextResponse.json(
                { status: 400, message: 'Payment method is required', data: {} },
                { status: 400 }
            );
        }

        // Resolve cart robustly: incoming `userId` may be UUID (`users.id`) or Mongo `_id`.
        // Also prefer authenticated token user id if present.
        const candidateIds: string[] = [];
        if (userId) candidateIds.push(String(userId));

        // If a token is present, prefer it as a candidate (helps mobile/web clients)
        const tokenFromCookie = req.cookies.get('token')?.value || req.cookies.get('authToken')?.value;
        const authHeader = req.headers.get('authorization')?.startsWith('Bearer ') ? req.headers.get('authorization')!.split(' ')[1] : null;
        const token = tokenFromCookie || authHeader || null;
        if (token) {
            try {
                const decoded = verifyToken(token);
                const tokenUserId = decoded?.userId;
                if (tokenUserId && !candidateIds.includes(String(tokenUserId))) candidateIds.push(String(tokenUserId));
            } catch (e) {
                // ignore token errors
            }
        }

        // If incoming id looks like a UUID (contains dash), try to resolve to Mongo _id
        if (userId && userId.includes('-')) {
            try {
                const maybeUser = await User.findOne({ id: String(userId), isDeleted: false });
                if (maybeUser) {
                    const mongoId = String(maybeUser._id);
                    if (!candidateIds.includes(mongoId)) candidateIds.push(mongoId);
                }
            } catch (e) {
                // ignore
            }
        }

        // Try to find the cart by any of the candidate identifiers
        let cart = null as any;
        if (candidateIds.length) {
            cart = await Cart.findOne({ userId: { $in: candidateIds } });
        }

        // If still not found, fallback to original single-id lookup
        if (!cart && userId) {
            cart = await Cart.findOne({ userId: String(userId) });
        }

        if (!cart || cart.items.length === 0) {
            return NextResponse.json(
                { status: 400, message: 'Cart is empty', data: {} },
                { status: 400 }
            );
        }

        // Resolve delivery address: prefer provided addressId -> inline address object -> user's default -> most recent
        // Allow skipping address for pickup/no-delivery flows via `skipAddress: true` or `deliveryType: 'pickup'|'none'`.
        let resolvedAddress: any = null;
        const skipAddress = body.skipAddress === true || (deliveryType && ['pickup', 'none'].includes(String(deliveryType).toLowerCase()));

        if (addrId) {
            resolvedAddress = await Address.findOne({ addressId: addrId, userId, isDeleted: false });
            // If addressId not found, continue without error — allow minimal payloads that omit a delivery address
            if (!resolvedAddress) {
                resolvedAddress = null;
            }
        } else if (address && typeof address === 'object') {
            // Inline address provided in payload — validate required fields
            const aName = address.name ? String(address.name).trim() : '';
            const aPhone = address.phone ? String(address.phone).trim() : '';
            const aAddr = address.address ? String(address.address).trim() : '';
            const aCity = address.city ? String(address.city).trim() : '';
            const aPincode = address.pincode ? String(address.pincode).trim() : '';

            if (!aName || !aPhone || !aAddr || !aCity || !aPincode) {
                return NextResponse.json(
                    { status: 400, message: 'Inline address must include name, phone, address, city and pincode', data: {} },
                    { status: 400 }
                );
            }

            if (!/^\d{10}$/.test(aPhone)) {
                return NextResponse.json({ status: 400, message: 'Phone number must be exactly 10 digits', data: {} }, { status: 400 });
            }

            if (!/^\d{6}$/.test(aPincode)) {
                return NextResponse.json({ status: 400, message: 'Pincode must be exactly 6 digits', data: {} }, { status: 400 });
            }

            resolvedAddress = {
                name: aName,
                phone: aPhone,
                address: aAddr,
                landmark: address.landmark ? String(address.landmark).trim() : null,
                city: aCity,
                state: address.state ? String(address.state).trim() : null,
                pincode: aPincode,
            };
        } else {
            if (!skipAddress) {
                // Try default address first
                resolvedAddress = await Address.findOne({ userId, isDefault: true, isDeleted: false });
                if (!resolvedAddress) {
                    // Fallback to most recently updated address
                    resolvedAddress = await Address.findOne({ userId, isDeleted: false }).sort({ updatedAt: -1 });
                }
                if (!resolvedAddress) {
                    return NextResponse.json(
                        { status: 400, message: 'No saved address found for user; include addressId or inline address in payload', data: {} },
                        { status: 400 }
                    );
                }
            } else {
                // skipAddress true: leave resolvedAddress as null (order will be created without deliveryAddress)
                resolvedAddress = null;
            }
        }

        // Get product details and validate
        const productIds = cart.items.map((item: any) => item.productId);
        const products = await Product.find({ productId: { $in: productIds }, isDeleted: false }).lean();
        const productMap = new Map(products.map((p: any) => [p.productId, p]));

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

        // Start a transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Verify product availability and update quantities
            for (const item of cart.items) {
                const product = await Product.findOne({ productId: item.productId, isDeleted: false }).session(session);
                
                if (!product) {
                    throw new Error(`Product ${item.productId} not found or unavailable`);
                }

                // Find the appropriate weight option or use default quantity
                let availableQuantity = product.quantity; // Default quantity
                
                if (item.weightOption && product.weightVsPrice) {
                    const weightOption = product.weightVsPrice.find(
                        (wp: any) => wp.weight === item.weightOption
                    );
                    if (weightOption) {
                        availableQuantity = weightOption.quantity || 0;
                    }
                }

                // Check if enough stock is available
                if (availableQuantity < item.quantity) {
                    throw new Error(`Insufficient stock for ${product.title}${item.weightOption ? ` (${item.weightOption})` : ''}. Available: ${availableQuantity}, Requested: ${item.quantity}`);
                }

                // Update the quantity
                if (item.weightOption && product.weightVsPrice) {
                    // Update quantity for specific weight option
                    const weightOptionIndex = product.weightVsPrice.findIndex(
                        (wp: any) => wp.weight === item.weightOption
                    );
                    if (weightOptionIndex !== -1) {
                        product.weightVsPrice[weightOptionIndex].quantity -= item.quantity;
                        // Ensure quantity doesn't go below 0
                        if (product.weightVsPrice[weightOptionIndex].quantity < 0) {
                            product.weightVsPrice[weightOptionIndex].quantity = 0;
                        }
                    }
                } else {
                    // Update default quantity
                    product.quantity -= item.quantity;
                    // Ensure quantity doesn't go below 0
                    if (product.quantity < 0) {
                        product.quantity = 0;
                    }
                }

                // Save the updated product
                await product.save({ session });
            }

            // If we get here, all products are available and quantities have been updated
            await session.commitTransaction();
            session.endSession();
        } catch (error) {
            // If any error occurs, abort the transaction
            await session.abortTransaction();
            session.endSession();
            throw error; // Re-throw to be caught by the outer try-catch
        }

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
            deliveryAddress: resolvedAddress
                ? {
                      name: resolvedAddress.name,
                      phone: resolvedAddress.phone,
                      address: resolvedAddress.address,
                      landmark: resolvedAddress.landmark || null,
                      city: resolvedAddress.city,
                      state: resolvedAddress.state || null,
                      pincode: resolvedAddress.pincode,
                  }
                : null,
            deliveryType: deliveryType || 'normal',
            orderSummaryId: orderSummaryID || null,
            orderStatus: 'pending',
            estimatedDelivery: new Date(Date.now() + (deliveryType === 'expedited' ? 2 : 5) * 24 * 60 * 60 * 1000),
        });

        await order.save();

        // Create order log entry for placement
        try {
            const log = new OrderLog({ orderId: order.orderId, status: 'Order Placed', actor: 'system' });
            await log.save();
        } catch (e) {
            console.warn('Failed to create order log for placed order:', e);
        }

        // Clear cart using a new session to avoid transaction conflicts
        // Also remove any applied coupon so it doesn't persist after successful order
        await Cart.updateOne(
            { _id: cart._id },
            { $set: { items: [], appliedCoupon: null } }
        );
        try {
            await SelectedCoupon.deleteOne({ userId });
        } catch (e) {
            console.warn('Failed to remove selected coupon after checkout:', e);
        }

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
