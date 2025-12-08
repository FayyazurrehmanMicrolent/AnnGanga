import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Review from '@/models/review';
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

export async function PUT(req: NextRequest, context: any) {
    try {
        await connectDB();

        const params = context && context.params ? await context.params : {};
        const productId = params?.id;
        const reviewId = params?.reviewId;

        if (!productId) {
            return NextResponse.json({ status: 400, message: 'Product ID is required', data: {} }, { status: 400 });
        }

        if (!reviewId) {
            return NextResponse.json({ status: 400, message: 'Review ID is required', data: {} }, { status: 400 });
        }

        // Parse body (support multipart/form-data and JSON)
        const contentType = req.headers.get('content-type') || '';
        let data: any = {};
        const imagePaths: string[] = [];

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

            // Merge direct simple fields
            const directKeys = ['userId', 'rating', 'title', 'comment', 'action', 'admin'];
            for (const k of directKeys) {
                const v = form.get(k);
                if (v !== null && typeof v !== 'undefined') {
                    if (k === 'rating') data[k] = Number(String(v));
                    else if (k === 'admin') data[k] = String(v) === 'true' || v === '1';
                    else data[k] = String(v);
                }
            }

            // collect files
            try {
                for (const entry of form.entries() as any) {
                    const [key, value] = entry;
                    const lower = String(key || '').toLowerCase();
                    if (lower.includes('image')) {
                        if (value && typeof (value as any).size !== 'undefined') {
                            const saved = await saveUpload(value as Blob, 'reviews');
                            if (saved) imagePaths.push(saved);
                        }
                    }
                }
            } catch (e) {
                const files = form.getAll('images') as any[];
                if (files && files.length) for (const f of files) if (f && (f as any).size) {
                    const saved = await saveUpload(f as Blob, 'reviews');
                    if (saved) imagePaths.push(saved);
                }
            }
        } else {
            const body = await req.json().catch(() => ({}));
            data = body || {};
            if (Array.isArray(body.images)) for (const img of body.images) if (img) imagePaths.push(String(img));
        }

        const review = await findReviewByIdSafe(String(reviewId));
        if (!review || review.isDeleted) {
            return NextResponse.json({ status: 404, message: 'Review not found', data: {} }, { status: 404 });
        }

        // Ensure productId matches (sanity check)
        if (String(review.productId) !== String(productId) && review.productId !== productId) {
            // allow if productId param is different but provided in body matches review.productId
            // otherwise deny
            if (data.productId && String(data.productId) === String(review.productId)) {
                // ok
            } else {
                return NextResponse.json({ status: 400, message: 'Product ID does not match review', data: {} }, { status: 400 });
            }
        }

        // If admin flag is present and truthy, allow admin actions (status/adminNote)
        const isAdminAction = !!data.admin;

        // If userId is provided and matches review.userId, allow user edit
        const actingUserId = data.userId || null;
        const isOwner = actingUserId && String(actingUserId) === String(review.userId);

        if (!isAdminAction && !isOwner) {
            // No admin and not owner -> forbidden
            return NextResponse.json({ status: 403, message: 'You are not authorized to modify this review', data: {} }, { status: 403 });
        }

        // Handle admin actions: approve/reject/set status
        if (isAdminAction) {
            if (data.status) {
                const s = String(data.status).toLowerCase();
                if (['approved', 'pending', 'rejected'].includes(s)) review.status = s as any;
            }
            if (data.adminNote !== undefined) review.adminNote = data.adminNote ? String(data.adminNote).trim() : null;
            await review.save();
            return NextResponse.json({ status: 200, message: 'Review updated (admin)', data: review }, { status: 200 });
        }

        // Owner edit: allow rating/title/comment/images; reset status to pending
        if (data.rating !== undefined) {
            const r = Number(data.rating);
            if (isNaN(r) || r < 1 || r > 5) {
                return NextResponse.json({ status: 400, message: 'Rating must be between 1 and 5', data: {} }, { status: 400 });
            }
            review.rating = r;
        }
        if (data.title !== undefined) review.title = data.title ? String(data.title).trim() : null;
        if (data.comment !== undefined) review.comment = data.comment ? String(data.comment).trim() : null;

        // Merge image lists: prefer provided images array if present, otherwise append uploaded images
        if (data.images !== undefined) {
            review.images = Array.isArray(data.images) ? data.images : [];
        }
        if (imagePaths.length) review.images = Array.from(new Set([...(review.images || []), ...imagePaths]));

        // Reset to pending on owner edit
        review.status = 'pending';

        await review.save();

        return NextResponse.json({ status: 200, message: 'Review updated successfully and is pending approval', data: review }, { status: 200 });
    } catch (error: any) {
        console.error('PUT /api/product/[id]/review/[reviewId] error:', error);
        return NextResponse.json({ status: 500, message: error.message || 'Failed to update review', data: {} }, { status: 500 });
    }
}
