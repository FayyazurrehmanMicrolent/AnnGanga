import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Product from '@/models/product';
import Category from '@/models/category';
import Review from '@/models/review';
import Cart from '@/models/cart';
import { saveUpload } from '@/lib/upload';
import fs from 'fs';
import path from 'path';
import { findInvalidVitamins } from '@/lib/vitamins';
import { authenticateUser } from '@/lib/middleware';
import { verifyToken } from '@/lib/auth';
import User from '@/models/users';
import Role from '@/models/roles';

// Helper: find product safely by productId (uuid) or by Mongo _id when valid
async function findProductByIdSafe(id: string) {
  if (!id) return null;
  // try productId (UUID) first
  let product = await Product.findOne({ productId: id, isDeleted: false });
  if (product) return product;
  // try _id lookup inside try/catch to avoid CastError for non-ObjectId strings
  try {
    product = await Product.findOne({ _id: id, isDeleted: false });
    return product;
  } catch (e) {
    return null;
  }
}

// Lean variant used in GET
async function findProductByIdSafeLean(id: string) {
  if (!id) return null;
  let product = await Product.findOne({ productId: id, isDeleted: false }).lean();
  if (product) return product;
  try {
    product = await Product.findOne({ _id: id, isDeleted: false }).lean();
    return product;
  } catch (e) {
    return null;
  }
}

export async function GET(req: any) {
  try {
    console.log('Connecting to database...');
    await connectDB();
    console.log('Successfully connected to database');

    // parse URL with fallback for relative URLs (Request.url may be relative)
    let url: URL;
    try {
      console.log('Processing request URL:', req.url);
      url = new URL(req.url);
    } catch (e) {
      console.log('Error parsing URL, using fallback:', e);
      const host = req.headers.get('host') || 'localhost:3000';
      url = new URL(req.url, `http://${host}`);
    }

    const id = url.searchParams.get('id') || url.searchParams.get('productId');
    let categoryId = url.searchParams.get('categoryId');
    let dietaryParam = url.searchParams.get('dietary');
    const tag = url.searchParams.get('tag');

    // Pagination parameters
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    // Filter parameters
    let minPrice = url.searchParams.get('minPrice');
    let maxPrice = url.searchParams.get('maxPrice');
    let rating = url.searchParams.get('rating');
    let vitaminsParam = url.searchParams.get('vitamins');
    let discountParam = url.searchParams.get('discount');
    let deliveryParam = url.searchParams.get('delivery');
    let sortBy = url.searchParams.get('sortBy') || 'newest';


    // Support persistent filters via cookie: if user previously applied filters,
    // persist them in a `productFilters` cookie. When a subsequent request has
    // no filter query params, apply the cookie-stored filters automatically.
    let cookieFilters: any = null;
    let clearCookie = false;
    try {
      const resetParam = url.searchParams.get('reset') || url.searchParams.get('clearFilters');
      if (resetParam === 'false') {
        // User requested reset via query param; clear stored filters
        clearCookie = true;
      } else {
        // const c = (req as any).cookies?.get && (req as any).cookies.get('productFilters');
        // if (c && c.value) {
        //   try {
        //     cookieFilters = JSON.parse(decodeURIComponent(c.value));
        //   } catch (e) {
        //     cookieFilters = null;
        //   }
        // }
      }
    } catch (e) {
      cookieFilters = null;
    }

    if (id) {
      console.log('Looking up product with ID:', id);
      try {
        const product = await findProductByIdSafeLean(id) as any;
        if (!product) {
          console.log('Product not found for ID:', id);
          return NextResponse.json(
            { status: 404, message: 'Product not found', data: {} },
            { status: 404 }
          );
        }
        console.log('Successfully found product');

        // Calculate discount percentage
        const discountPercentage = product.mrp > product.actualPrice
          ? Math.round(((product.mrp - product.actualPrice) / product.mrp) * 100)
          : 0;

        return NextResponse.json(
          { status: 200, message: 'Product fetched', data: { ...product, discountPercentage } },
          { status: 200 }
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error finding product:', error);
        return NextResponse.json(
          { status: 500, message: 'Error finding product', error: errorMessage },
          { status: 500 }
        );
      }
    }

    const filter: any = { isDeleted: false };

    // Category Filter
    if (categoryId) filter.categoryId = categoryId;

    // If no explicit filters provided in URL but cookieFilters exist, merge them
    const preFilterHasFilters = !!(minPrice || maxPrice || rating || vitaminsParam || discountParam || deliveryParam || categoryId || dietaryParam);
    if (!preFilterHasFilters && cookieFilters) {
      // apply only fields that aren't present in the URL
      if (!minPrice && cookieFilters.minPrice !== undefined && cookieFilters.minPrice !== null) minPrice = String(cookieFilters.minPrice);
      if (!maxPrice && cookieFilters.maxPrice !== undefined && cookieFilters.maxPrice !== null) maxPrice = String(cookieFilters.maxPrice);
      if (!rating && cookieFilters.rating !== undefined && cookieFilters.rating !== null) rating = String(cookieFilters.rating);
      if (!categoryId && cookieFilters.categoryId) categoryId = cookieFilters.categoryId;
      if (!dietaryParam && cookieFilters.dietary) dietaryParam = Array.isArray(cookieFilters.dietary) ? cookieFilters.dietary.join(',') : String(cookieFilters.dietary);
      if (!vitaminsParam && cookieFilters.vitamins) vitaminsParam = Array.isArray(cookieFilters.vitamins) ? cookieFilters.vitamins.join(',') : String(cookieFilters.vitamins);
      if (!discountParam && cookieFilters.discount !== undefined) discountParam = String(cookieFilters.discount);
      if (!deliveryParam && cookieFilters.delivery) deliveryParam = cookieFilters.delivery;
      if ((!sortBy || sortBy === 'newest') && cookieFilters.sortBy) sortBy = cookieFilters.sortBy;
    }

    // Dietary Tags Filter
    if (dietaryParam) {
      const d = String(dietaryParam || '').split(',').map(s => s.trim()).filter(Boolean);
      if (d.length === 1) filter.dietary = d[0];
      else if (d.length > 1) filter.dietary = { $in: d };
    }

    // Tag filtering
    if (tag) {
      filter.tags = tag;
    }

    // Price Range Filter
    if (minPrice || maxPrice) {
      filter.actualPrice = {};
      if (minPrice) {
        const min = parseFloat(minPrice);
        if (!isNaN(min)) {
          filter.actualPrice.$gte = min;
        }
      }
      if (maxPrice) {
        const max = parseFloat(maxPrice);
        if (!isNaN(max)) {
          filter.actualPrice.$lte = max;
        }
      }
    }

    // Vitamins Filter
    if (vitaminsParam) {
      const vitamins = vitaminsParam.split(',').map(s => s.trim()).filter(Boolean);
      if (vitamins.length === 1) {
        filter.vitamins = vitamins[0];
      } else if (vitamins.length > 1) {
        filter.vitamins = { $in: vitamins };
      }
    }

    // Discount Filter
    if (discountParam === 'true') {
      filter.$expr = { $lt: ['$actualPrice', '$mrp'] };
    }

    // Delivery Filter
    if (deliveryParam) {
      const deliveryType = deliveryParam.trim();
      if (deliveryType === 'Normal Delivery' || deliveryType === 'Expedited Delivery') {
        filter.delivery = deliveryType;
      }
    }

    // Build sort object
    let sort: any = { createdAt: -1 }; // default: newest first
    switch (sortBy) {
      case 'price-asc':
        sort = { actualPrice: 1 };
        break;
      case 'price-desc':
        sort = { actualPrice: -1 };
        break;
      case 'rating-desc':
        sort = { createdAt: -1 };
        break;
      case 'newest':
      default:
        sort = { createdAt: -1 };
        break;
    }

    // Enforce tag-group restriction when user provided filters but did not explicitly request tags
    const TAG_GROUPS = ['featured', 'arrival', 'hamper'];
    // Enforce tag-group restriction when user provided filters but did not explicitly request tags
    if (preFilterHasFilters && !tag) {
      // only consider products that belong to one of the tag groups
      filter.tags = { $in: TAG_GROUPS };
      console.log('GET filter: restricting to tag groups', TAG_GROUPS);
    }

    // Get all products matching the filter with pagination
    let products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination 
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetch reviews for rating calculation
    const productIds = products.map((p: any) => p.productId);
    const reviews = await Review.find({
      productId: { $in: productIds },
      status: 'approved',
      isDeleted: false,
    }).lean();

    // Group reviews by productId
    const reviewsByProduct: Record<string, any[]> = {};
    reviews.forEach((review: any) => {
      if (!reviewsByProduct[review.productId]) {
        reviewsByProduct[review.productId] = [];
      }
      reviewsByProduct[review.productId].push(review);
    });

    // If userId provided, fetch the user's cart to determine applied coupon per-product
    const userIdForCoupons = url.searchParams.get('userId');
    let userCart: any = null;
    if (userIdForCoupons) {
      try {
        userCart = await Cart.findOne({ userId: userIdForCoupons }).lean();
      } catch (e) {
        userCart = null;
      }
    }

    // Process products with ratings, discount and coupon-applied flags
    let processedProducts = products.map((product: any) => {
      const productReviews = reviewsByProduct[product.productId] || [];
      const totalReviews = productReviews.length;
      const averageRating = totalReviews > 0
        ? productReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews
        : 0;

      const discountPercentage = product.mrp > product.actualPrice
        ? Math.round(((product.mrp - product.actualPrice) / product.mrp) * 100)
        : 0;

      // Determine if coupon is applied to this product for the requesting user
      let couponApplied = false;
      let appliedCouponDetails: any = null;
      try {
        if (userCart && userCart.appliedCoupon && Array.isArray(userCart.appliedCoupon.appliedToProducts)) {
          if (userCart.appliedCoupon.appliedToProducts.includes(product.productId)) {
            couponApplied = true;
            appliedCouponDetails = {
              couponId: userCart.appliedCoupon.couponId || null,
              code: userCart.appliedCoupon.code || null,
              discount: userCart.appliedCoupon.discount || 0,
              discountType: userCart.appliedCoupon.discountType || null,
              discountValue: userCart.appliedCoupon.discountValue || null,
              appliedAt: userCart.appliedCoupon.appliedAt || null,
            };
          }
        }
      } catch (e) {
        couponApplied = false;
        appliedCouponDetails = null;
      }

      return {
        ...product,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews,
        discountPercentage,
        couponApplied,
        appliedCoupon: appliedCouponDetails,
      };
    });

    // Filter by star rating if specified
    if (rating) {
      const minRating = parseFloat(rating);
      if (!isNaN(minRating) && minRating >= 1 && minRating <= 5) {
        processedProducts = processedProducts.filter(
          (p: any) => p.averageRating >= minRating
        );
      }
    }

    // Sort by rating if requested
    if (sortBy === 'rating-desc') {
      processedProducts.sort((a: any, b: any) => b.averageRating - a.averageRating);
    }

    // Adjust total count if rating filter was applied
    const finalCount = rating ? processedProducts.length : totalProducts;
    const finalTotalPages = rating ? Math.ceil(finalCount / limit) : totalPages;

    // Initialize the result object with arrays for each tag
    const result: any = { tags: {} };

    // Define the tags we want to group by
    const tagGroups = ['featured', 'arrival', 'hamper'];

    // Initialize each tag group with an empty array
    tagGroups.forEach((tag) => {
      result.tags[tag] = [];
    });

    // Process each product and add it to the appropriate tag arrays
    processedProducts.forEach((product: any) => {
      if (product.tags && Array.isArray(product.tags)) {
        // Convert all tags to lowercase for case-insensitive matching
        const productTags = product.tags.map((t: string) => (t && typeof t.toLowerCase === 'function') ? t.toLowerCase() : String(t).toLowerCase());

        // Add product to each matching tag array
        tagGroups.forEach((tag) => {
          if (productTags.includes(tag)) {
            result.tags[tag].push(product);
          }
        });
      }
    });

    // Check if any filters are applied (excluding pagination and sort)
    const hasFilters = !!(minPrice || maxPrice || rating || vitaminsParam || discountParam || deliveryParam || categoryId || dietaryParam);

    // Build appliedFilters object for cookie and response
    const _discountBool = String(discountParam).toLowerCase() === 'true' || String(discountParam) === '1';
    const expectedDelivery = !!(deliveryParam);
    const normalDelivery = deliveryParam ? String(deliveryParam).toLowerCase().includes('normal') : false;

    const appliedFilters = {
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      rating: rating ? parseFloat(rating) : null,
      categoryId: categoryId || null,
      dietary: dietaryParam ? (Array.isArray(dietaryParam) ? dietaryParam : String(dietaryParam).split(',').map((s: string) => s.trim())) : [],
      vitamins: vitaminsParam ? (Array.isArray(vitaminsParam) ? vitaminsParam : String(vitaminsParam).split(',').map((s: string) => s.trim())) : [],
      // normalized discount boolean
      discount: _discountBool,
      // original delivery value (preserved) and two boolean helpers
      delivery: deliveryParam || null,
      expectedDelivery,
      normalDelivery,
      sortBy,
    };

    // console.log("filterr..........................", appliedFilters);

    // Return response with tags structure and additional filter info if filters applied
    if (hasFilters || cookieFilters || clearCookie) {
      const respBody = {
        status: 200,
        message: 'Products filtered successfully',
        data: {
          ...result,
          // pagination: {
          //   currentPage: page,
          //   totalPages: finalTotalPages,
          //   totalProducts: finalCount,
          //   limit,
          //   hasNextPage: page < finalTotalPages,
          //   hasPrevPage: page > 1,
          // },
          // appliedFilters,
        }
      };

      console.log("resBody........................................", respBody)


      const res = NextResponse.json(respBody, { status: 200 });
      // Persist filters in cookie so /api/product/current-filters can read them
      try {
        if (clearCookie) {
          // Clear the cookie
          res.headers.set('Set-Cookie', 'productFilters=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure');
        } else {
          // Persist filters in cookie for subsequent requests (7 days). Use SameSite=None; Secure for cross-site/ngrok.
          const cookieStr = `productFilters=${encodeURIComponent(JSON.stringify(appliedFilters))}; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=None; Secure`;
          res.headers.set('Set-Cookie', cookieStr);
        }
      } catch (e) {
        // ignore cookie set errors
      }

      return res;
    }

    // If no filters, return grouped by tags only (original behavior)
    return NextResponse.json({
      status: 200,
      message: 'Products feched and grouped by tags',
      data: { ...result }
    }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/product error', error);
    return NextResponse.json({ status: 500, message: error.message || 'Failed to fetch products', data: {} }, { status: 500 });
  }
}


// POST handles create / edit / delete via `action` (create | edit | delete | filter)
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    let action = 'create';
    let parsedData: any = null;
    let imagesPaths: string[] = [];
    let id: string | null = null;

    const contentType = req.headers.get('content-type') || '';

    // allow overriding via query params (useful for wrapper routes like /api/product/:id)
    try {
      let urlObj: URL;
      try {
        urlObj = new URL(req.url);
      } catch (err) {
        const host = req.headers.get('host') || 'localhost:3000';
        urlObj = new URL(req.url, `http://${host}`);
      }
      const qAction = urlObj.searchParams.get('action');
      const qId = urlObj.searchParams.get('id') || urlObj.searchParams.get('productId');
      if (qAction) action = String(qAction).toLowerCase();
      if (qId && !id) id = String(qId);
      // If caller targeted a specific id but didn't provide an explicit action,
      // treat the request as an edit (POST to /api/product/:id should update by default)
      if (!qAction && qId && action === 'create') {
        action = 'edit';
      }
    } catch (e) {
      // ignore
    }

    // Handle filter action with body payload
    if (action === 'filter') {
      const body = await req.json();
      console.log('POST /api/product?action=filter - body:', JSON.stringify(body));

      // Pagination parameters
      const page = Math.max(1, parseInt(body.page || '1'));
      const limit = Math.min(100, Math.max(1, parseInt(body.limit || '20')));
      const skip = (page - 1) * limit;

      // Filter parameters from body
      const minPrice = body.minPrice;
      const maxPrice = body.maxPrice;
      const rating = body.rating;
      const categoryId = body.categoryId;
      const dietaryParam = body.dietary;
      const vitaminsParam = body.vitamins;
      const discountParam = body.discount;
      const deliveryParam = body.delivery;
      const sortBy = body.sortBy || 'newest';

      const filter: any = { isDeleted: false };

      console.log('POST filter parameters:', { minPrice, maxPrice, rating, categoryId, dietaryParam, vitaminsParam, discountParam, deliveryParam, sortBy });

      // Category Filter
      if (categoryId) filter.categoryId = categoryId;

      // Dietary Tags Filter
      if (dietaryParam) {
        const d = Array.isArray(dietaryParam) ? dietaryParam : String(dietaryParam || '').split(',').map(s => s.trim()).filter(Boolean);
        if (d.length === 1) filter.dietary = d[0];
        else if (d.length > 1) filter.dietary = { $in: d };
      }

      // Price Range Filter
      if (minPrice || maxPrice) {
        filter.actualPrice = {};
        if (minPrice) {
          const min = parseFloat(minPrice);
          if (!isNaN(min)) {
            filter.actualPrice.$gte = min;
          }
        }
        if (maxPrice) {
          const max = parseFloat(maxPrice);
          if (!isNaN(max)) {
            filter.actualPrice.$lte = max;
          }
        }
      }

      // Vitamins Filter
      if (vitaminsParam) {
        const vitamins = Array.isArray(vitaminsParam) ? vitaminsParam : vitaminsParam.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (vitamins.length === 1) {
          filter.vitamins = vitamins[0];
        } else if (vitamins.length > 1) {
          filter.vitamins = { $in: vitamins };
        }
      }

      // Discount Filter
      if (discountParam === true || discountParam === 'true') {
        filter.$expr = { $lt: ['$actualPrice', '$mrp'] };
      }

      // Delivery Filter
      if (deliveryParam) {
        const deliveryType = String(deliveryParam).trim();
        if (deliveryType === 'Normal Delivery' || deliveryType === 'Expedited Delivery') {
          filter.delivery = deliveryType;
        }
      }

      // Build sort object
      let sort: any = { createdAt: -1 };
      switch (sortBy) {
        case 'price-asc':
          sort = { actualPrice: 1 };
          break;
        case 'price-desc':
          sort = { actualPrice: -1 };
          break;
        case 'rating-desc':
          sort = { createdAt: -1 };
          break;
        case 'newest':
        default:
          sort = { createdAt: -1 };
          break;
      }

      // Enforce tag-group restriction when user did not explicitly provide tags
      const TAG_GROUPS = ['featured', 'arrival', 'hamper'];
      const bodyTagsProvided = body && (body.tags || body.tag);
      if (!bodyTagsProvided) {
        filter.tags = { $in: TAG_GROUPS };
        console.log('POST filter: restricting to tag groups', TAG_GROUPS);
      }

      // Get all products matching the filter with pagination
      let products = await Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      // Get total count for pagination
      const totalProducts = await Product.countDocuments(filter);
      const totalPages = Math.ceil(totalProducts / limit);

      // Fetch reviews for rating calculation
      const productIds = products.map((p: any) => p.productId);
      const reviews = await Review.find({
        productId: { $in: productIds },
        status: 'approved',
        isDeleted: false,
      }).lean();

      // Group reviews by productId
      const reviewsByProduct: Record<string, any[]> = {};
      reviews.forEach((review: any) => {
        if (!reviewsByProduct[review.productId]) {
          reviewsByProduct[review.productId] = [];
        }
        reviewsByProduct[review.productId].push(review);
      });

      // Process products with ratings and discount
      let processedProducts = products.map((product: any) => {
        const productReviews = reviewsByProduct[product.productId] || [];
        const totalReviews = productReviews.length;
        const averageRating = totalReviews > 0
          ? productReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews
          : 0;

        const discountPercentage = product.mrp > product.actualPrice
          ? Math.round(((product.mrp - product.actualPrice) / product.mrp) * 100)
          : 0;

        return {
          ...product,
          averageRating: parseFloat(averageRating.toFixed(1)),
          totalReviews,
          discountPercentage,
        };
      });

      // Filter by star rating if specified
      if (rating) {
        const minRating = parseFloat(rating);
        if (!isNaN(minRating) && minRating >= 1 && minRating <= 5) {
          processedProducts = processedProducts.filter(
            (p: any) => p.averageRating >= minRating
          );
        }
      }

      // Sort by rating if requested
      if (sortBy === 'rating-desc') {
        processedProducts.sort((a: any, b: any) => b.averageRating - a.averageRating);
      }

      // Adjust total count if rating filter was applied
      const finalCount = rating ? processedProducts.length : totalProducts;
      const finalTotalPages = rating ? Math.ceil(finalCount / limit) : totalPages;

      // Build grouped tags response (featured, arrival, hamper) as arrays
      const tagGroups = ['featured', 'arrival', 'hamper'];
      const result: any = { tags: {} };
      tagGroups.forEach((t) => { result.tags[t] = []; });

      processedProducts.forEach((product: any) => {
        if (product.tags && Array.isArray(product.tags)) {
          const productTags = product.tags.map((x: string) => (x && typeof x.toLowerCase === 'function') ? x.toLowerCase() : String(x).toLowerCase());
          tagGroups.forEach((tg) => {
            if (productTags.includes(tg)) {
              result.tags[tg].push(product);
            }
          });
        }
      });

      const _discountBoolPost = String(discountParam).toLowerCase() === 'true' || String(discountParam) === '1';
      const expectedDeliveryPost = !!(deliveryParam);
      const normalDeliveryPost = deliveryParam ? String(deliveryParam).toLowerCase().includes('normal') : false;

      const appliedFilters = {
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        rating: rating ? parseFloat(rating) : null,
        categoryId: categoryId || null,
        dietary: dietaryParam ? (Array.isArray(dietaryParam) ? dietaryParam : String(dietaryParam).split(',').map((s: string) => s.trim())) : [],
        vitamins: vitaminsParam ? (Array.isArray(vitaminsParam) ? vitaminsParam : String(vitaminsParam).split(',').map((s: string) => s.trim())) : [],
        // normalized discount boolean
        discount: _discountBoolPost,
        delivery: deliveryParam || null,
        expectedDelivery: expectedDeliveryPost,
        normalDelivery: normalDeliveryPost,
        sortBy,
      };

      const respBody = {
        status: 200,
        message: 'Products filtered successfully',
        data: {
          // ...result,
          // pagination: {
          //   currentPage: page,
          //   totalPages: finalTotalPages,
          //   totalProducts: finalCount,
          //   limit,
          //   hasNextPage: page < finalTotalPages,
          //   hasPrevPage: page > 1,
          // },
          // appliedFilters,
        }
      };

      console.log('resBody.......................................', respBody);
      const res = NextResponse.json(respBody, { status: 200 });
      // Persist filters in cookie so /api/product/current-filters can read them
      try {
        // If client requested reset via body.reset === true, clear cookie
        if (body && (body.reset === false || body.clearFilters === true)) {
          res.headers.set('Set-Cookie', 'productFilters=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure');
        } else {
          const cookieStr = `productFilters=${encodeURIComponent(JSON.stringify(appliedFilters))}; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=None; Secure`;
          res.headers.set('Set-Cookie', cookieStr);
        }
      } catch (e) {
        // ignore cookie set errors
      }

      return res;
    }

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      action = (body.action || action).toLowerCase();
      parsedData = body.data || body;
      // preserve previously-determined id (e.g. from query/url) if present
      id = body.id || body.productId || id;
      // if client sends images as array of urls in JSON
      if (Array.isArray(body.images)) imagesPaths = body.images;
    } else if (contentType.includes('multipart/form-data') || contentType.includes('form-data')) {
      const form = await req.formData();

      const dataField = form.get('data');
      if (dataField) {
        try {
          parsedData = typeof dataField === 'string' ? JSON.parse(String(dataField)) : JSON.parse(String(dataField));
        } catch (e) {
          parsedData = null;
        }
      }

      // Merge direct form fields into parsedData so clients can send fields outside `data`
      if (!parsedData) parsedData = {};
      try {
        const directKeys = ['title', 'mrp', 'actualPrice', 'weightVsPrice', 'nutrition', 'healthBenefits', 'description', 'categoryId', 'category', 'delivery'];
        for (const k of directKeys) {
          const v = form.get(k);
          if (v !== null && v !== undefined && typeof v !== 'undefined') {
            // if JSON-like fields, attempt parse
            const s = String(v);
            if ((k === 'weightVsPrice' || k === 'nutrition') && s.trim()) {
              try {
                parsedData[k] = JSON.parse(s);
              } catch (e) {
                // if not JSON, leave as string (will be validated/converted later)
                parsedData[k] = s;
              }
            } else if ((k === 'mrp' || k === 'actualPrice') && s.trim()) {
              parsedData[k] = Number(s);
            } else {
              parsedData[k] = s;
            }
          }
        }
      } catch (e) {
        // ignore form merge errors
      }

      const a = form.get('action') || (parsedData && parsedData.action);
      action = a ? String(a).toLowerCase() : action;
      const i = form.get('id') || (parsedData && (parsedData.id || parsedData.productId));
      // preserve existing id (from query/url) when present
      id = i ? String(i) : id;

      // Collect files robustly: support `images`, `images[]`, `image`, and any form keys containing 'image'
      const collectedFiles: Blob[] = [];
      try {
        for (const entry of form.entries() as any) {
          const [key, value] = entry;
          const lower = String(key || '').toLowerCase();
          if (lower.includes('image')) {
            if (value && typeof (value as any).size !== 'undefined') {
              collectedFiles.push(value as Blob);
            }
          }
        }
      } catch (e) {
        // fallback to getAll('images') behavior
        const files = form.getAll('images') as any[];
        if (files && files.length) {
          for (const f of files) {
            if (f && (f as any).size) collectedFiles.push(f as Blob);
          }
        }
        const single = form.get('image') as Blob | null;
        if (single && (single as any).size) collectedFiles.push(single as Blob);
      }

      if (collectedFiles.length) {
        for (const f of collectedFiles) {
          if (f && (f as any).size) {
            const desired = parsedData && parsedData.title ? sanitizeForFilename(parsedData.title, 50) : undefined;
            const saved = await saveUpload(f as Blob, 'products', desired);
            if (saved) imagesPaths.push(saved);
          }
        }
      }
    } else {
      // unknown content type: try to parse JSON then formData
      const body = await req.json().catch(() => ({}));
      action = (body.action || action).toLowerCase();
      parsedData = body.data || body;
      // preserve previously-determined id (e.g. from query/url) if present
      id = body.id || body.productId || id;
      if (Array.isArray(body.images)) imagesPaths = body.images;
      try {
        const form = await req.formData();
        // reuse robust collection logic: iterate entries and collect any file-like fields containing 'image'
        const collectedFiles: Blob[] = [];
        try {
          for (const entry of form.entries() as any) {
            const [key, value] = entry;
            const lower = String(key || '').toLowerCase();
            if (lower.includes('image')) {
              if (value && typeof (value as any).size !== 'undefined') collectedFiles.push(value as Blob);
            }
          }
        } catch (err) {
          const files = form.getAll('images') as any[];
          if (files && files.length) {
            for (const f of files) if (f && (f as any).size) collectedFiles.push(f as Blob);
          }
          const single = form.get('image') as Blob | null;
          if (single && (single as any).size) collectedFiles.push(single as Blob);
        }

        if (collectedFiles.length) {
          for (const f of collectedFiles) {
            if (f && (f as any).size) {
              const desired = parsedData && parsedData.title ? sanitizeForFilename(parsedData.title, 50) : undefined;
              const saved = await saveUpload(f as Blob, 'products', desired);
              if (saved) imagesPaths.push(saved);
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // prefer fields from parsedData when present
    const data = parsedData || {};

    // Protect create/edit/delete (and common synonyms) actions: only admin role can perform these.
    // TEMPORARILY DISABLED FOR TESTING - ENABLE THIS IN PRODUCTION
    /*
    if (['create', 'edit', 'delete', 'update', 'remove', 'destroy'].includes(action)) {
      // Authenticate via Authorization header first
      let authResult = await authenticateUser(req as any);

      // If authenticateUser failed, try cookie token fallback
      if (!authResult.authenticated) {
        try {
          const token = (req as any).cookies?.get('token')?.value;
          if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
              authResult = { authenticated: true, user: decoded, error: null } as any;
            }
          }
        } catch (e) {
          // ignore
        }
      }

      if (!authResult.authenticated || !authResult.user) {
        return NextResponse.json({ status: 401, message: 'Authentication required. Please provide a valid token.', data: {} }, { status: 401 });
      }

      const userId = authResult.user.userId || authResult.user.user_id || authResult.user.id;
      if (!userId) {
        return NextResponse.json({ status: 401, message: 'User id not found in token.', data: {} }, { status: 401 });
      }

      const user = await User.findOne({ id: userId, isDeleted: false });
      if (!user) {
        return NextResponse.json({ status: 404, message: 'User not found.', data: {} }, { status: 404 });
      }

      let role: any = null;
      try {
        if (user.roleId) role = await Role.findOne({ roleId: user.roleId, isRoleActive: true });
      } catch (e) {
        // ignore
      }

      const isAdmin = role && typeof role.role === 'string' && role.role.toLowerCase() === 'admin';
      if (!isAdmin) {
        return NextResponse.json({ status: 403, message: 'Forbidden: admin role required to perform this action.', data: {} }, { status: 403 });
      }
    }
    */
    // Robust title detection: accept `title` or `name` and trim whitespace; handle non-string values by stringifying them
    let rawTitle: any = (data.title ?? data.name ?? '');
    if (rawTitle !== null && typeof rawTitle !== 'undefined' && typeof rawTitle !== 'string') {
      try {
        rawTitle = JSON.stringify(rawTitle);
      } catch (e) {
        rawTitle = String(rawTitle);
      }
    }
    const titleTrimmed = typeof rawTitle === 'string' ? rawTitle.trim() : String(rawTitle).trim();
    const hasTitle = Object.prototype.hasOwnProperty.call(data, 'title') || Object.prototype.hasOwnProperty.call(data, 'name');

    const hasMrp = Object.prototype.hasOwnProperty.call(data, 'mrp');
    const mrp = hasMrp ? Number(data.mrp) : undefined;

    const hasActualPrice = Object.prototype.hasOwnProperty.call(data, 'actualPrice');
    const actualPrice = hasActualPrice ? Number(data.actualPrice) : undefined;

    const hasWeightVsPrice = Object.prototype.hasOwnProperty.call(data, 'weightVsPrice');
    let weightVsPrice: any = undefined;
    if (hasWeightVsPrice) {
      if (Array.isArray(data.weightVsPrice)) weightVsPrice = data.weightVsPrice;
      else if (typeof data.weightVsPrice === 'string' && data.weightVsPrice.trim()) {
        try {
          weightVsPrice = JSON.parse(String(data.weightVsPrice));
        } catch (e) {
          weightVsPrice = undefined;
        }
      }
    }

    const hasNutrition = Object.prototype.hasOwnProperty.call(data, 'nutrition');
    let nutrition: any = undefined;
    if (hasNutrition) {
      if (Array.isArray(data.nutrition)) nutrition = data.nutrition;
      else if (typeof data.nutrition === 'string' && data.nutrition.trim()) {
        try {
          nutrition = JSON.parse(String(data.nutrition));
        } catch (e) {
          nutrition = undefined;
        }
      }
    }

    const hasVitamins = Object.prototype.hasOwnProperty.call(data, 'vitamins') || Object.prototype.hasOwnProperty.call(data, 'vitamin') || Object.prototype.hasOwnProperty.call(data, 'vitaminName');
    let vitamins: any = undefined;
    if (hasVitamins) {
      try {
        const raw = data.vitamins ?? data.vitamin ?? data.vitaminName;
        if (Array.isArray(raw)) vitamins = raw.map((x: any) => String(x).trim()).filter(Boolean);
        else if (typeof raw === 'string' && raw.trim()) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) vitamins = parsed.map((x: any) => String(x).trim()).filter(Boolean);
            else vitamins = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
          } catch (e) {
            vitamins = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
      } catch (e) {
        vitamins = undefined;
      }
    }

    const hasTags = Object.prototype.hasOwnProperty.call(data, 'tags') || Object.prototype.hasOwnProperty.call(data, 'tag') || Object.prototype.hasOwnProperty.call(data, 'tagName');
    let tags: any = undefined;
    if (hasTags) {
      try {
        const rawT = data.tags ?? data.tag ?? data.tagName;
        if (Array.isArray(rawT)) tags = rawT.map((x: any) => String(x).trim()).filter(Boolean);
        else if (typeof rawT === 'string' && rawT.trim()) {
          try {
            const parsedT = JSON.parse(rawT);
            if (Array.isArray(parsedT)) tags = parsedT.map((x: any) => String(x).trim()).filter(Boolean);
            else tags = rawT.split(',').map((s: string) => s.trim()).filter(Boolean);
          } catch (e) {
            tags = rawT.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
      } catch (e) {
        tags = undefined;
      }
    }

    const hasDietary = Object.prototype.hasOwnProperty.call(data, 'dietary') || Object.prototype.hasOwnProperty.call(data, 'diet');
    let dietary: any = undefined;
    if (hasDietary) {
      try {
        const raw = data.dietary ?? data.diet ?? null;
        if (Array.isArray(raw)) dietary = raw.map((x: any) => String(x).trim()).filter(Boolean);
        else if (typeof raw === 'string' && raw.trim()) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) dietary = parsed.map((x: any) => String(x).trim()).filter(Boolean);
            else dietary = String(raw).split(',').map((s: string) => s.trim()).filter(Boolean);
          } catch (e) {
            dietary = String(raw).split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
      } catch (e) {
        dietary = undefined;
      }
    }

    const hasHealth = Object.prototype.hasOwnProperty.call(data, 'healthBenefits') || Object.prototype.hasOwnProperty.call(data, 'health') || Object.prototype.hasOwnProperty.call(data, 'healthBenefitsText');
    const healthBenefits = hasHealth ? (data.healthBenefits || data.healthBenefitsText || data.health) : undefined;

    const hasDescription = Object.prototype.hasOwnProperty.call(data, 'description');
    const description = hasDescription ? data.description : undefined;

    const hasCategory = Object.prototype.hasOwnProperty.call(data, 'categoryId') || Object.prototype.hasOwnProperty.call(data, 'category');
    const categoryId = hasCategory ? (data.categoryId || data.category) : undefined;

    // Limits
    const TITLE_MAX = 150;
    const DESCRIPTION_MAX = 2000;
    const HEALTH_MAX = 1000;
    const PRICE_MAX_DIGITS = 10; // max digits allowed (combined digits excluding decimal point)

    // Static delivery options (dropdown): enforce only these values
    const ALLOWED_DELIVERY_OPTIONS = ['Normal Delivery', 'Expedited Delivery'];

    // Map various input forms to a canonical delivery option, or return null if unknown
    function mapDeliveryValue(raw: any): string | null {
      if (raw === null || typeof raw === 'undefined') return null;
      let s = String(raw).trim();
      if (!s) return null;
      const low = s.toLowerCase();
      if (low === 'normal' || low === 'normal delivery' || low === 'standard' || low === 'standard delivery') return 'Normal Delivery';
      if (low === 'expedited' || low === 'expedited delivery' || low === 'fast' || low === 'fast delivery') return 'Expedited Delivery';
      // allow exact matches to canonical values
      if (ALLOWED_DELIVERY_OPTIONS.map(x => x.toLowerCase()).includes(low)) {
        // return canonical capitalization
        return ALLOWED_DELIVERY_OPTIONS.find(x => x.toLowerCase() === low) || null;
      }
      return null;
    }

    // Helper: sanitize and truncate a string to be safe for filenames
    function sanitizeForFilename(raw: any, maxLen = 50) {
      if (raw === null || typeof raw === 'undefined') return undefined;
      let s = String(raw).trim();
      if (!s) return undefined;
      // replace spaces and unsafe chars with hyphen, keep letters, numbers, dash, underscore and dot
      s = s.replace(/[^a-z0-9._-]+/gi, '-');
      // collapse multiple dashes
      s = s.replace(/-+/g, '-');
      // trim leading/trailing dashes or dots
      s = s.replace(/^[.-]+|[.-]+$/g, '');
      if (s.length > maxLen) s = s.slice(0, maxLen);
      return s || undefined;
    }

    // Strict numeric validation helper: allow integer or decimal (digits and optional single dot)
    // Enforces a maximum count of digits (excluding the dot) via `maxDigits`.
    function parseStrictNumber(raw: any, maxDigits = PRICE_MAX_DIGITS) {
      if (raw === null || typeof raw === 'undefined' || String(raw).toString().trim() === '') return { ok: false };
      // if already a number
      if (typeof raw === 'number') {
        if (!Number.isFinite(raw)) return { ok: false };
        // check digits count
        const sNum = String(raw).replace('.', '');
        if (!/^\d+$/.test(sNum)) return { ok: false };
        if (sNum.length > maxDigits) return { ok: false };
        return { ok: true, value: raw };
      }
      // normalize string: trim and remove common thousand separators (commas)
      let s = String(raw).trim();
      s = s.replace(/,/g, '');
      // allow digits and optional decimal part, no other characters (no currency symbols, letters)
      if (!/^\d+(?:\.\d+)?$/.test(s)) return { ok: false };
      const digitsOnly = s.replace('.', '');
      if (digitsOnly.length > maxDigits) return { ok: false };
      const v = Number(s);
      if (Number.isNaN(v)) return { ok: false };
      return { ok: true, value: v };
    }

    // parse date-like values robustly
    function parseDate(raw: any): Date | null | undefined {
      if (raw === null) return null;
      if (raw instanceof Date) {
        if (Number.isNaN(raw.getTime())) return undefined;
        return raw;
      }
      if (typeof raw === 'number') {
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? undefined : d;
      }
      if (typeof raw === 'string') {
        const s = raw.trim();
        if (s === '') return null; // explicit empty -> null (unset)
        // allow numeric timestamp string (ms since epoch)
        if (/^\d+$/.test(s)) {
          const n = Number(s);
          const d = new Date(n);
          if (!Number.isNaN(d.getTime())) return d;
        }
        const d = new Date(s);
        if (!Number.isNaN(d.getTime())) return d;
        return undefined;
      }
      return undefined;
    }

    // Validate weightVsPrice array items: each item must have weight (non-empty string) and price numeric-only
    function validateWeightVsPriceArray(arr: any): { ok: boolean; message?: string } {
      if (!Array.isArray(arr) || arr.length === 0) return { ok: false, message: 'weightVsPrice must be a non-empty array' };
      for (let i = 0; i < arr.length; i++) {
        const it = arr[i];
        if (!it) return { ok: false, message: `weightVsPrice[${i}] is invalid` };
        const w = it.weight ?? it.wt ?? it.name;
        const p = it.price ?? it.pr ?? it.value;
        if (!w || String(w).toString().trim() === '') return { ok: false, message: `weight is required for weightVsPrice[${i}]` };
        const parsed = parseStrictNumber(p, PRICE_MAX_DIGITS);
        if (!parsed.ok) return { ok: false, message: `price for weightVsPrice[${i}] must be numeric and up to ${PRICE_MAX_DIGITS} digits` };
        // quantity: optional but if provided must be a positive integer
        const qRaw = it.quantity ?? it.qty ?? it.q ?? undefined;
        if (typeof qRaw !== 'undefined') {
          const qNum = Number(qRaw);
          if (!Number.isFinite(qNum) || qNum <= 0 || !Number.isInteger(qNum)) return { ok: false, message: `quantity for weightVsPrice[${i}] must be a positive integer` };
        }
      }
      return { ok: true };
    }

    if (action === 'create') {
      // For create we require title, mrp, actualPrice, weightVsPrice, description and categoryId to be present
      if (!hasTitle || !titleTrimmed || String(titleTrimmed).length === 0) {
        // Log raw value for easier debugging when clients report this error
        console.debug('Validation failed: title missing/whitespace', { hasTitle, rawTitle });
        return NextResponse.json({
          status: 400,
          message: 'Validation failed',
          data: {
            errors: {
              title: 'Product title is required and cannot be only whitespace',
              provided: rawTitle,
              hasTitleProp: !!hasTitle
            }
          }
        }, { status: 400 });
      }

      // Strict numeric validation for mrp and actualPrice (no characters allowed, max 10 digits)
      const mrpParsed = parseStrictNumber(data.mrp ?? data.mrpValue ?? mrp, PRICE_MAX_DIGITS);
      if (!hasMrp || !mrpParsed.ok) return NextResponse.json({ status: 400, message: `MRP is required and must be numeric (digits and optional single decimal point only) and up to ${PRICE_MAX_DIGITS} digits`, data: {} }, { status: 400 });
      const actualParsed = parseStrictNumber(data.actualPrice ?? data.price ?? actualPrice, PRICE_MAX_DIGITS);
      if (!hasActualPrice || !actualParsed.ok) return NextResponse.json({ status: 400, message: `Actual price is required and must be numeric (digits and optional single decimal point only) and up to ${PRICE_MAX_DIGITS} digits`, data: {} }, { status: 400 });

      // weightVsPrice must be present and well-formed
      if (!hasWeightVsPrice || !weightVsPrice) return NextResponse.json({ status: 400, message: 'weightVsPrice is required and must be a non-empty array', data: {} }, { status: 400 });
      const wvpCheck = validateWeightVsPriceArray(weightVsPrice);
      if (!wvpCheck.ok) return NextResponse.json({ status: 400, message: wvpCheck.message || 'Invalid weightVsPrice', data: {} }, { status: 400 });

      if (!hasDescription || !description) return NextResponse.json({ status: 400, message: 'Product description is required', data: {} }, { status: 400 });
      // Character length checks
      if (titleTrimmed && String(titleTrimmed).length > TITLE_MAX) return NextResponse.json({ status: 400, message: `title must be at most ${TITLE_MAX} characters`, data: {} }, { status: 400 });
      if (description && String(description).length > DESCRIPTION_MAX) return NextResponse.json({ status: 400, message: `description must be at most ${DESCRIPTION_MAX} characters`, data: {} }, { status: 400 });
      if (healthBenefits && String(healthBenefits).length > HEALTH_MAX) return NextResponse.json({ status: 400, message: `healthBenefits must be at most ${HEALTH_MAX} characters`, data: {} }, { status: 400 });
      if (!hasCategory || !categoryId) return NextResponse.json({ status: 400, message: 'categoryId is required', data: {} }, { status: 400 });

      // At least one image required
      if (!imagesPaths || !Array.isArray(imagesPaths) || imagesPaths.length < 1) return NextResponse.json({ status: 400, message: 'At least 1 product image is required (images[])', data: {} }, { status: 400 });

      // verify category exists
      let cat = await Category.findOne({ categoryId, isDeleted: false });
      if (!cat) {
        try {
          cat = await Category.findOne({ _id: categoryId, isDeleted: false });
        } catch (e) {
          cat = null;
        }
      }
      if (!cat) return NextResponse.json({ status: 400, message: 'Invalid categoryId', data: {} }, { status: 400 });

      // Conditional validation flags based on category name (actual checks performed after parsing lists)
      const catName = String(cat.name || '').toLowerCase();
      const isFood = catName.includes('food') || catName.includes('grocery');
      const isSupplement = catName.includes('supplement') || catName.includes('vitamin') || catName.includes('supplements');
      const isWellness = catName.includes('wellness') || catName.includes('organic');

      // vitamins handling: accept `vitamins` (array) or comma/JSON string
      let vitaminsList: string[] = [];
      try {
        const rawV = data.vitamins ?? data.vitamin ?? data.vitaminName ?? null;
        if (Array.isArray(rawV)) vitaminsList = rawV.map((x: any) => String(x).trim()).filter(Boolean);
        else if (typeof rawV === 'string' && rawV.trim()) {
          try {
            const parsed = JSON.parse(rawV);
            if (Array.isArray(parsed)) vitaminsList = parsed.map((x: any) => String(x).trim()).filter(Boolean);
          } catch (e) {
            vitaminsList = rawV.split(',').map(s => String(s).trim()).filter(Boolean);
          }
        }
      } catch (e) {
        vitaminsList = [];
      }

      // dietary handling: accept `dietary` (array) or comma/JSON string
      let dietaryList: string[] = [];
      try {
        const rawD = data.dietary ?? data.diet ?? null;
        if (Array.isArray(rawD)) dietaryList = rawD.map((x: any) => String(x).trim()).filter(Boolean);
        else if (typeof rawD === 'string' && rawD.trim()) {
          try {
            const parsedD = JSON.parse(rawD);
            if (Array.isArray(parsedD)) dietaryList = parsedD.map((x: any) => String(x).trim()).filter(Boolean);
            else dietaryList = String(rawD).split(',').map((s: string) => s.trim()).filter(Boolean);
          } catch (e) {
            dietaryList = String(rawD).split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
      } catch (e) {
        dietaryList = [];
      }

      // tags handling: accept `tags` (array) or comma/JSON string
      let tagsList: string[] = [];
      try {
        const rawT = data.tags ?? data.tag ?? data.tagName ?? null;
        if (Array.isArray(rawT)) tagsList = rawT.map((x: any) => String(x).trim()).filter(Boolean);
        else if (typeof rawT === 'string' && rawT.trim()) {
          try {
            const parsedT = JSON.parse(rawT);
            if (Array.isArray(parsedT)) tagsList = parsedT.map((x: any) => String(x).trim()).filter(Boolean);
            else tagsList = String(rawT).split(',').map((s: string) => s.trim()).filter(Boolean);
          } catch (e) {
            tagsList = String(rawT).split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
      } catch (e) {
        tagsList = [];
      }

      // delivery (dropdown-style): accept `delivery` (array) or comma/JSON string
      const hasDelivery = Object.prototype.hasOwnProperty.call(data, 'delivery') || Object.prototype.hasOwnProperty.call(data, 'deliveryOptions') || Object.prototype.hasOwnProperty.call(data, 'delivery_option');
      let deliveryList: string[] = [];
      if (hasDelivery) {
        try {
          const raw = data.delivery ?? data.deliveryOptions ?? data.delivery_option ?? null;
          if (Array.isArray(raw)) deliveryList = raw.map((x: any) => String(x).trim()).filter(Boolean);
          else if (typeof raw === 'string' && raw.trim()) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) deliveryList = parsed.map((x: any) => String(x).trim()).filter(Boolean);
              else deliveryList = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
            } catch (e) {
              deliveryList = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          }
        } catch (e) {
          deliveryList = [];
        }
        // Normalize and validate delivery values against allowed static options
        if (deliveryList && deliveryList.length) {
          const mapped: string[] = [];
          const invalid: string[] = [];
          for (const d of deliveryList) {
            const m = mapDeliveryValue(d);
            if (!m) invalid.push(String(d));
            else mapped.push(m);
          }
          if (invalid.length) return NextResponse.json({ status: 400, message: `Invalid delivery option(s): ${invalid.join(', ')}`, data: {} }, { status: 400 });
          // dedupe and assign canonical values
          deliveryList = Array.from(new Set(mapped));
        }
      }

      // Conditional required checks (based on category name)
      if (isFood) {
        if (!dietaryList || dietaryList.length === 0) return NextResponse.json({ status: 400, message: 'dietary[] is required for food products', data: {} }, { status: 400 });
        if (!Array.isArray(nutrition) || nutrition.length === 0) return NextResponse.json({ status: 400, message: 'nutrition[] is required for food products', data: {} }, { status: 400 });
      }
      if (isSupplement && (!vitaminsList || vitaminsList.length === 0)) {
        return NextResponse.json({ status: 400, message: 'vitamins[] is recommended/required for supplement products', data: {} }, { status: 400 });
      }
      if (isWellness && (!healthBenefits || String(healthBenefits).trim() === '')) {
        return NextResponse.json({ status: 400, message: 'healthBenefits is required for wellness/organic products', data: {} }, { status: 400 });
      }

      // validate vitamins against whitelist
      const invalid = findInvalidVitamins(vitaminsList);
      if (invalid.length) {
        return NextResponse.json({ status: 400, message: `vitamin is not here: ${invalid.join(', ')}`, data: {} }, { status: 400 });
      }

      const normalizedWeightVsPrice = Array.isArray(weightVsPrice)
        ? weightVsPrice.map((it: any, idx: number) => {
          const wt = it.weight ?? it.wt ?? '';
          const prRaw = it.price ?? it.pr ?? it.value;
          const pr = parseStrictNumber(prRaw, PRICE_MAX_DIGITS);
          const qRaw = it.quantity ?? it.qty ?? it.q ?? 1;
          const qNum = Number(qRaw);
          const quantity = Number.isFinite(qNum) && qNum > 0 ? Math.floor(qNum) : 1;
          return { weight: String(wt), price: pr.ok ? Number(pr.value) : 0, quantity };
        })
        : [];

      const product = new Product({
        title: String(titleTrimmed).trim(),
        mrp: Number(mrpParsed.value),
        actualPrice: Number(actualParsed.value),
        weightVsPrice: normalizedWeightVsPrice,
        nutrition: Array.isArray(nutrition) ? nutrition : [],
        vitamins: vitaminsList,
        dietary: dietaryList,
        tags: tagsList,
        delivery: deliveryList,
        healthBenefits: healthBenefits ?? null,
        description: description ?? null,
        images: imagesPaths,
        categoryId: categoryId ?? null,
      });

      await product.save();
      return NextResponse.json({ status: 201, message: 'Product created', data: product }, { status: 201 });
    }

    if (action === 'edit') {
      if (!id) return NextResponse.json({ status: 400, message: 'Product id is required for edit', data: {} }, { status: 400 });

      let product = await findProductByIdSafe(id);
      if (!product) return NextResponse.json({ status: 404, message: 'Product not found', data: {} }, { status: 404 });

      // update fields only when the client explicitly provided them
      if (hasTitle) {
        const tTrim = typeof rawTitle === 'string' ? String(rawTitle).trim() : (rawTitle ? String(rawTitle).trim() : '');
        if (!tTrim) {
          console.debug('Edit validation failed: title whitespace', { hasTitle, rawTitle });
          return NextResponse.json({ status: 400, message: 'Validation failed', data: { errors: { title: 'Product title cannot be only whitespace', provided: rawTitle } } }, { status: 400 });
        }
        if (String(tTrim).length > TITLE_MAX) return NextResponse.json({ status: 400, message: `title must be at most ${TITLE_MAX} characters`, data: { errors: { title: `title must be at most ${TITLE_MAX} characters`, provided: rawTitle } } }, { status: 400 });
        product.title = String(tTrim);
      }
      if (hasMrp) {
        const p = parseStrictNumber(data.mrp ?? data.mrpValue ?? mrp, PRICE_MAX_DIGITS);
        if (!p.ok) return NextResponse.json({ status: 400, message: `MRP must be numeric and up to ${PRICE_MAX_DIGITS} digits`, data: {} }, { status: 400 });
        product.mrp = Number(p.value);
      }
      if (hasActualPrice) {
        const p = parseStrictNumber(data.actualPrice ?? data.price ?? actualPrice, PRICE_MAX_DIGITS);
        if (!p.ok) return NextResponse.json({ status: 400, message: `Actual price must be numeric and up to ${PRICE_MAX_DIGITS} digits`, data: {} }, { status: 400 });
        product.actualPrice = Number(p.value);
      }
      if (hasWeightVsPrice) {
        const wvpCheckEdit = validateWeightVsPriceArray(weightVsPrice);
        if (!wvpCheckEdit.ok) return NextResponse.json({ status: 400, message: wvpCheckEdit.message || 'Invalid weightVsPrice', data: {} }, { status: 400 });
        if (Array.isArray(weightVsPrice)) {
          product.weightVsPrice = weightVsPrice.map((it: any) => {
            const wt = it.weight ?? it.wt ?? '';
            const prRaw = it.price ?? it.pr ?? it.value;
            const pr = parseStrictNumber(prRaw);
            const qRaw = it.quantity ?? it.qty ?? it.q ?? 1;
            const qNum = Number(qRaw);
            const quantity = Number.isFinite(qNum) && qNum > 0 ? Math.floor(qNum) : 1;
            return { weight: String(wt), price: pr.ok ? Number(pr.value) : 0, quantity };
          });
        }
      }
      if (hasNutrition && Array.isArray(nutrition)) product.nutrition = nutrition;
      if (hasVitamins && Array.isArray(vitamins)) {
        const invalidEdit = findInvalidVitamins(vitamins);
        if (invalidEdit.length) {
          return NextResponse.json({ status: 400, message: `vitamin is not here: ${invalidEdit.join(', ')}`, data: {} }, { status: 400 });
        }
        product.vitamins = vitamins;
      }
      if (hasDietary && Array.isArray(dietary)) {
        product.dietary = dietary;
      }
      if (hasTags && Array.isArray(tags)) {
        product.tags = tags;
      }
      // delivery update for edit branch: accept `delivery` (array) or comma/JSON string
      {
        const hasDeliveryLocal =
          Object.prototype.hasOwnProperty.call(data, 'delivery') ||
          Object.prototype.hasOwnProperty.call(data, 'deliveryOptions') ||
          Object.prototype.hasOwnProperty.call(data, 'delivery_option');
        if (hasDeliveryLocal) {
          try {
            const raw = data.delivery ?? data.deliveryOptions ?? data.delivery_option ?? null;
            let parsedList: string[] = [];
            if (Array.isArray(raw)) parsedList = raw.map((x: any) => String(x).trim()).filter(Boolean);
            else if (typeof raw === 'string' && raw.trim()) {
              try {
                const p = JSON.parse(raw);
                if (Array.isArray(p)) parsedList = p.map((x: any) => String(x).trim()).filter(Boolean);
                else parsedList = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
              } catch (e) {
                parsedList = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
              }
            }
            // Normalize and validate edit delivery values against allowed static options
            if (parsedList && parsedList.length) {
              const mapped: string[] = [];
              const invalid: string[] = [];
              for (const d of parsedList) {
                const m = mapDeliveryValue(d);
                if (!m) invalid.push(String(d));
                else mapped.push(m);
              }
              if (invalid.length) return NextResponse.json({ status: 400, message: `Invalid delivery option(s): ${invalid.join(', ')}`, data: {} }, { status: 400 });
              parsedList = Array.from(new Set(mapped));
            }
            product.delivery = parsedList;
          } catch (e) {
            return NextResponse.json({ status: 400, message: 'Invalid delivery value', data: {} }, { status: 400 });
          }
        }
      }
      if (hasHealth && healthBenefits !== undefined) {
        if (String(healthBenefits).length > HEALTH_MAX) return NextResponse.json({ status: 400, message: `healthBenefits must be at most ${HEALTH_MAX} characters`, data: {} }, { status: 400 });
        product.healthBenefits = healthBenefits;
      }
      if (hasDescription && description !== undefined) {
        if (String(description).length > DESCRIPTION_MAX) return NextResponse.json({ status: 400, message: `description must be at most ${DESCRIPTION_MAX} characters`, data: {} }, { status: 400 });
        product.description = description;
      }
      if (hasCategory && categoryId !== undefined) product.categoryId = categoryId;

      // Images update logic
      // parsedData can control behavior via:
      // - imagesMode: 'append' | 'replace' (default 'append')
      // - removeImages: array of image URLs to remove
      const imagesMode = (data.imagesMode || data.imagesAction || data.imagesUpdate || '').toString().toLowerCase() || 'append';

      // Remove specific images if requested
      if (Array.isArray(data.removeImages) && data.removeImages.length) {
        const toRemove: string[] = data.removeImages.map((x: any) => String(x));
        // filter out from product.images and delete files if   local
        const keep: string[] = [];
        for (const img of product.images || []) {
          if (toRemove.includes(img)) {
            try {
              if (img && String(img).startsWith('/uploads/products/')) {
                const rel = String(img).replace(/^\//, '');
                const filePath = path.join(process.cwd(), 'public', rel);
                await fs.promises.unlink(filePath).catch(() => null);
              }
            } catch (e) {
              console.debug('Failed to remove specific product image', String(e));
            }
          } else {
            keep.push(img);
          }
        }
        product.images = keep;
      }

      if (imagesPaths.length) {
        if (imagesMode === 'replace' || data.forceReplaceImages) {
          // delete old local files
          try {
            for (const img of product.images || []) {
              if (img && String(img).startsWith('/uploads/products/')) {
                const rel = String(img).replace(/^\//, '');
                const filePath = path.join(process.cwd(), 'public', rel);
                await fs.promises.unlink(filePath).catch(() => null);
              }
            }
          } catch (e) {
            console.debug('Failed to remove old product images', String(e));
          }
          product.images = imagesPaths;
        } else {
          // append mode by default: merge existing and new images
          product.images = Array.from(new Set([...(product.images || []), ...imagesPaths]));
        }
      }

      await product.save();
      return NextResponse.json({ status: 200, message: 'Product updated', data: product }, { status: 200 });
    }

    if (action === 'delete') {
      if (!id) return NextResponse.json({ status: 400, message: 'Product id is required for delete', data: {} }, { status: 400 });

      let product = await (async () => {
        try {
          return await Product.findOne({ productId: id });
        } catch (e) {
          // fallback
        }
        try {
          return await Product.findOne({ _id: id });
        } catch (e) {
          return null;
        }
      })();
      if (!product) return NextResponse.json({ status: 404, message: 'Product not found', data: {} }, { status: 404 });

      // remove image files
      try {
        for (const img of product.images || []) {
          if (img && String(img).startsWith('/uploads/products/')) {
            const rel = String(img).replace(/^\//, '');
            const filePath = path.join(process.cwd(), 'public', rel);
            await fs.promises.unlink(filePath).catch(() => null);
          }
        }
      } catch (e) {
        console.debug('DELETE /api/product - failed to remove product images', String(e));
      }

      await Product.deleteOne({ _id: product._id });
      return NextResponse.json({ status: 200, message: 'Product deleted', data: {} }, { status: 200 });
    }

    return NextResponse.json({ status: 400, message: 'Unknown action', data: {} }, { status: 400 });
  } catch (error: any) {
    console.error('POST /api/product error', error);
    return NextResponse.json({ status: 500, message: error.message || 'Failed to process product action', data: {} }, { status: 500 });
  }
}
