import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Recipe from '@/models/recipe';
import { verifyToken } from '@/lib/auth';
import Wishlist from '@/models/wishlist';
import { saveUpload } from '@/lib/upload';

// Helper: find recipe safely by recipeId (uuid) or by Mongo _id
async function findRecipeByIdSafe(id: string) {
    if (!id) return null;
    // try recipeId (UUID) first
    let recipe = await Recipe.findOne({ recipeId: id, isDeleted: false });
    if (recipe) return recipe;
    // try _id lookup
    try {
        recipe = await Recipe.findOne({ _id: id, isDeleted: false });
        return recipe;
    } catch (e) {
        return null;
    }
}

// GET: Fetch all recipes or a single recipe by id
export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url, `http://${req.headers.get('host') || 'localhost:3000'}`);
        const id = url.searchParams.get('id') || url.searchParams.get('recipeId');

        if (id) {
            const recipe = await findRecipeByIdSafe(id);
            if (!recipe) {
                return NextResponse.json(
                    { status: 404, message: 'Recipe not found', data: {} },
                    { status: 404 }
                );
            }

                // Ensure `isLike` is always present (defaults to false if not set in DB)
                const out = typeof recipe.toObject === 'function' ? recipe.toObject() : recipe;
                out.isLike = out.isLike ?? false;

                // If user is authenticated, compute per-user isLike from wishlist
                try {
                    // extract token from Authorization header or cookie
                    const authHeader = req.headers.get('authorization');
                    let token: string | undefined;
                    if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
                    if (!token) token = req.cookies.get('authToken')?.value || undefined;
                    if (token) {
                        const decoded: any = verifyToken(token);
                        const userId = decoded?.userId;
                        console.log('[recipes GET single] token present -> userId:', userId);
                        if (userId) {
                            const wishlist: any = await Wishlist.findOne({ userId }).lean();
                            const recipeIds = (wishlist?.items || []).map((it: any) => String(it.recipeId));
                            console.log('[recipes GET single] user wishlist recipeIds:', recipeIds);
                            const recipeSet = new Set(recipeIds);
                            out.isLike = recipeSet.has(String(out._id));
                        }
                    } else {
                        console.log('[recipes GET single] no token found');
                    }
                } catch (e) {
                    // ignore wishlist lookup errors and leave isLike as default
                    console.warn('Could not compute per-user isLike:', e);
                }

            return NextResponse.json(
                { status: 200, message: 'Recipe fetched', data: out },
                { status: 200 }
            );
        }

        // Pagination & search support
        const pageParam = url.searchParams.get('page') || url.searchParams.get('pageNo') || url.searchParams.get('p');
        const limitParam = url.searchParams.get('limit') || url.searchParams.get('pageSize') || url.searchParams.get('size');
        const searchParam = url.searchParams.get('search') || url.searchParams.get('q');

        const page = Math.max(1, Number(pageParam) || 1);
        const limit = Math.min(100, Math.max(1, Number(limitParam) || 20));

        const filter: any = { isDeleted: false };
        if (searchParam && String(searchParam).trim()) {
            const q = String(searchParam).trim();
            const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [
                { title: regex },
                { description: regex },
                { tags: { $in: [regex] } },
                { ingredients: { $in: [regex] } }
            ];
        }

        const total = await Recipe.countDocuments(filter);
        const totalPages = Math.ceil(total / limit) || 1;

        let recipes: any[] = await Recipe.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        // Attach per-user isLike flags when user authenticated
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
                    recipes = recipes.map((r: any) => ({ ...r, isLike: recipeSet.has(String(r._id)) }));
                } else {
                    recipes = recipes.map((r: any) => ({ ...r, isLike: r.isLike ?? false }));
                }
            } else {
                recipes = recipes.map((r: any) => ({ ...r, isLike: r.isLike ?? false }));
            }
        } catch (e) {
            console.warn('Could not compute per-user isLike for list:', e);
            recipes = recipes.map((r: any) => ({ ...r, isLike: r.isLike ?? false }));
        }

        return NextResponse.json(
            {
                status: 200,
                message: 'Recipes fetched',
                data: {
                    items: recipes,
                    total,
                    page,
                    limit,
                    totalPages
                }
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/recipes error', error);
        return NextResponse.json(
            { status: 500, message: error.message || 'Failed to fetch recipes', data: {} },
            { status: 500 }
        );
    }
}

// POST: Create, Edit, or Delete a recipe
export async function POST(req: NextRequest) {
    try {
        await connectDB();

        let action = 'create';
        let parsedData: any = null;
        let imagesPaths: string[] = [];
        let id: string | null = null;

        const contentType = req.headers.get('content-type') || '';

        // Parse query params
        const url = new URL(req.url, `http://${req.headers.get('host') || 'localhost:3000'}`);
        const qAction = url.searchParams.get('action');
        const qId = url.searchParams.get('id') || url.searchParams.get('recipeId');
        if (qAction) action = String(qAction).toLowerCase();
        if (qId) id = String(qId);

        if (contentType.includes('application/json')) {
            const body = await req.json().catch(() => ({}));
            action = (body.action || action).toLowerCase();
            parsedData = body.data || body;
            id = body.id || body.recipeId || id;
            if (Array.isArray(body.images)) imagesPaths = body.images;
        } else if (contentType.includes('multipart/form-data') || contentType.includes('form-data')) {
            const form = await req.formData();

            const dataField = form.get('data');
            if (dataField) {
                try {
                    parsedData = JSON.parse(String(dataField));
                } catch (e) {
                    parsedData = null;
                }
            }

            if (!parsedData) parsedData = {};

            // Merge direct form fields
            const directKeys = ['title', 'description', 'ingredients', 'instructions', 'prepTime', 'cookTime', 'servings', 'tags', 'productLinks'];
            for (const k of directKeys) {
                const v = form.get(k);
                if (v !== null && v !== undefined) {
                    const s = String(v);
                    if (k === 'ingredients' || k === 'instructions' || k === 'tags' || k === 'productLinks') {
                        try {
                            parsedData[k] = JSON.parse(s);
                        } catch (e) {
                            parsedData[k] = s.split(',').map((x: string) => x.trim()).filter(Boolean);
                        }
                    } else if (k === 'prepTime' || k === 'cookTime' || k === 'servings') {
                        parsedData[k] = Number(s);
                    } else {
                        parsedData[k] = s;
                    }
                }
            }

            const a = form.get('action') || (parsedData && parsedData.action);
            action = a ? String(a).toLowerCase() : action;
            const i = form.get('id') || (parsedData && (parsedData.id || parsedData.recipeId));
            id = i ? String(i) : id;

            // Collect image files
            const collectedFiles: Blob[] = [];
            for (const entry of form.entries() as any) {
                const [key, value] = entry;
                const lower = String(key || '').toLowerCase();
                if (lower.includes('image')) {
                    if (value && typeof (value as any).size !== 'undefined') {
                        collectedFiles.push(value as Blob);
                    }
                }
            }

            if (collectedFiles.length) {
                for (const f of collectedFiles) {
                    if (f && (f as any).size) {
                        const saved = await saveUpload(f as Blob, 'recipes');
                        if (saved) imagesPaths.push(saved);
                    }
                }
            }
        } else {
            // Fallback: some clients (Postman raw/text) may omit Content-Type.
            // Try to parse body as JSON if present so callers can POST { action:'list', ... }
            try {
                const body = await req.json();
                if (body && typeof body === 'object') {
                    action = (body.action || action).toLowerCase();
                    parsedData = body.data || body;
                    id = body.id || body.recipeId || id;
                    if (Array.isArray(body.images)) imagesPaths = body.images;
                }
            } catch (e) {
                // ignore parse errors and keep defaults
            }
        }

        const data = parsedData || {};

        // Handle per-user like/unlike actions (sync with wishlist)
        const likeActions = ['setlike', 'togglelike', 'toggle-like', 'like', 'unlike'];
        // allow implicit like/unlike when body contains recipeId + isLike (even if action is 'create')
        const bodyHasLike = typeof data.recipeId !== 'undefined' && typeof data.isLike === 'boolean';
        if (likeActions.includes(action) || bodyHasLike) {
            // Need authenticated user
            const authHeader = req.headers.get('authorization');
            let token: string | undefined;
            if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
            if (!token) token = req.cookies.get('authToken')?.value || undefined;
            if (!token) {
                return NextResponse.json({ status: 401, message: 'Unauthorized. Please log in.', data: {} }, { status: 401 });
            }

            const decoded: any = verifyToken(token);
            const userId = decoded?.userId;
            if (!userId) {
                return NextResponse.json({ status: 401, message: 'Invalid token', data: {} }, { status: 401 });
            }

            const recipeIdParam = id || data.recipeId || data.id;
            if (!recipeIdParam) {
                return NextResponse.json({ status: 400, message: 'Recipe id is required', data: {} }, { status: 400 });
            }

            const recipe = await findRecipeByIdSafe(String(recipeIdParam));
            if (!recipe) {
                return NextResponse.json({ status: 404, message: 'Recipe not found', data: {} }, { status: 404 });
            }

            let wishlist = await Wishlist.findOne({ userId });
            if (!wishlist) wishlist = new Wishlist({ userId, items: [] });

            const recipeIdToStore = recipe._id.toString();

            // Decide desired state. If caller provided explicit boolean (`isLike`) use it.
            let desired: boolean | null = null;
            if (typeof data.isLike === 'boolean') desired = data.isLike;
            else if (action === 'like') desired = true;
            else if (action === 'unlike') desired = false;

            // If toggle requested and desired not set, invert
            if (desired === null && (action === 'togglelike' || action === 'toggle-like')) {
                const exists = wishlist.items.some((it: any) => String(it.recipeId) === recipeIdToStore);
                desired = !exists;
            }

            // If bodyHasLike is true (explicit isLike provided), it takes precedence and already set above.
            // Fallback: if still null, treat as like
            if (desired === null) desired = true;

            if (desired) {
                const exists = wishlist.items.some((it: any) => String(it.recipeId) === recipeIdToStore);
                if (!exists) {
                    wishlist.items.push({ recipeId: recipeIdToStore, addedAt: new Date() });
                    await wishlist.save();
                }
                return NextResponse.json({ status: 200, message: 'Recipe added to wishlist', data: { recipeId: recipeIdToStore, isLike: true } }, { status: 200 });
            } else {
                const initialLength = wishlist.items.length;
                wishlist.items = wishlist.items.filter((it: any) => String(it.recipeId) !== recipeIdToStore);
                if (wishlist.items.length !== initialLength) await wishlist.save();
                return NextResponse.json({ status: 200, message: 'Recipe removed from wishlist', data: { recipeId: recipeIdToStore, isLike: false } }, { status: 200 });
            }
        }

        // Allow listing via POST with JSON body: { action: 'list', page, limit, search, ... }
        if (action === 'list' || action === 'fetch' || action === 'search') {
            const page = Math.max(1, Number(data.page) || 1);
            const limit = Math.min(100, Math.max(1, Number(data.limit) || 20));

            const filter: any = { isDeleted: false };
            const searchParam = data.search || data.q || data.query;
            if (searchParam && String(searchParam).trim()) {
                const q = String(searchParam).trim();
                const regex = new RegExp(q.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&'), 'i');
                filter.$or = [
                    { title: regex },
                    { description: regex },
                    { tags: { $in: [regex] } },
                    { ingredients: { $in: [regex] } }
                ];
            }

            // allow exact tag filters as array
            if (Array.isArray(data.tags) && data.tags.length) {
                filter.tags = { $in: data.tags };
            }

            const total = await Recipe.countDocuments(filter);
            const totalPages = Math.ceil(total / limit) || 1;

            let recipes: any[] = await Recipe.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();

            // attach per-user isLike if token present
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
                        recipes = recipes.map((r: any) => ({ ...r, isLike: recipeSet.has(String(r._id)) }));
                    } else {
                        recipes = recipes.map((r: any) => ({ ...r, isLike: r.isLike ?? false }));
                    }
                } else {
                    recipes = recipes.map((r: any) => ({ ...r, isLike: r.isLike ?? false }));
                }
            } catch (e) {
                console.warn('Could not compute per-user isLike for POST list:', e);
                recipes = recipes.map((r: any) => ({ ...r, isLike: r.isLike ?? false }));
            }

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Recipes fetched',
                    data: {
                        items: recipes,
                        total,
                        page,
                        limit,
                        totalPages
                    }
                },
                { status: 200 }
            );
        }

        if (action === 'create') {
            const { title, description, ingredients, instructions, prepTime, cookTime, servings, tags, productLinks } = data;

            if (!title || !title.trim()) {
                return NextResponse.json(
                    { status: 400, message: 'Recipe title is required', data: {} },
                    { status: 400 }
                );
            }

            if (!Array.isArray(ingredients) || ingredients.length === 0) {
                return NextResponse.json(
                    { status: 400, message: 'Ingredients are required', data: {} },
                    { status: 400 }
                );
            }

            if (!Array.isArray(instructions) || instructions.length === 0) {
                return NextResponse.json(
                    { status: 400, message: 'Instructions are required', data: {} },
                    { status: 400 }
                );
            }

            const recipe = new Recipe({
                title: title.trim(),
                description: description?.trim() || null,
                images: imagesPaths,
                ingredients: ingredients.map((x: any) => String(x).trim()).filter(Boolean),
                instructions: instructions.map((x: any) => String(x).trim()).filter(Boolean),
                prepTime: prepTime ? Number(prepTime) : null,
                cookTime: cookTime ? Number(cookTime) : null,
                servings: servings ? Number(servings) : null,
                productLinks: Array.isArray(productLinks) ? productLinks : [],
                tags: Array.isArray(tags) ? tags : [],
            });

            await recipe.save();
            return NextResponse.json(
                { status: 201, message: 'Recipe created', data: recipe },
                { status: 201 }
            );
        }

        if (action === 'edit') {
            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Recipe id is required for edit', data: {} },
                    { status: 400 }
                );
            }

            const recipe = await findRecipeByIdSafe(id);
            if (!recipe) {
                return NextResponse.json(
                    { status: 404, message: 'Recipe not found', data: {} },
                    { status: 404 }
                );
            }

            const { title, description, ingredients, instructions, prepTime, cookTime, servings, tags, productLinks } = data;

            if (title !== undefined) recipe.title = title.trim();
            if (description !== undefined) recipe.description = description?.trim() || null;
            if (Array.isArray(ingredients)) recipe.ingredients = ingredients.map((x: any) => String(x).trim()).filter(Boolean);
            if (Array.isArray(instructions)) recipe.instructions = instructions.map((x: any) => String(x).trim()).filter(Boolean);
            if (prepTime !== undefined) recipe.prepTime = prepTime ? Number(prepTime) : null;
            if (cookTime !== undefined) recipe.cookTime = cookTime ? Number(cookTime) : null;
            if (servings !== undefined) recipe.servings = servings ? Number(servings) : null;
            if (Array.isArray(tags)) recipe.tags = tags;
            if (Array.isArray(productLinks)) recipe.productLinks = productLinks;

            // Handle images
            if (imagesPaths.length) {
                const imagesMode = (data.imagesMode || 'append').toLowerCase();
                if (imagesMode === 'replace') {
                    recipe.images = imagesPaths;
                } else {
                    recipe.images = [...(recipe.images || []), ...imagesPaths];
                }
            }

            // Remove specific images if requested
            if (Array.isArray(data.removeImages) && data.removeImages.length) {
                recipe.images = recipe.images.filter((img: string) => !data.removeImages.includes(img));
            }

            await recipe.save();
            return NextResponse.json(
                { status: 200, message: 'Recipe updated', data: recipe },
                { status: 200 }
            );
        }

        if (action === 'delete') {
            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Recipe id is required for delete', data: {} },
                    { status: 400 }
                );
            }

            const recipe = await findRecipeByIdSafe(id);
            if (!recipe) {
                return NextResponse.json(
                    { status: 404, message: 'Recipe not found', data: {} },
                    { status: 404 }
                );
            }

            recipe.isDeleted = true;
            await recipe.save();

            return NextResponse.json(
                { status: 200, message: 'Recipe deleted', data: {} },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { status: 400, message: 'Invalid action', data: {} },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('POST /api/recipes error', error);
        return NextResponse.json(
            { status: 500, message: error.message || 'Failed to process recipe request', data: {} },
            { status: 500 }
        );
    }
}
