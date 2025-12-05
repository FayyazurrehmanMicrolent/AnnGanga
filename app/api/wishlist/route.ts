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
    return handleGetWishlist(req);
}

// POST: Add item to wishlist
export async function POST(req: NextRequest) {
    return handleAddToWishlist(req);
}

// DELETE: Remove item from wishlist
export async function DELETE(req: NextRequest) {
    return handleRemoveFromWishlist(req);
}

// Handle GET /api/wishlist
async function handleGetWishlist(req: NextRequest) {
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

        // Find wishlist or create a new one if it doesn't exist
        let wishlist = await Wishlist.findOne({ userId });
        
        // If no wishlist exists, create a new one and return empty
        if (!wishlist) {
            const newWishlist = new Wishlist({ userId, items: [] });
            await newWishlist.save();
            return NextResponse.json(
                { status: 200, message: 'Wishlist is empty', data: { items: [] } },
                { status: 200 }
            );
        }

        // If wishlist exists but has no items
        if (!wishlist.items || wishlist.items.length === 0) {
            return NextResponse.json(
                { status: 200, message: 'Wishlist is empty', data: { items: [] } },
                { status: 200 }
            );
        }

        // Get all product IDs from the wishlist
        const productIds = wishlist.items.map((item: any) => item.productId);
        
        // Find all products that match the productIds (using _id)
        const products = await Product.find({
            _id: { $in: productIds },
            isDeleted: false
        }).select('_id title mrp actualPrice images categoryId productId');

        // Create a map of products by _id for quick lookup
        const productMap = new Map();
        products.forEach((product: any) => {
            if (product._id) {
                productMap.set(product._id.toString(), product);
            }
        });

        // Create the populated wishlist items
        const populatedItems = wishlist.items.map((item: any) => {
            const itemId = item.productId?.toString();
            if (!itemId) return null;
            
            // Find the product by _id
            const product = productMap.get(itemId);
            if (!product) {
                console.warn(`Product not found for ID: ${itemId}`);
                return null;
            }

            // Always return the _id as productId for frontend consistency
            return {
                productId: product._id.toString(),
                title: product.title,
                mrp: product.mrp,
                actualPrice: product.actualPrice,
                images: product.images,
                categoryId: product.categoryId,
                addedAt: item.addedAt || new Date()
            };
        }).filter(Boolean);

        if (populatedItems.length === 0) {
            return NextResponse.json(
                { status: 200, message: 'Wishlist is empty', data: { items: [] } },
                { status: 200 }
            );
        }

        const wishlistItems = populatedItems.map((item: any) => ({
            productId: item.productId,
            title: item.title,
            mrp: item.mrp,
            actualPrice: item.actualPrice,
            images: item.images,
            categoryId: item.categoryId,
            addedAt: item.addedAt
        }));

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

// Handle POST /api/wishlist (add item)
async function handleAddToWishlist(req: NextRequest) {
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
        console.log('Looking for product with ID:', productId);
        
        // Try to find by _id (MongoDB ObjectId) first, then by productId (UUID)
        let product = await Product.findOne({ 
            _id: productId,
            isDeleted: false 
        });
        
        // If not found, try finding by productId (UUID)
        if (!product) {
            product = await Product.findOne({ 
                productId: productId,
                isDeleted: false 
            });
        }
        
        if (!product) {
            console.error('Product not found with ID:', productId);
            // List some available products for debugging
            const sampleProducts = await Product.find({ isDeleted: false }).limit(3).select('_id productId title');
            console.log('Sample available products:', sampleProducts);
            
            return NextResponse.json(
                { 
                    status: 404, 
                    message: 'Product not found. Please check the product ID.',
                    data: { 
                        requestedId: productId,
                        sampleProductIds: sampleProducts.map(p => ({
                            _id: p._id,
                            productId: p.productId,
                            title: p.title
                        }))
                    } 
                },
                { status: 404 }
            );
        }

        // Store the _id in wishlist for consistency
        const productIdToStore = product._id.toString();

        // Find or create wishlist
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [] });
        }

        // Check if product already in wishlist using _id
        const existingItemIndex = wishlist.items.findIndex(
            (item: { productId: string }) => item.productId.toString() === productIdToStore
        );

        if (existingItemIndex > -1) {
            return NextResponse.json(
                { status: 400, message: 'Product already in wishlist', data: {} },
                { status: 400 }
            );
        }

        // Add to wishlist using _id
        wishlist.items.push({
            productId: productIdToStore,
            addedAt: new Date(),
        });

        await wishlist.save();

        return NextResponse.json({
            status: 201,
            message: 'Product added to wishlist',
            data: {
                productId: productIdToStore,
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

// Handle DELETE /api/wishlist (remove item)
async function handleRemoveFromWishlist(req: NextRequest) {
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

        // Find wishlist
        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            return NextResponse.json(
                { status: 404, message: 'Wishlist not found', data: {} },
                { status: 404 }
            );
        }

        // Convert productId to string for comparison
        const productIdStr = productId.toString();
        
        // Remove item from wishlist
        const initialLength = wishlist.items.length;
        wishlist.items = wishlist.items.filter(
            (item: { productId: any }) => {
                const itemId = item.productId ? item.productId.toString() : null;
                return itemId !== productId.toString();
            }
        );

        // Check if item was actually removed
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
