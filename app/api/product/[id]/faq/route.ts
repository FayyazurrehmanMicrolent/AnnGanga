import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Faq from '@/models/faq';
import { authenticateUser } from '@/lib/middleware';
import { verifyToken } from '@/lib/auth';
import User from '@/models/users';
import Role from '@/models/roles';

async function findFaqByIdSafe(id: string) {
    if (!id) return null;
    let faq = await Faq.findOne({ faqId: id });
    if (faq) return faq;
    try {
        faq = await Faq.findOne({ _id: id });
        return faq;
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest, context: any) {
    try {
        await connectDB();

        const params = context && context.params ? await context.params : {};
        const productId = params?.id;

        // allow ?productId=... as fallback
        let url: URL;
        try {
            url = new URL(req.url);
        } catch (e) {
            const host = req.headers.get('host') || 'localhost:3000';
            url = new URL(req.url, `http://${host}`);
        }
        const qProductId = url.searchParams.get('productId');
        const pid = productId || qProductId;

        // Debug: log params and url when productId missing to help trace routing issues
        if (!pid) {
            console.debug('GET /api/product/:id/faq - missing productId', { params, reqUrl: req.url, qProductId });
            return NextResponse.json({ status: 400, message: 'Product id is required', data: { params, qProductId, reqUrl: req.url } }, { status: 400 });
        }

        const faqs = await Faq.find({ productId: pid, isDeleted: false }).sort({ createdAt: -1 }).lean();
        return NextResponse.json({ status: 200, message: 'FAQs fetched', data: faqs }, { status: 200 });
    } catch (error: any) {
        console.error('GET /api/product/:id/faq error', error);
        return NextResponse.json({ status: 500, message: error.message || 'Failed to fetch FAQs', data: {} }, { status: 500 });
    }
}

export async function POST(req: NextRequest, context: any) {
    try {
        await connectDB();

        const params = context && context.params ? await context.params : {};
        const productIdFromPath = params?.id;

        // parse URL to read query params
        let url: URL;
        try {
            url = new URL(req.url);
        } catch (e) {
            const host = req.headers.get('host') || 'localhost:3000';
            url = new URL(req.url, `http://${host}`);
        }
        const qProductId = url.searchParams.get('productId') || url.searchParams.get('id');
        const actionQuery = url.searchParams.get('action');

        let action = actionQuery ? String(actionQuery).toLowerCase() : 'create';
        let parsed: any = {};
        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            const body = await req.json().catch(() => ({}));
            action = (body.action || action).toLowerCase();
            parsed = body.data || body;
        } else {
            // try to parse JSON body even if content-type not set
            const body = await req.json().catch(() => ({}));
            action = (body.action || action).toLowerCase();
            parsed = body.data || body;
        }

        const productId = productIdFromPath || parsed.productId || qProductId;

        if (!productId) return NextResponse.json({ status: 400, message: 'Product id is required', data: {} }, { status: 400 });

        // Protect create/edit/delete (and common synonyms) actions: only admin role can perform these.
        if (['create','edit','delete','update','remove','destroy'].includes(action)) {
            // Authenticate via Authorization header first
            let authResult = await authenticateUser(req as any);

            // If authenticateUser failed, try cookie token fallback
            if (!authResult.authenticated) {
                try {
                    const token = (req as any).cookies?.get('token')?.value;
                    if (token) {
                        const decoded = verifyToken(token);
                        if (decoded) authResult = { authenticated: true, user: decoded, error: null } as any;
                    }
                } catch (e) {
                    // ignore
                }
            }

            if (!authResult.authenticated || !authResult.user) {
                return NextResponse.json({ status: 401, message: 'Authentication required. Please provide a valid token.', data: {} }, { status: 401 });
            }

            const userId = authResult.user.userId || authResult.user.user_id || authResult.user.id;
            if (!userId) return NextResponse.json({ status: 401, message: 'User id not found in token.', data: {} }, { status: 401 });

            // Support tokens that contain either the application `id` (uuid) or MongoDB `_id`.
            const user = await User.findOne({
                $and: [
                    { isDeleted: false },
                    { $or: [{ id: userId }, { _id: userId }] }
                ]
            });
            if (!user) return NextResponse.json({ status: 404, message: 'User not found.', data: {} }, { status: 404 });

            let role: any = null;
            try { if (user.roleId) role = await Role.findOne({ roleId: user.roleId, isRoleActive: true }); } catch (e) { }
            const isAdmin = role && typeof role.role === 'string' && role.role.toLowerCase() === 'admin';
            if (!isAdmin) return NextResponse.json({ status: 403, message: 'Forbidden: admin role required to perform this action.', data: {} }, { status: 403 });
        }

        if (action === 'create') {
            const question = parsed.question || '';
            const answer = parsed.answer || '';
            if (!String(question).trim()) return NextResponse.json({ status: 400, message: 'Question is required', data: {} }, { status: 400 });
            if (!String(answer).trim()) return NextResponse.json({ status: 400, message: 'Answer is required', data: {} }, { status: 400 });

            const faq = new Faq({ productId, question: String(question).trim(), answer: String(answer).trim() });
            await faq.save();
            return NextResponse.json({ status: 201, message: 'FAQ created', data: faq }, { status: 201 });
        }

        if (action === 'edit') {
            const id = parsed.id || parsed.faqId;
            if (!id) return NextResponse.json({ status: 400, message: 'FAQ id is required for edit', data: {} }, { status: 400 });
            const faq = await findFaqByIdSafe(String(id));
            if (!faq) return NextResponse.json({ status: 404, message: 'FAQ not found', data: {} }, { status: 404 });

            if (parsed.question !== undefined) faq.question = String(parsed.question || '').trim();
            if (parsed.answer !== undefined) faq.answer = String(parsed.answer || '').trim();
            // allow moving FAQ to different product if provided
            if (parsed.productId) faq.productId = String(parsed.productId);

            await faq.save();
            return NextResponse.json({ status: 200, message: 'FAQ updated', data: faq }, { status: 200 });
        }

        if (action === 'delete') {
            const id = parsed.id || parsed.faqId;
            if (!id) return NextResponse.json({ status: 400, message: 'FAQ id is required for delete', data: {} }, { status: 400 });
            const faq = await findFaqByIdSafe(String(id));
            if (!faq) return NextResponse.json({ status: 404, message: 'FAQ not found', data: {} }, { status: 404 });

            try {
                // Perform hard delete so FAQ is removed from DB entirely
                await Faq.deleteOne({ _id: faq._id });
                return NextResponse.json({ status: 200, message: 'FAQ deleted', data: {} }, { status: 200 });
            } catch (err: any) {
                console.error('POST /api/product/:id/faq - delete failed', err);
                return NextResponse.json({ status: 500, message: err.message || 'Failed to delete FAQ', data: {} }, { status: 500 });
            }
        }

        return NextResponse.json({ status: 400, message: 'Unknown action', data: {} }, { status: 400 });
    } catch (error: any) {
        console.error('POST /api/product/:id/faq error', error);
        return NextResponse.json({ status: 500, message: error.message || 'Failed to process FAQ action', data: {} }, { status: 500 });
    }
}
