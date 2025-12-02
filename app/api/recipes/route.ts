import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Recipe from '@/models/recipe';
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
            return NextResponse.json(
                { status: 200, message: 'Recipe fetched', data: recipe },
                { status: 200 }
            );
        }

        const recipes = await Recipe.find({ isDeleted: false }).sort({ createdAt: -1 }).lean();
        return NextResponse.json(
            { status: 200, message: 'Recipes fetched', data: recipes },
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
        }

        const data = parsedData || {};

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
