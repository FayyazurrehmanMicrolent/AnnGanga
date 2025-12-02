import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Blog from '@/models/blog';
import { saveUpload } from '@/lib/upload';

// Helper: find blog safely by blogId (uuid) or by Mongo _id
async function findBlogByIdSafe(id: string) {
    if (!id) return null;
    // try blogId (UUID) first
    let blog = await Blog.findOne({ blogId: id, isDeleted: false });
    if (blog) return blog;
    // try _id lookup
    try {
        blog = await Blog.findOne({ _id: id, isDeleted: false });
        return blog;
    } catch (e) {
        return null;
    }
}

// GET: Fetch all blogs or a single blog by id
export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const url = new URL(req.url, `http://${req.headers.get('host') || 'localhost:3000'}`);
        const id = url.searchParams.get('id') || url.searchParams.get('blogId');
        const published = url.searchParams.get('published'); // filter by published status

        if (id) {
            const blog = await findBlogByIdSafe(id);
            if (!blog) {
                return NextResponse.json(
                    { status: 404, message: 'Blog not found', data: {} },
                    { status: 404 }
                );
            }
            return NextResponse.json(
                { status: 200, message: 'Blog fetched', data: blog },
                { status: 200 }
            );
        }

        const filter: any = { isDeleted: false };
        if (published === 'true') {
            filter.isPublished = true;
        }

        const blogs = await Blog.find(filter).sort({ createdAt: -1 }).lean();
        return NextResponse.json(
            { status: 200, message: 'Blogs fetched', data: blogs },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('GET /api/blogs error', error);
        return NextResponse.json(
            { status: 500, message: error.message || 'Failed to fetch blogs', data: {} },
            { status: 500 }
        );
    }
}

// POST: Create, Edit, or Delete a blog
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
        const qId = url.searchParams.get('id') || url.searchParams.get('blogId');
        if (qAction) action = String(qAction).toLowerCase();
        if (qId) id = String(qId);

        if (contentType.includes('application/json')) {
            const body = await req.json().catch(() => ({}));
            action = (body.action || action).toLowerCase();
            parsedData = body.data || body;
            id = body.id || body.blogId || id;
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
            const directKeys = ['title', 'content', 'excerpt', 'author', 'tags', 'isPublished', 'productLinks'];
            for (const k of directKeys) {
                const v = form.get(k);
                if (v !== null && v !== undefined) {
                    const s = String(v);
                    if (k === 'tags' || k === 'productLinks') {
                        try {
                            parsedData[k] = JSON.parse(s);
                        } catch (e) {
                            parsedData[k] = s.split(',').map((x: string) => x.trim()).filter(Boolean);
                        }
                    } else if (k === 'isPublished') {
                        parsedData[k] = s === 'true' || s === '1';
                    } else {
                        parsedData[k] = s;
                    }
                }
            }

            const a = form.get('action') || (parsedData && parsedData.action);
            action = a ? String(a).toLowerCase() : action;
            const i = form.get('id') || (parsedData && (parsedData.id || parsedData.blogId));
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
                        const saved = await saveUpload(f as Blob, 'blogs');
                        if (saved) imagesPaths.push(saved);
                    }
                }
            }
        }

        const data = parsedData || {};

        if (action === 'create') {
            const { title, content, excerpt, author, tags, isPublished, productLinks } = data;

            if (!title || !title.trim()) {
                return NextResponse.json(
                    { status: 400, message: 'Blog title is required', data: {} },
                    { status: 400 }
                );
            }

            if (!content || !content.trim()) {
                return NextResponse.json(
                    { status: 400, message: 'Blog content is required', data: {} },
                    { status: 400 }
                );
            }

            const blog = new Blog({
                title: title.trim(),
                content: content.trim(),
                excerpt: excerpt?.trim() || null,
                images: imagesPaths,
                productLinks: Array.isArray(productLinks) ? productLinks : [],
                author: author?.trim() || null,
                publishedDate: isPublished ? new Date() : null,
                tags: Array.isArray(tags) ? tags : [],
                isPublished: isPublished === true || isPublished === 'true',
            });

            await blog.save();
            return NextResponse.json(
                { status: 201, message: 'Blog created', data: blog },
                { status: 201 }
            );
        }

        if (action === 'edit') {
            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Blog id is required for edit', data: {} },
                    { status: 400 }
                );
            }

            const blog = await findBlogByIdSafe(id);
            if (!blog) {
                return NextResponse.json(
                    { status: 404, message: 'Blog not found', data: {} },
                    { status: 404 }
                );
            }

            const { title, content, excerpt, author, tags, isPublished, productLinks } = data;

            if (title !== undefined) blog.title = title.trim();
            if (content !== undefined) blog.content = content.trim();
            if (excerpt !== undefined) blog.excerpt = excerpt?.trim() || null;
            if (author !== undefined) blog.author = author?.trim() || null;
            if (Array.isArray(tags)) blog.tags = tags;
            if (Array.isArray(productLinks)) blog.productLinks = productLinks;

            if (isPublished !== undefined) {
                const wasPublished = blog.isPublished;
                blog.isPublished = isPublished === true || isPublished === 'true';
                // Set publishedDate when first published
                if (!wasPublished && blog.isPublished && !blog.publishedDate) {
                    blog.publishedDate = new Date();
                }
            }

            // Handle images
            if (imagesPaths.length) {
                const imagesMode = (data.imagesMode || 'append').toLowerCase();
                if (imagesMode === 'replace') {
                    blog.images = imagesPaths;
                } else {
                    blog.images = [...(blog.images || []), ...imagesPaths];
                }
            }

            // Remove specific images if requested
            if (Array.isArray(data.removeImages) && data.removeImages.length) {
                blog.images = blog.images.filter((img: string) => !data.removeImages.includes(img));
            }

            await blog.save();
            return NextResponse.json(
                { status: 200, message: 'Blog updated', data: blog },
                { status: 200 }
            );
        }

        if (action === 'delete') {
            if (!id) {
                return NextResponse.json(
                    { status: 400, message: 'Blog id is required for delete', data: {} },
                    { status: 400 }
                );
            }

            const blog = await findBlogByIdSafe(id);
            if (!blog) {
                return NextResponse.json(
                    { status: 404, message: 'Blog not found', data: {} },
                    { status: 404 }
                );
            }

            blog.isDeleted = true;
            await blog.save();

            return NextResponse.json(
                { status: 200, message: 'Blog deleted', data: {} },
                { status: 200 }
            );
        }

        return NextResponse.json(
            { status: 400, message: 'Invalid action', data: {} },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('POST /api/blogs error', error);
        return NextResponse.json(
            { status: 500, message: error.message || 'Failed to process blog request', data: {} },
            { status: 500 }
        );
    }
}
