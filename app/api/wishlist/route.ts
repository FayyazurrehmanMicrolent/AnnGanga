import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/db';
import Wishlist from '@/models/wishlist';
import Product from '@/models/product';

// Helper function to extract userId from token
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

// GET: Fetch user's wishlist
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

        // Find or create wishlist
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [] });
            await wishlist.save();
        }

        // Populate product details for wishlist items
        const productIds = wishlist.items.map((item: { productId: string }) => item.productId);
        const products = await Product.find({ 
            productId: { $in: productIds }, 
            isDeleted: false 
        });

        // Map products with wishlist metadata
        const wishlistItems = wishlist.items.map((item: { productId: string; addedAt: Date }) => {
            const product = products.find(p => p.productId === item.productId);
            if (!product) return null;
            
            return {
                productId: product.productId,
                title: product.title,
                mrp: product.mrp,
                actualPrice: product.actualPrice,
                images: product.images,
                categoryId: product.categoryId,
                addedAt: item.addedAt,
            };
        }).filter(Boolean);

        return NextResponse.json({
            status: 200,
            message: 'Wishlist fetched successfully',
            data: {
                items: wishlistItems,
                count: wishlistItems.length,
            },
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        return NextResponse.json(
            { status: 500, message: 'Internal server error', data: {} },
            { status: 500 }
        );
    }
}

// POST: Add item to wishlist
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

        const body = await req.json();
        const { productId } = body;

        if (!productId) {
            return NextResponse.json(
                { status: 400, message: 'Product ID is required', data: {} },
                { status: 400 }
            );
        }

        // Verify product exists and is not deleted
        const product = await Product.findOne({ productId, isDeleted: false });
        if (!product) {
            return NextResponse.json(
                { status: 404, message: 'Product not found', data: {} },
                { status: 404 }
            );
        }

        // Find or create wishlist
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [] });
        }

        // Check if product already in wishlist
        const existingItemIndex = wishlist.items.findIndex(
            (item: { productId: string }) => item.productId === productId
        );

        if (existingItemIndex > -1) {
            return NextResponse.json(
                { status: 400, message: 'Product already in wishlist', data: {} },
                { status: 400 }
            );
        }

        // Add to wishlist
        wishlist.items.push({
            productId,
            addedAt: new Date(),
        });

        await wishlist.save();

        return NextResponse.json({
            status: 201,
            message: 'Product added to wishlist',
            data: {
                productId,
                count: wishlist.items.length,
            },
        });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        return NextResponse.json(
            { status: 500, message: 'Internal server error', data: {} },
            { status: 500 }
        );
    }
}

// DELETE: Remove item from wishlist
export async function DELETE(req: NextRequest) {
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

        const { searchParams } = new URL(req.url);
        const productId = searchParams.get('productId');

        if (!productId) {
            return NextResponse.json(
                { status: 400, message: 'Product ID is required', data: {} },
                { status: 400 }
            );
        }

        // Find wishlist
        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            return NextResponse.json(
                { status: 404, message: 'Wishlist not found', data: {} },
                { status: 404 }
            );
        }

        // Remove item from wishlist
        const initialLength = wishlist.items.length;
        wishlist.items = wishlist.items.filter(
            (item: { productId: string }) => item.productId !== productId
        );

        if (wishlist.items.length === initialLength) {
            return NextResponse.json(
                { status: 404, message: 'Product not found in wishlist', data: {} },
                { status: 404 }
            );
        }

        await wishlist.save();

        return NextResponse.json({
            status: 200,
            message: 'Product removed from wishlist',
            data: {
                productId,
                count: wishlist.items.length,
            },
        });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        return NextResponse.json(
            { status: 500, message: 'Internal server error', data: {} },
            { status: 500 }
        );
    }
}
