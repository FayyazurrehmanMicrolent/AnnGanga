import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Product, { IProduct } from '@/models/product';
import Category, { ICategory } from '@/models/category';

interface MobileFeaturedProduct {
  id: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  sku: string | null;
  price: string;
  comparePrice: string;
  costPrice: number | null;
  stockQuantity: number | null;
  lowStockThreshold: number | null;
  images: string[];
  featuredImage: string | null;
  weight: string | null;
  dimensions: any;
  attributes: Record<string, any> | null;
  variants: Array<{ name: string; price: number; value: string | null }>;
  isActive: boolean;
  isFeatured: boolean;
  isDigital: boolean;
  seoData: any;
  viewCount: number;
  averageRating: string;
  reviewCount: number;
  salesCount: number;
  createdAt: string;
  updatedAt: string;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    slug: string | null;
    isActive: boolean;
    sortOrder: number;
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Limit can be overridden via query param `limit`
    let limit = 10;
    try {
      const url = new URL(req.url, `http://${req.headers.get('host') || 'localhost:3000'}`);
      const limitParam = url.searchParams.get('limit');
      if (limitParam) {
        const parsed = Number(limitParam);
        if (Number.isFinite(parsed) && parsed > 0 && parsed <= 100) {
          limit = parsed;
        }
      }
    } catch {
      // ignore query parse errors
    }

    // Get non-deleted products, newest first
    const products = await Product.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (!products.length) {
      return NextResponse.json(
        {
          statusCode: 200,
          message: 'No products found',
          timestamp: new Date().toISOString(),
          data: [],
        },
        { status: 200 }
      );
    }

    // Preload categories used by these products
    const categoryIds = Array.from(
      new Set(
        products
          .map((p) => p.categoryId)
          .filter((id): id is string => typeof id === 'string' && !!id.trim())
      )
    );

    let categoriesById = new Map<string, any>();
    if (categoryIds.length) {
      const cats = await Category.find({
        categoryId: { $in: categoryIds },
        isDeleted: false,
      }).lean();
      for (const c of cats) {
        categoriesById.set(c.categoryId, c);
      }
    }

    const mapToMobileProduct = (p: any): MobileFeaturedProduct => {
      const weightEntry = Array.isArray(p.weightVsPrice) && p.weightVsPrice.length ? p.weightVsPrice[0] : null;
      const category = p.categoryId ? categoriesById.get(p.categoryId) : null;

      return {
        id: p.productId || String(p._id),
        name: p.title,
        description: p.description ?? null,
        shortDescription: null,
        sku: p.productId || null,
        price: String(typeof p.actualPrice === 'number' ? p.actualPrice.toFixed(2) : p.actualPrice ?? ''),
        comparePrice: String(typeof p.mrp === 'number' ? p.mrp.toFixed(2) : p.mrp ?? ''),
        costPrice: null,
        stockQuantity: null,
        lowStockThreshold: null,
        images: Array.isArray(p.images) ? p.images : [],
        featuredImage: Array.isArray(p.images) && p.images.length ? p.images[0] : null,
        weight: weightEntry ? weightEntry.weight : null,
        dimensions: null,
        attributes: null,
        variants: Array.isArray(p.weightVsPrice)
          ? p.weightVsPrice.map((wp: any) => ({
              name: wp.weight,
              price: wp.price,
              value: wp.weight,
            }))
          : [],
        isActive: true,
        isFeatured: Array.isArray(p.tags)
          ? p.tags.some((t: any) => String(t || '').toLowerCase() === 'featured')
          : false,
        isDigital: false,
        seoData: null,
        viewCount: 0,
        averageRating: '0',
        reviewCount: 0,
        salesCount: 0,
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
        categoryId: p.categoryId || null,
        category: category
          ? {
              id: category.categoryId,
              name: category.name,
              description: null,
              imageUrl: category.image ?? null,
              slug: null,
              isActive: !category.isDeleted,
              sortOrder: 0,
              parentId: null,
              createdAt: category.createdAt ? new Date(category.createdAt).toISOString() : new Date().toISOString(),
              updatedAt: category.updatedAt ? new Date(category.updatedAt).toISOString() : new Date().toISOString(),
            }
          : null,
      };
    };

    const data = products.map(mapToMobileProduct);

    return NextResponse.json(
      {
        statusCode: 200,
        message: 'Featured products fetched',
        timestamp: new Date().toISOString(),
        data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('GET /api/mobile/featured-products error', error);
    return NextResponse.json(
      {
        statusCode: 500,
        message: error?.message || 'Failed to fetch featured products',
        timestamp: new Date().toISOString(),
        data: [],
      },
      { status: 500 }
    );
  }
}


