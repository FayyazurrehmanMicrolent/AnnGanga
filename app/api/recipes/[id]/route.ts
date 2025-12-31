import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Recipe from '@/models/recipe';
import Wishlist from '@/models/wishlist';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } } | any) {
    try {
        await connectDB();

        // prefer framework params, fallback to parsing URL
        let id = params?.id;
        if (!id) {
            try {
                const url = new URL(req.url, `http://${req.headers.get('host') || 'localhost:3000'}`);
                const parts = url.pathname.split('/').filter(Boolean);
                id = parts.length ? decodeURIComponent(parts[parts.length - 1]) : undefined;
            } catch (e) {
                id = undefined;
            }
        }

        if (!id) {
            return NextResponse.json({ status: 400, message: 'Recipe id is required', data: {} }, { status: 400 });
        }

        // try recipeId first, then _id
        let recipe: any = await Recipe.findOne({ recipeId: id, isDeleted: false }).lean();
        if (!recipe) {
            try {
                recipe = await Recipe.findOne({ _id: id, isDeleted: false }).lean();
            } catch (e) {
                recipe = null;
            }
        }

        if (!recipe) {
            return NextResponse.json({ status: 404, message: 'Recipe not found', data: {} }, { status: 404 });
        }

        recipe = { ...recipe, isLike: recipe.isLike ?? false };

        // compute per-user isLike when auth provided
        try {
            const authHeader = req.headers.get('authorization');
            let token: string | undefined;
            if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
            if (!token) token = req.cookies.get('authToken')?.value || undefined;
            if (token) {
                const decoded: any = verifyToken(token);
                const userId = decoded?.userId;
                if (userId) {
                    const wishlist: any = await Wishlist.findOne({ userId }).lean();
                    const recipeIds = (wishlist?.items || []).map((it: any) => String(it.recipeId));
                    const recipeSet = new Set(recipeIds);
                    recipe.isLike = recipeSet.has(String(recipe._id));
                }
            }
        } catch (e) {
            console.warn('Could not compute per-user isLike for recipe detail:', e);
        }

        return NextResponse.json({ status: 200, message: 'Recipe fetched', data: recipe }, { status: 200 });
    } catch (error: any) {
        console.error('GET /api/recipes/[id] error', error);
        return NextResponse.json({ status: 500, message: error.message || 'Failed to fetch recipe', data: {} }, { status: 500 });
    }
}
