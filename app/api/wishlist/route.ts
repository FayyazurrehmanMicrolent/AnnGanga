import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/db';
import Wishlist from '@/models/wishlist';
import Product from '@/models/product';
import Recipe from '@/models/recipe';

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
    return handleUpsertWishlist(req);
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

        // Build lists of product and recipe ids from wishlist
        const productIds = wishlist.items.map((item: any) => item.productId).filter(Boolean);
        const recipeIds = wishlist.items.map((item: any) => item.recipeId).filter(Boolean);

        // Fetch products and recipes
        const [products, recipes] = await Promise.all([
            Product.find({ _id: { $in: productIds }, isDeleted: false }).select('_id title mrp actualPrice images categoryId productId weightVsPrice'),
            Recipe.find({ _id: { $in: recipeIds }, isDeleted: false }).select('_id title images recipeId')
        ]);

        const productMap = new Map();
        products.forEach((product: any) => {
            if (product._id) productMap.set(product._id.toString(), product);
        });

        const recipeMap = new Map();
        recipes.forEach((recipe: any) => {
            if (recipe._id) recipeMap.set(recipe._id.toString(), recipe);
        });

        // Create populated wishlist items supporting both products and recipes
        const populatedItems = wishlist.items.map((item: any) => {
            if (item.productId) {
                const id = item.productId.toString();
                const product = productMap.get(id);
                if (!product) return null;
                return {
                    type: 'product',
                    productId: product._id.toString(),
                    title: product.title,
                    mrp: product.mrp,
                    actualPrice: product.actualPrice,
                    images: product.images,
                    categoryId: product.categoryId,
                    // provide a primary weight (first entry) and the full weight/price options
                    weight: Array.isArray(product.weightVsPrice) && product.weightVsPrice.length ? product.weightVsPrice[0].weight : null,
                    weightVsPrice: product.weightVsPrice || [],
                    addedAt: item.addedAt || new Date()
                };
            }

            if (item.recipeId) {
                const id = item.recipeId.toString();
                const recipe = recipeMap.get(id);
                if (!recipe) return null;
                return {
                    type: 'recipe',
                    recipeId: recipe._id.toString(),
                    title: recipe.title,
                    images: recipe.images,
                    addedAt: item.addedAt || new Date()
                };
            }

            return null;
        }).filter(Boolean);

        if (populatedItems.length === 0) {
            return NextResponse.json(
                { status: 200, message: 'Wishlist is empty', data: { items: [] } },
                { status: 200 }
            );
        }

        return NextResponse.json({
            status: 200,
            message: 'Wishlist fetched successfully',
            data: {
                items: populatedItems,
                count: populatedItems.length,
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
        const { productId, recipeId } = body;

        if (!productId && !recipeId) {
            return NextResponse.json(
                { status: 400, message: 'productId or recipeId is required', data: {} },
                { status: 400 }
            );
        }

        // Find or create wishlist
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [] });
        }

        // Handle product add
        if (productId) {
            // Verify product exists
            let product = await Product.findOne({ _id: productId, isDeleted: false });
            if (!product) product = await Product.findOne({ productId: productId, isDeleted: false });
            if (!product) {
                return NextResponse.json({ status: 404, message: 'Product not found', data: {} }, { status: 404 });
            }
            const productIdToStore = product._id.toString();
            const exists = wishlist.items.find((it: any) => it.productId && it.productId.toString() === productIdToStore);
            if (exists) return NextResponse.json({ status: 400, message: 'Product already in wishlist', data: {} }, { status: 400 });
            wishlist.items.push({ productId: productIdToStore, addedAt: new Date() });
            await wishlist.save();
            console.log('[wishlist] add product -> userId:', userId, 'productId:', productIdToStore, 'itemsCount:', wishlist.items.length);
            return NextResponse.json({ status: 201, message: 'Product added to wishlist', data: { productId: productIdToStore, count: wishlist.items.length } }, { status: 201 });
        }

        // Handle recipe add
        if (recipeId) {
            let recipe = await Recipe.findOne({ _id: recipeId, isDeleted: false });
            if (!recipe) recipe = await Recipe.findOne({ recipeId: recipeId, isDeleted: false });
            if (!recipe) {
                return NextResponse.json({ status: 404, message: 'Recipe not found', data: {} }, { status: 404 });
            }
            const recipeIdToStore = recipe._id.toString();
            const exists = wishlist.items.find((it: any) => it.recipeId && it.recipeId.toString() === recipeIdToStore);
            if (exists) return NextResponse.json({ status: 400, message: 'Recipe already in wishlist', data: {} }, { status: 400 });
            wishlist.items.push({ recipeId: recipeIdToStore, addedAt: new Date() });
            await wishlist.save();
            console.log('[wishlist] add recipe -> userId:', userId, 'recipeId:', recipeIdToStore, 'itemsCount:', wishlist.items.length);
            return NextResponse.json({ status: 201, message: 'Recipe added to wishlist' }, { status: 201 });
        }
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        return NextResponse.json(
            { status: 500, message: 'Internal server error', data: {} },
            { status: 500 }
        );
    }
}

// Handle POST /api/wishlist for both add and remove based on isLike
async function handleUpsertWishlist(req: NextRequest) {
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
        const { productId, recipeId, isLike } = body;

        if (!productId && !recipeId) {
            return NextResponse.json(
                { status: 400, message: 'productId or recipeId is required', data: {} },
                { status: 400 }
            );
        }

        // If client explicitly sent isLike === false treat as remove
        if (isLike === false) {
            // Find wishlist
            const wishlist = await Wishlist.findOne({ userId });
            if (!wishlist) {
                return NextResponse.json(
                    { status: 404, message: 'Wishlist not found', data: {} },
                    { status: 404 }
                );
            }

            const initialLength = wishlist.items.length;

            if (productId) {
                wishlist.items = wishlist.items.filter((item: any) => {
                    const itemId = item.productId ? item.productId.toString() : null;
                    return itemId !== productId.toString();
                });
            }

            if (recipeId) {
                wishlist.items = wishlist.items.filter((item: any) => {
                    const itemId = item.recipeId ? item.recipeId.toString() : null;
                    return itemId !== recipeId.toString();
                });
            }

            if (wishlist.items.length === initialLength) {
                return NextResponse.json(
                    { status: 404, message: 'Item not found in wishlist', data: {} },
                    { status: 404 }
                );
            }

            await wishlist.save();
            console.log('[wishlist] removed via upsert -> userId:', userId, 'productId:', productId || null, 'recipeId:', recipeId || null, 'itemsCount:', wishlist.items.length);

            return NextResponse.json({
                status: 200,
                message: 'Item removed from wishlist',        
            });
        }

        // Otherwise treat as add (isLike omitted or true)
        // Find or create wishlist
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [] });
        }

        // Handle product add
        if (productId) {
            // Verify product exists
            let product = await Product.findOne({ _id: productId, isDeleted: false });
            if (!product) product = await Product.findOne({ productId: productId, isDeleted: false });
            if (!product) {
                return NextResponse.json({ status: 404, message: 'Product not found', data: {} }, { status: 404 });
            }
            const productIdToStore = product._id.toString();
            const exists = wishlist.items.find((it: any) => it.productId && it.productId.toString() === productIdToStore);
            if (exists) return NextResponse.json({ status: 400, message: 'Product already in wishlist', data: {} }, { status: 400 });
            wishlist.items.push({ productId: productIdToStore, addedAt: new Date() });
            await wishlist.save();
            console.log('[wishlist] add product via upsert -> userId:', userId, 'productId:', productIdToStore, 'itemsCount:', wishlist.items.length);
            return NextResponse.json({ status: 201, message: 'Product added to wishlist', data: { productId: productIdToStore, count: wishlist.items.length } }, { status: 201 });
        }

        // Handle recipe add
        if (recipeId) {
            let recipe = await Recipe.findOne({ _id: recipeId, isDeleted: false });
            if (!recipe) recipe = await Recipe.findOne({ recipeId: recipeId, isDeleted: false });
            if (!recipe) {
                return NextResponse.json({ status: 404, message: 'Recipe not found', data: {} }, { status: 404 });
            }
            const recipeIdToStore = recipe._id.toString();
            const exists = wishlist.items.find((it: any) => it.recipeId && it.recipeId.toString() === recipeIdToStore);
            if (exists) return NextResponse.json({ status: 400, message: 'Recipe already in wishlist', data: {} }, { status: 400 });
            wishlist.items.push({ recipeId: recipeIdToStore, addedAt: new Date() });
            await wishlist.save();
            console.log('[wishlist] add recipe via upsert -> userId:', userId, 'recipeId:', recipeIdToStore, 'itemsCount:', wishlist.items.length);
            return NextResponse.json({ status: 201, message: 'Recipe added to wishlist' }, { status: 201 });
        }
    } catch (error) {
        console.error('Error upserting wishlist:', error);
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
        const { productId, recipeId } = body;

        if (!productId && !recipeId) {
            return NextResponse.json(
                { status: 400, message: 'productId or recipeId is required', data: {} },
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

        const initialLength = wishlist.items.length;

        if (productId) {
            wishlist.items = wishlist.items.filter((item: any) => {
                const itemId = item.productId ? item.productId.toString() : null;
                return itemId !== productId.toString();
            });
        }

        if (recipeId) {
            wishlist.items = wishlist.items.filter((item: any) => {
                const itemId = item.recipeId ? item.recipeId.toString() : null;
                return itemId !== recipeId.toString();
            });
        }

        // Check if item was actually removed
        if (wishlist.items.length === initialLength) {
            return NextResponse.json(
                { status: 404, message: 'Item not found in wishlist', data: {} },
                { status: 404 }
            );
        }

        await wishlist.save();
        console.log('[wishlist] removed -> userId:', userId, 'productId:', productId || null, 'recipeId:', recipeId || null, 'itemsCount:', wishlist.items.length);

        return NextResponse.json({
            status: 200,
            message: 'Item removed from wishlist',
        });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        return NextResponse.json(
            { status: 500, message: 'Internal server error', data: {} },
            { status: 500 }
        );
    }
}
