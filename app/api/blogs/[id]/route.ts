import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Blog from '@/models/blog';

async function findBlogByIdSafe(id: string) {
    if (!id) return null;
    let blog: any = await Blog.findOne({ blogId: id, isDeleted: false }).lean();
    if (blog) return blog;
    try {
        blog = await Blog.findOne({ _id: id, isDeleted: false }).lean();
        return blog;
    } catch (e) {
        return null;
    }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } } | any) {
    try {
        await connectDB();
        // prefer framework-provided params, but fall back to parsing URL path
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
            return NextResponse.json({ status: 400, message: 'Blog id is required', data: {} }, { status: 400 });
        }

        const blog = await findBlogByIdSafe(id);
        if (!blog) {
            return NextResponse.json({ status: 404, message: 'Blog not found', data: {} }, { status: 404 });
        }

        return NextResponse.json({ status: 200, message: 'Blog fetched', data: blog }, { status: 200 });
    } catch (error: any) {
        console.error('GET /api/blogs/[id] error', error);
        return NextResponse.json({ status: 500, message: error.message || 'Failed to fetch blog', data: {} }, { status: 500 });
    }
}
