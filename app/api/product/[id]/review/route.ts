import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Review from '@/models/review';
import User from '@/models/users';
import { saveUpload } from '@/lib/upload';

// Helper: find review by reviewId or _id
async function findReviewByIdSafe(id: string) {
    if (!id) return null;
    let review = await Review.findOne({ reviewId: id });
    if (review) return review;
    try {
        review = await Review.findOne({ _id: id });
        return review;
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest, context: any) {
    try {
        await connectDB();

        const params = context && context.params ? await context.params : {};
        const productId = params?.id;

        const url = new URL(req.url);
        const qProductId = url.searchParams.get('productId');
        const userId = url.searchParams.get('userId');
        const status = url.searchParams.get('status'); // 'approved' | 'pending' | 'rejected' | 'all'
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

        const pid = productId || qProductId;

        if (!pid) {
            return NextResponse.json(
                { status: 400, message: 'Product ID is required', data: {} },
                { status: 400 }
            );
        }

        const skip = (page - 1) * limit;

        // Build query
        const query: any = { productId: pid, isDeleted: false };

        // Filter by status (default to approved for public view)
        if (status === 'all') {
            // No status filter
        } else if (status) {
            query.status = status;
        } else {
            query.status = 'approved'; // Default to approved reviews
        }

        // Filter by user if specified
        if (userId) {
            query.userId = userId;
        }

        // Get total count
        const total = await Review.countDocuments(query);

        // Fetch reviews
        const reviews = await Review.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get user details for each review
        const userIds = [...new Set(reviews.map((r) => r.userId))];
        const users = await User.find({ id: { $in: userIds } })
            .select('id name profileImage')
            .lean();

        const userMap = new Map(users.map((u) => [u.id, u]));

        const reviewsWithUsers = reviews.map((review) => {
            const user = userMap.get(review.userId);
            return {
                ...review,
                userName: user?.name || 'Anonymous',
                userImage: user?.profileImage || null,
            };
        });

        // Calculate rating breakdown
        const ratingBreakdown = await Review.aggregate([
            { $match: { productId: pid, status: 'approved', isDeleted: false } },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 },
                },
            },
        ]);

        const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratingBreakdown.forEach((item) => {
            breakdown[item._id as keyof typeof breakdown] = item.count;
        });

        const totalReviews = Object.values(breakdown).reduce((a, b) => a + b, 0);
        const averageRating = totalReviews > 0
            ? (breakdown[5] * 5 + breakdown[4] * 4 + breakdown[3] * 3 + breakdown[2] * 2 + breakdown[1] * 1) / totalReviews
            : 0;

        const pages = Math.ceil(total / limit);

        return NextResponse.json(
            {
                status: 200,
                message: 'Reviews fetched successfully',    
                data: {
                    reviews: reviewsWithUsers,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages,
                    },            
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/product/[id]/review error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to fetch reviews',
                data: {},
            },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest, context: any) {
    try {
        await connectDB();

        const params = context && context.params ? await context.params : {};
        const productIdFromPath = params?.id;

        const url = new URL(req.url);
        const qProductId = url.searchParams.get('productId');
        const actionQuery = url.searchParams.get('action');

        // Robust body parsing: support JSON and multipart/form-data (with `data` field and file uploads)
        let action = (actionQuery || 'create').toString().toLowerCase();
        let data: any = {};
        const imagesPaths: string[] = [];

        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('multipart/form-data') || contentType.includes('form-data')) {
            const form = await req.formData();

            const dataField = form.get('data');
            if (dataField) {
                try {
                    data = typeof dataField === 'string' ? JSON.parse(String(dataField)) : JSON.parse(String(dataField));
                } catch (e) {
                    data = {};
                }
            }

            if (!data) data = {};

            // Merge simple direct fields that might be sent outside `data`
            const directKeys = ['action', 'productId', 'userId', 'rating', 'title', 'comment', 'orderId'];
            for (const k of directKeys) {
                try {
                    const v = form.get(k);
                    if (v !== null && typeof v !== 'undefined') {
                        // numeric fields
                        if (k === 'rating') data[k] = Number(String(v));
                        else data[k] = String(v);
                    }
                } catch (e) {
                    // ignore
                }
            }

            // Resolve action after merging
            if (data.action) action = String(data.action).toLowerCase();

            // Collect any file fields that include 'image'
            const collectedFiles: Blob[] = [];
            try {
                for (const entry of form.entries() as any) {
                    const [key, value] = entry;
                    const lower = String(key || '').toLowerCase();
                    if (lower.includes('image')) {
                        if (value && typeof (value as any).size !== 'undefined') collectedFiles.push(value as Blob);
                    }
                }
            } catch (e) {
                // fallback: try common keys
                const files = form.getAll('images') as any[];
                if (files && files.length) for (const f of files) if (f && (f as any).size) collectedFiles.push(f as Blob);
                const single = form.get('image') as Blob | null;
                if (single && (single as any).size) collectedFiles.push(single as Blob);
            }

            if (collectedFiles.length) {
                for (const f of collectedFiles) {
                    if (f && (f as any).size) {
                        const saved = await saveUpload(f as Blob, 'reviews');
                        if (saved) imagesPaths.push(saved);
                    }
                }
            }
        } else {
            const body = await req.json().catch(() => ({}));
            action = (body.action || action).toLowerCase();
            data = body.data || body || {};
            if (Array.isArray(body.images)) {
                // allow images passed as URLs in JSON
                for (const img of body.images) if (img) imagesPaths.push(String(img));
            }
        }

        const productId = productIdFromPath || data.productId || qProductId;

        // Attach any saved image paths to data.images (prefer explicit data.images if provided)
        if (!Array.isArray(data.images)) data.images = [];
        if (imagesPaths.length) data.images = Array.from(new Set([...(data.images || []), ...imagesPaths]));

        if (!productId) {
            return NextResponse.json(
                { status: 400, message: 'Product ID is required', data: {} },
                { status: 400 }
            );
        }

        // CREATE REVIEW
        if (action === 'create') {
            const { userId, rating, title, comment, images, orderId } = data;

            if (!userId) {
                return NextResponse.json(
                    { status: 400, message: 'User ID is required', data: {} },
                    { status: 400 }
                );
            }

            if (!rating || rating < 1 || rating > 5) {
                return NextResponse.json(
                    { status: 400, message: 'Rating must be between 1 and 5', data: {} },
                    { status: 400 }
                );
            }

            // Check if user already reviewed this product
            const existingReview = await Review.findOne({
                userId,
                productId,
                isDeleted: false,
            });

            if (existingReview) {
                return NextResponse.json(
                    { status: 409, message: 'You have already reviewed this product', data: {} },
                    { status: 409 }
                );
            }

            // TODO: Verify purchase when Order model is available
            const isVerifiedPurchase = false;

            const review = new Review({
                userId,
                productId,
                orderId: orderId || null,
                rating: Number(rating),
                title: title ? String(title).trim() : null,
                comment: comment ? String(comment).trim() : null,
                images: Array.isArray(images) ? images : [],
                isVerifiedPurchase,
                status: 'pending', // Reviews need admin approval
            });

            await review.save();

            return NextResponse.json(
                {
                    status: 201,
                    message: 'Review submitted successfully and is pending approval',
                    data: review,
                },
                { status: 201 }
            );
        }

        // EDIT REVIEW (User can edit their own review)
        if (action === 'edit') {
            const id = data.id || data.reviewId;
            const userId = data.userId;

            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Review ID is required for edit', data: {} },
                    { status: 400 }
                );
            }

            if (!userId) {
                return NextResponse.json(
                    { status: 400, message: 'User ID is required', data: {} },
                    { status: 400 }
                );
            }

            const review = await findReviewByIdSafe(String(id));
            if (!review || review.isDeleted) {
                return NextResponse.json(
                    { status: 404, message: 'Review not found', data: {} },
                    { status: 404 }
                );
            }

            // Verify ownership
            if (review.userId !== userId) {
                return NextResponse.json(
                    { status: 403, message: 'You can only edit your own reviews', data: {} },
                    { status: 403 }
                );
            }

            // Update fields
            if (data.rating !== undefined) {
                const newRating = Number(data.rating);
                if (newRating < 1 || newRating > 5) {
                    return NextResponse.json(
                        { status: 400, message: 'Rating must be between 1 and 5', data: {} },
                        { status: 400 }
                    );
                }
                review.rating = newRating;
            }

            if (data.title !== undefined) review.title = data.title ? String(data.title).trim() : null;
            if (data.comment !== undefined) review.comment = data.comment ? String(data.comment).trim() : null;
            if (data.images !== undefined) review.images = Array.isArray(data.images) ? data.images : [];

            // Reset to pending if edited
            review.status = 'pending';

            await review.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Review updated successfully and is pending approval',
                    data: review,
                },
                { status: 200 }
            );
        }

        // DELETE REVIEW (User can delete their own review)
        if (action === 'delete') {
            const id = data.id || data.reviewId;
            const userId = data.userId;

            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Review ID is required for delete', data: {} },
                    { status: 400 }
                );
            }

            const review = await findReviewByIdSafe(String(id));
            if (!review) {
                return NextResponse.json(
                    { status: 404, message: 'Review not found', data: {} },
                    { status: 404 }
                );
            }

            // If userId provided, verify ownership (user delete)
            if (userId && review.userId !== userId) {
                return NextResponse.json(
                    { status: 403, message: 'You can only delete your own reviews', data: {} },
                    { status: 403 }
                );
            }

            review.isDeleted = true;
            await review.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Review deleted successfully',
                    data: {},
                },
                { status: 200 }
            );
        }

        // APPROVE REVIEW (Admin only)
        if (action === 'approve') {
            const id = data.id || data.reviewId;

            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Review ID is required for approval', data: {} },
                    { status: 400 }
                );
            }

            const review = await findReviewByIdSafe(String(id));
            if (!review || review.isDeleted) {
                return NextResponse.json(
                    { status: 404, message: 'Review not found', data: {} },
                    { status: 404 }
                );
            }

            review.status = 'approved';
            review.adminNote = data.adminNote ? String(data.adminNote).trim() : null;
            await review.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Review approved successfully',
                    data: review,
                },
                { status: 200 }
            );
        }

        // REJECT REVIEW (Admin only)
        if (action === 'reject') {
            const id = data.id || data.reviewId;

            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Review ID is required for rejection', data: {} },
                    { status: 400 }
                );
            }

            const review = await findReviewByIdSafe(String(id));
            if (!review || review.isDeleted) {
                return NextResponse.json(
                    { status: 404, message: 'Review not found', data: {} },
                    { status: 404 }
                );
            }

            review.status = 'rejected';
            review.adminNote = data.adminNote ? String(data.adminNote).trim() : 'Review rejected by admin';
            await review.save();

            return NextResponse.json(
                {
                    status: 200,
                    message: 'Review rejected successfully',
                    data: review,
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { status: 400, message: 'Invalid action', data: {} },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('POST /api/product/[id]/review error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to process review action',
                data: {},
            },
            { status: 500 }
        );
    }
}
