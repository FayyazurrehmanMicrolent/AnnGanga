import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/db';
import Cart from '@/models/cart';
import Product from '@/models/product';

// Helper: get or create cart for user
async function getOrCreateCart(userId: string) {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
        cart = new Cart({ userId, items: [] });
        await cart.save();
    }
    return cart;
}

async function getUserIdFromToken(req: NextRequest): Promise<string | null> {
    // First try to get token from Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (decoded && decoded.userId) {
            return decoded.userId;
        }
    }
    
    // Then try to get token from cookie
    const token = req.cookies.get('authToken')?.value;
    if (token) {
        const decoded = verifyToken(token);
        if (decoded && decoded.userId) {
            return decoded.userId;
        }
    }
    
    return null;
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        // Get user ID from token
        const userId = await getUserIdFromToken(req);
        if (!userId) {
            return NextResponse.json(
                { status: 401, message: 'Unauthorized. Please log in.', data: {} },
                { status: 401 }
            );
        }

        const cart = await getOrCreateCart(userId);

        // Get product details for cart items
        const productIds = cart.items.map((item: { productId: any; }) => item.productId);
        const products = await Product.find({ productId: { $in: productIds }, isDeleted: false })
            .select('productId title images actualPrice weightVsPrice')
            .lean();

        const productMap = new Map(products.map((p) => [p.productId, p]));

        const cartItemsWithDetails = cart.items.map((item: { productId: any; quantity: number; weightOption: any; price: number; }) => {
            const product = productMap.get(item.productId);
            return {
                productId: item.productId,
                productName: product?.title || 'Unknown Product',
                productImage: product?.images?.[0] || null,
                quantity: item.quantity,
                weightOption: item.weightOption,
                price: item.price,
                total: item.price * item.quantity,
                available: !!product,
            };
        });

        const subtotal = cartItemsWithDetails.reduce((sum: any, item: { total: any; }) => sum + item.total, 0);

        return NextResponse.json(
            {
                status: 200,
                message: 'Cart fetched successfully',
                data: {
                    cartId: cart.cartId,
                    items: cartItemsWithDetails,
                    itemCount: cart.items.length,
                    subtotal,
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/cart error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to fetch cart',
                data: {},
            },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        // Get user ID from token
        const userId = await getUserIdFromToken(req);
        if (!userId) {
            return NextResponse.json(
                { status: 401, message: 'Unauthorized. Please log in.', data: {} },
                { status: 401 }
            );
        }

        const url = new URL(req.url);
        const actionQuery = url.searchParams.get('action');

        const body = await req.json().catch(() => ({}));
        const action = (body.action || actionQuery || 'add').toLowerCase();
        const data = body.data || body;

        if (!userId) {
            return NextResponse.json(
                { status: 400, message: 'User ID is required', data: {} },
                { status: 400 }
            );
        }

        const cart = await getOrCreateCart(userId);

        // ADD TO CART
        if (action === 'add') {
            const { productId, quantity, weightOption, price } = data;

            if (!productId) {
                return NextResponse.json(
                    { status: 400, message: 'Product ID is required', data: {} },
                    { status: 400 }
                );
            }

            if (!quantity || quantity < 1) {
                return NextResponse.json(
                    { status: 400, message: 'Valid quantity is required', data: {} },
                    { status: 400 }
                );
            }

            if (!price || price < 0) {
                return NextResponse.json(
                    { status: 400, message: 'Valid price is required', data: {} },
                    { status: 400 }
                );
            }

            // Check if product exists using the same lookup logic as the product route
            let product;
            try {
                // First try to find by _id if it's a valid ObjectId
                if (/^[0-9a-fA-F]{24}$/.test(productId)) {
                    product = await Product.findOne({ _id: productId, isDeleted: false });
                }
                
                // If not found by _id or not a valid ObjectId, try by productId
                if (!product) {
                    product = await Product.findOne({ productId, isDeleted: false });
                }
                
                if (!product) {
                    console.error('Product not found for ID:', productId);
                    return NextResponse.json(
                        { 
                            status: 'error',
                            message: 'Product not found. It may have been removed or is no longer available.',
                            data: { productId }
                        },
                        { status: 404 }
                    );
                }
            } catch (error) {
                console.error('Error looking up product:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return NextResponse.json(
                    { 
                        status: 'error',
                        message: 'Error looking up product',
                        data: { error: errorMessage }
                    },
                    { status: 500 }
                );
            }

            // Check if item already in cart
            const existingItemIndex = cart.items.findIndex(
                (item: { productId: any; weightOption: any; }) => item.productId === productId && item.weightOption === weightOption
            );

            if (existingItemIndex >= 0) {
                // Update quantity
                cart.items[existingItemIndex].quantity += Number(quantity);
            } else {
                // Add new item
                cart.items.push({
                    productId,
                    quantity: Number(quantity),
                    weightOption: weightOption || null,
                    price: Number(price),
                });
            }

            await cart.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Item added to cart successfully',
                    data: { cartId: cart.cartId, itemCount: cart.items.length },
                },
                { status: 200 }
            );
        }

        // UPDATE QUANTITY
        if (action === 'update') {
            const { productId, quantity, weightOption } = data;

            if (!productId) {
                return NextResponse.json(
                    { status: 400, message: 'Product ID is required', data: {} },
                    { status: 400 }
                );
            }

            if (quantity === undefined || quantity < 0) {
                return NextResponse.json(
                    { status: 400, message: 'Valid quantity is required', data: {} },
                    { status: 400 }
                );
            }

            const itemIndex = cart.items.findIndex(
                (item: { productId: any; weightOption: any; }) => item.productId === productId && item.weightOption === (weightOption || null)
            );

            if (itemIndex === -1) {
                return NextResponse.json(
                    { status: 404, message: 'Item not found in cart', data: {} },
                    { status: 404 }
                );
            }

            if (quantity === 0) {
                // Remove item
                cart.items.splice(itemIndex, 1);
            } else {
                // Update quantity
                cart.items[itemIndex].quantity = Number(quantity);
            }

            await cart.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Cart updated successfully',
                    data: { cartId: cart.cartId, itemCount: cart.items.length },
                },
                { status: 200 }
            );
        }

        // REMOVE ITEM
        if (action === 'remove') {
            const { productId, weightOption } = data;

            if (!productId) {
                return NextResponse.json(
                    { status: 400, message: 'Product ID is required', data: {} },
                    { status: 400 }
                );
            }

            const itemIndex = cart.items.findIndex(
                (item: { productId: any; weightOption: any; }) => item.productId === productId && item.weightOption === (weightOption || null)
            );

            if (itemIndex === -1) {
                return NextResponse.json(
                    { status: 404, message: 'Item not found in cart', data: {} },
                    { status: 404 }
                );
            }

            cart.items.splice(itemIndex, 1);
            await cart.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Item removed from cart successfully',
                    data: { cartId: cart.cartId, itemCount: cart.items.length },
                },
                { status: 200 }
            );
        }

        // CLEAR CART
        if (action === 'clear') {
            cart.items = [];
            await cart.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Cart cleared successfully',
                    data: { cartId: cart.cartId, itemCount: 0 },
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { status: 400, message: 'Invalid action', data: {} },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('POST /api/cart error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to process cart action',
                data: {},
            },
            { status: 500 }
        );
    }
}
