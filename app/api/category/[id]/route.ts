import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Category from '@/models/category';
import { saveUpload } from '@/lib/upload';
import { validateCategoryName, escapeRegExp } from '@/lib/validation';
import fs from 'fs';
import path from 'path';
import { authenticateUser } from '@/lib/middleware';
import { verifyToken } from '@/lib/auth';
import User from '@/models/users';
import Role from '@/models/roles';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[parts.length - 1];

    const category = await Category.findOne({ categoryId: id, isDeleted: false }).lean();
    if (!category) return NextResponse.json({ status: 404, message: 'Category not found', data: {} }, { status: 404 });

    return NextResponse.json({ status: 200, message: 'Category fetched', data: category }, { status: 200 });
  } catch (err: any) {
    console.error('GET /api/category/[id] error', err);
    return NextResponse.json({ status: 500, message: err.message || 'Server error', data: {} }, { status: 500 });
  }
}

// Accept POST to /api/category/:id for updates (or action via body)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const pathId = parts[parts.length - 1];

    let action = 'edit';
    let name: string | null = null;
    let id: string | null = pathId || null;
    let imagePath: string | null = null;

    const contentType = req.headers.get('content-type') || '';
    // allow override via query ?action=delete|edit
    try {
      const urlObj = new URL(req.url);
      const qaction = urlObj.searchParams.get('action');
      if (qaction) action = String(qaction).toLowerCase();
    } catch (e) {
      // ignore
    }
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      action = (body.action || action).toLowerCase();
      name = body.name || null;
      id = body.id || body.categoryId || id;
      imagePath = body.image || null;
    } else if (contentType.includes('multipart/form-data') || contentType.includes('form-data')) {
      const form = await req.formData();
      // support `data` JSON field like {"name":"..."}
      const dataField = form.get('data');
      let parsedData: any = null;
      if (dataField) {
        try {
          parsedData = JSON.parse(String(dataField));
        } catch (e) {
          parsedData = null;
        }
      }
      const a = form.get('action') || (parsedData && parsedData.action);
      action = a ? String(a).toLowerCase() : action;
      const n = form.get('name') || (parsedData && parsedData.name);
      name = n ? String(n) : null;
      const i = form.get('id') || (parsedData && (parsedData.id || parsedData.categoryId));
      id = i ? String(i) : id;
      const file = form.get('image') as Blob | null;
      if (file && (file as any).size) {
        const desired = parsedData && parsedData.name ? String(parsedData.name) : name || undefined;
        imagePath = await saveUpload(file, 'categories', desired);
      }
    } else {
      const body = await req.json().catch(() => ({}));
      action = (body.action || action).toLowerCase();
      name = body.name || null;
      id = body.id || body.categoryId || id;
      imagePath = body.image || null;
    }

    // Protect edit/delete (and common synonyms) actions: only admin role can perform these.
    if (['edit', 'delete', 'update', 'remove', 'destroy'].includes(action)) {
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

    if (action === 'edit') {
      if (!id) return NextResponse.json({ status: 400, message: 'Category id is required', data: {} }, { status: 400 });

      const category = await Category.findOne({ categoryId: id, isDeleted: false });
      if (!category) return NextResponse.json({ status: 404, message: 'Category not found', data: {} }, { status: 404 });
      // require both name and image for edit
      if (!name) return NextResponse.json({ status: 400, message: 'Category name is required for edit', data: {} }, { status: 400 });
      if (!imagePath) return NextResponse.json({ status: 400, message: 'Category image is required for edit', data: {} }, { status: 400 });

      const validation = validateCategoryName(name);
      if (!validation.isValid) return NextResponse.json({ status: 400, message: validation.message, data: {} }, { status: 400 });
      const normalized = validation.name as string;
      const dup = await Category.findOne({ name: { $regex: `^${escapeRegExp(normalized)}$`, $options: 'i' }, isDeleted: false, categoryId: { $ne: category.categoryId } });
      if (dup) return NextResponse.json({ status: 409, message: 'Another category with this name already exists', data: {} }, { status: 409 });

      category.name = normalized;
      category.image = imagePath;
      await category.save();
      return NextResponse.json({ status: 200, message: 'Category updated', data: category }, { status: 200 });
    }

    if (action === 'delete') {
      if (!id) return NextResponse.json({ status: 400, message: 'Category id is required', data: {} }, { status: 400 });

      console.debug('DELETE /api/category/[id] - received id:', id);
      let category = await Category.findOne({ categoryId: id });
      if (!category) {
        try {
          category = await Category.findOne({ _id: id });
        } catch (err) {
          console.debug('DELETE /api/category/[id] - fallback _id lookup failed', String(err));
        }
      }
      if (!category) return NextResponse.json({ status: 404, message: 'Category not found', data: {} }, { status: 404 });

      // remove image file from disk if present
      try {
        if (category.image) {
          const rel = String(category.image).replace(/^\//, '');
          const filePath = path.join(process.cwd(), 'public', rel);
          await fs.promises.unlink(filePath).catch(() => null);
        }
      } catch (e) {
        console.debug('DELETE /api/category/[id] - failed to remove image file', String(e));
      }

      try {
        await Category.deleteOne({ _id: category._id });
      } catch (e) {
        console.error('DELETE /api/category/[id] - DB delete failed', String(e));
        return NextResponse.json({ status: 500, message: 'Failed to delete category', data: {} }, { status: 500 });
      }

      return NextResponse.json({ status: 200, message: 'Category deleted', data: {} }, { status: 200 });
    }

    return NextResponse.json({ status: 400, message: 'Unknown action', data: {} }, { status: 400 });
  } catch (err: any) {
    console.error('POST /api/category/[id] error', err);
    return NextResponse.json({ status: 500, message: err.message || 'Server error', data: {} }, { status: 500 });
  }
}
