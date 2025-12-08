import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Review from '@/models/review';
import User from '@/models/users';
import { verifyToken } from '@/lib/auth';

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

// POST - Update review status (approve/reject)
export async function POST(req: NextRequest, context: any) {
    try {
        await connectDB();

        // Verify admin authentication
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { status: 401, message: 'Unauthorized - No token provided', data: {} },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        if (!decoded || !decoded.userId) {
            return NextResponse.json(
                { status: 401, message: 'Unauthorized - Invalid token', data: {} },
                { status: 401 }
            );
        }

        // Get user and check if admin - try both _id and id field
        let user = await User.findById(decoded.userId);
        if (!user) {
            user = await User.findOne({ id: decoded.userId });
        }
        
        if (!user) {
            return NextResponse.json(
                { status: 401, message: 'Unauthorized - User not found', data: {} },
                { status: 401 }
            );
        }

        // For now, allow any authenticated user (you can add role check later if needed)
        // const isAdmin = user.roleId && (user.roleId.includes('admin') || user.roleId.includes('superadmin'));
        // if (!isAdmin) {
        //     return NextResponse.json(
        //         { status: 403, message: 'Access denied. Admin privileges required.', data: {} },
        //         { status: 403 }
        //     );
        // }

        const params = context && context.params ? await context.params : {};
        const reviewId = params?.id;

        if (!reviewId) {
            return NextResponse.json(
                { status: 400, message: 'Review ID is required', data: {} },
                { status: 400 }
            );
        }

        const body = await req.json();
        const { action, status, adminNote } = body;

        // Determine status from action or status field
        let reviewStatus = status;
        if (action) {
            if (action === 'approve') reviewStatus = 'approved';
            else if (action === 'reject') reviewStatus = 'rejected';
            else if (action === 'pending') reviewStatus = 'pending';
        }

        // Validate status
        if (!reviewStatus || !['approved', 'rejected', 'pending'].includes(reviewStatus)) {
            return NextResponse.json(
                { status: 400, message: 'Invalid action/status. Must be: approve/approved, reject/rejected, or pending', data: {} },
                { status: 400 }
            );
        }

        // Find the review
        const review = await findReviewByIdSafe(reviewId);

        if (!review) {
            return NextResponse.json(
                { status: 404, message: 'Review not found', data: {} },
                { status: 404 }
            );
        }

        // Update review status
        review.status = reviewStatus;
        if (adminNote) {
            review.adminNote = adminNote;
        }

        await review.save();

        return NextResponse.json(
            {
                status: 200,
                message: `Review ${reviewStatus} successfully`,
                data: { review },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('PUT /api/admin/reviews/[id] error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to update review status',
                data: {},
            },
            { status: 500 }
        );
    }
}

// DELETE - Delete review (admin)
export async function DELETE(req: NextRequest, context: any) {
    try {
        await connectDB();

        // Verify admin authentication
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { status: 401, message: 'Unauthorized - No token provided', data: {} },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        if (!decoded || !decoded.userId) {
            return NextResponse.json(
                { status: 401, message: 'Unauthorized - Invalid token', data: {} },
                { status: 401 }
            );
        }

        // Get user and check if admin - try both _id and id field
        let user = await User.findById(decoded.userId);
        if (!user) {
            user = await User.findOne({ id: decoded.userId });
        }
        
        if (!user) {
            return NextResponse.json(
                { status: 401, message: 'Unauthorized - User not found', data: {} },
                { status: 401 }
            );
        }

        // For now, allow any authenticated user (you can add role check later if needed)
        // const isAdmin = user.roleId && (user.roleId.includes('admin') || user.roleId.includes('superadmin'));
        // if (!isAdmin) {
        //     return NextResponse.json(
        //         { status: 403, message: 'Access denied. Admin privileges required.', data: {} },
        //         { status: 403 }
        //     );
        // }

        const params = context && context.params ? await context.params : {};
        const reviewId = params?.id;

        if (!reviewId) {
            return NextResponse.json(
                { status: 400, message: 'Review ID is required', data: {} },
                { status: 400 }
            );
        }

        // Find the review
        const review = await findReviewByIdSafe(reviewId);

        if (!review) {
            return NextResponse.json(
                { status: 404, message: 'Review not found', data: {} },
                { status: 404 }
            );
        }

        // Soft delete
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
    } catch (error: any) {
        console.error('DELETE /api/admin/reviews/[id] error:', error);
        return NextResponse.json(
            {
                status: 500,
                message: error.message || 'Failed to delete review',
                data: {},
            },
            { status: 500 }
        );
    }
}
