import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Product from '@/models/product';
import Review from '@/models/review';
import Recipe from '@/models/recipe';

async function findProductByIdSafe(id: string) {
  if (!id) return null;
  let product = await Product.findOne({ productId: id, isDeleted: false });
  if (product) return product;
  try {
    product = await Product.findOne({ _id: id, isDeleted: false });
    return product;
  } catch (e) {
    return null;
  }
}

// POST /api/product/more
// body: { productId: string, items: [{ productId?: string, recipeId?: string }] }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const productId = String(body.productId || body.id || body._id || '').trim();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!productId) {
      return NextResponse.json({ status: 400, message: 'productId is required', data: {} }, { status: 400 });
    }
    if (!items.length) {
      return NextResponse.json({ status: 400, message: 'items array is required', data: {} }, { status: 400 });
    }

    const product = await findProductByIdSafe(productId);
    if (!product) return NextResponse.json({ status: 404, message: 'Product not found', data: {} }, { status: 404 });

    // Normalize to array of ids (strings). Accept objects with recipeId/productId or just strings.
    const normalized: string[] = [];
    for (const it of items) {
      if (!it) continue;
      if (typeof it === 'string') {
        normalized.push(String(it));
        continue;
      }
      if (it.productId) normalized.push(String(it.productId));
      else if (it.recipeId) normalized.push(String(it.recipeId));
    }

    // Save into product.frequentlyBoughtTogether (replace existing list)
    product.frequentlyBoughtTogether = normalized;
    await product.save();

    return NextResponse.json({ status: 200, message: 'frequentlyBoughtTogether updated', data: { productId: product._id, frequentlyBoughtTogether: normalized } }, { status: 200 });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: 500, message: 'Failed to update frequentlyBoughtTogether', error: msg }, { status: 500 });
  }
}

// GET /api/product/more?id=<productId>
// returns product details + expanded frequentlyBoughtTogether items (product or recipe details)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    let url: URL;
    try {
      url = new URL(req.url);
    } catch (e) {
      const host = req.headers.get('host') || 'localhost:3000';
      url = new URL(req.url, `http://${host}`);
    }

    const id = url.searchParams.get('id') || url.searchParams.get('productId');
    if (!id) return NextResponse.json({ status: 400, message: 'id or productId query param required', data: {} }, { status: 400 });

    const product = await findProductByIdSafe(id);
    if (!product) return NextResponse.json({ status: 404, message: 'Product not found', data: {} }, { status: 404 });

    // Build expanded items: for each id in product.frequentlyBoughtTogether try to resolve as product then recipe
    const fbtRaw = Array.isArray(product.frequentlyBoughtTogether) ? product.frequentlyBoughtTogether.map((x: any) => String(x)) : [];

    // Fetch products and recipes in bulk
    const productCandidates = await Product.find({ $or: [ { _id: { $in: fbtRaw } }, { productId: { $in: fbtRaw } } ], isDeleted: false }).lean();
    const recipeCandidates = await Recipe.find({ $or: [ { _id: { $in: fbtRaw } }, { recipeId: { $in: fbtRaw } } ] }).lean();

    const prodMap = new Map(productCandidates.map((p: any) => [String(p._id), p]));
    const prodByProductId = new Map(productCandidates.map((p: any) => [String(p.productId), p]));
    const recMap = new Map(recipeCandidates.map((r: any) => [String(r._id), r]));
    const recByRecipeId = new Map(recipeCandidates.map((r: any) => [String(r.recipeId), r]));

    // Fetch reviews for product candidates to compute ratings
    const prodIdsForReviews = productCandidates.map((p: any) => p.productId).filter(Boolean);
    const reviews = prodIdsForReviews.length ? await Review.find({ productId: { $in: prodIdsForReviews }, status: 'approved', isDeleted: false }).lean() : [];
    const reviewsByProduct: Record<string, any[]> = {};
    reviews.forEach((r: any) => { if (!reviewsByProduct[r.productId]) reviewsByProduct[r.productId] = []; reviewsByProduct[r.productId].push(r); });

    const expanded: any[] = [];
    const productsArr: any[] = [];
    const recipesArr: any[] = [];
    const unknownArr: any[] = [];

    for (const key of fbtRaw) {
      let item: any = null;
      // Try match by _id
      if (prodMap.has(key)) item = { type: 'product', data: prodMap.get(key) };
      else if (prodByProductId.has(key)) item = { type: 'product', data: prodByProductId.get(key) };
      else if (recMap.has(key)) item = { type: 'recipe', data: recMap.get(key) };
      else if (recByRecipeId.has(key)) item = { type: 'recipe', data: recByRecipeId.get(key) };
      else {
        // not found; still include id as unknown
        expanded.push({ type: 'unknown', id: key });
        continue;
      }

      if (item.type === 'product') {
        const p = item.data;
        const prodReviews = reviewsByProduct[p.productId] || [];
        const tot = prodReviews.length;
        const avg = tot > 0 ? parseFloat((prodReviews.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0) / tot).toFixed(1)) : 0;
        const discountPercentage = p.mrp > p.actualPrice ? Math.round(((p.mrp - p.actualPrice) / p.mrp) * 100) : 0;
        productsArr.push({ type: 'product', id: String(p._id), productId: p.productId, title: p.title || p.name || p.title, averageRating: avg, totalReviews: tot, discountPercentage, data: p });
      } else if (item.type === 'recipe') {
        const r = item.data;
        // include recipe fields (id, recipeId, title, description, images)
        recipesArr.push({ type: 'recipe', id: String(r._id), recipeId: r.recipeId || null, title: r.title || r.name || null, data: r });
      }
    }

    const { delivery, ...productWithoutDelivery } = product as any;
    const response = {
      status: 200,
      message: 'Product with frequentlyBoughtTogether expanded',
      data: {
        // product: productWithoutDelivery,
        frequentlyBoughtTogether: productsArr,
        recipelist: recipesArr,
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: 500, message: 'Failed to fetch more details', error: msg }, { status: 500 });
  }
}
