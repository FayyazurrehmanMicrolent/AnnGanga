import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Category from '@/models/category';
import { saveUpload } from '@/lib/upload';
import { validateCategoryName, escapeRegExp } from '@/lib/validation';
import { authenticateUser } from '@/lib/middleware';
import { verifyToken } from '@/lib/auth';
import User from '@/models/users';
import Role from '@/models/roles';
import fs from 'fs';
import path from 'path';
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const categories = await Category.find({ isDeleted: false }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ status: 200, message: 'Categories fetched', data: categories }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/category error', error);
    return NextResponse.json({ status: 500, message: error.message || 'Failed to fetch categories', data: {} }, { status: 500 });
  }
}

// Single POST handler: create / edit / delete via `action` field to support servers that
// don't accept PUT/DELETE. action: create | edit | delete
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    let action = 'create';
    let name: string | null = null;
    let id: string | null = null;
    let imagePath: string | null = null;

    // Parse based on Content-Type: prefer JSON when content-type is application/json,
    // otherwise try form-data (for file uploads) and fallback to JSON.
    const contentType = req.headers.get('content-type') || '';
    console.debug('POST /api/category - incoming Content-Type:', contentType);
    // allow override via query ?action=delete|edit|create
    try {
      const url = new URL(req.url);
      const qaction = url.searchParams.get('action');
      if (qaction) action = String(qaction).toLowerCase();
    } catch (e) {
      // ignore
    }
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      action = (body.action || 'create').toLowerCase();
      name = body.name || null;
      id = body.id || body.categoryId || null;
      imagePath = body.image || null;
    } else if (contentType.includes('multipart/form-data') || contentType.includes('form-data')) {
      const form = await req.formData();
      // Debug: log form keys and file info to help trace missing file issues
      try {
        for (const [k, v] of form.entries() as any) {
          try {
            const info = v && typeof (v as any).size !== 'undefined' ? `${(v as any).name || 'file'} (${(v as any).size})` : String(v);
            console.debug('POST /api/category - form field:', k, info);
          } catch (e) {
            console.debug('POST /api/category - form field:', k, String(v));
          }
        }
      } catch (e) {
        console.debug('POST /api/category - error enumerating form entries', String(e));
      }
      // Support `data` JSON field (clients may send `data` containing JSON like {"name":"x"})
      let parsedData: any = null;
      const dataField = form.get('data');
      if (dataField) {
        try {
          parsedData = typeof dataField === 'string' ? JSON.parse(String(dataField)) : JSON.parse(String(dataField));
        } catch (e) {
          try {
            // if it's a FormData text value it might already be the string
            parsedData = JSON.parse(String(dataField));
          } catch (err) {
            parsedData = null;
          }
        }
      }

      const a = form.get('action') || (parsedData && parsedData.action);
      action = a ? String(a).toLowerCase() : 'create';
      const n = form.get('name') || (parsedData && parsedData.name);
      name = n ? String(n) : null;
      const i = form.get('id') || (parsedData && parsedData.id) || (parsedData && parsedData.categoryId);
      id = i ? String(i) : null;
      const file = form.get('image') as Blob | null;
      if (file && (file as any).size) {
        // If parsedData contains a name, pass it to saveUpload so filename includes the category name
        const desired = parsedData && parsedData.name ? String(parsedData.name) : name || undefined;
        imagePath = await saveUpload(file, 'categories', desired);
      }
    } else {
      // Unknown content type: try JSON first, then formData
      const body = await req.json().catch(() => ({}));
      action = (body.action || 'create').toLowerCase();
      name = body.name || null;
      id = body.id || body.categoryId || null;
      imagePath = body.image || null;
      if (!name) {
        try {
          const form = await req.formData();
          // Debug: enumerate fallback form data as well
          try {
            for (const [k, v] of form.entries() as any) {
              const info = v && typeof (v as any).size !== 'undefined' ? `${(v as any).name || 'file'} (${(v as any).size})` : String(v);
              console.debug('POST /api/category - fallback form field:', k, info);
            }
          } catch (e) {
            console.debug('POST /api/category - fallback form iteration error', String(e));
          }
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
          name = n ? String(n) : name;
          const i = form.get('id') || (parsedData && parsedData.id) || (parsedData && parsedData.categoryId);
          id = i ? String(i) : id;
          const file = form.get('image') as Blob | null;
          if (file && (file as any).size) {
            const desired = parsedData && parsedData.name ? String(parsedData.name) : name || undefined;
            imagePath = await saveUpload(file, 'categories', desired);
          }
        } catch (err) {
          // ignore
        }
      }
    }

    // Debug log when name is missing to help diagnose client payload issues
    if (!name) {
      console.debug('POST /api/category - parsed payload had no name', { contentType, action, id, imagePath });
    }

    // Protect create/edit/delete (and common synonyms) actions: only admin role can perform these.
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

    if (action === 'create') {
      if (!name) {
        return NextResponse.json({ status: 400, message: 'Category name is required', data: {} }, { status: 400 });
      }
      if (!imagePath) {
        return NextResponse.json({ status: 400, message: 'Category image is required', data: {} }, { status: 400 });
      }

      const validation = validateCategoryName(name);
      if (!validation.isValid) {
        return NextResponse.json({ status: 400, message: validation.message, data: {} }, { status: 400 });
      }

      const normalized = validation.name as string;

      // case-insensitive exact match check
      const existing = await Category.findOne({ name: { $regex: `^${escapeRegExp(normalized)}$`, $options: 'i' }, isDeleted: false });
      if (existing) {
        return NextResponse.json({ status: 409, message: 'Category with this name already exists', data: {} }, { status: 409 });
      }

      const category = new Category({ name: normalized, image: imagePath });
      await category.save();
      return NextResponse.json({ status: 201, message: 'Category created', data: category }, { status: 201 });
    }

    if (action === 'edit') {
      if (!id) {
        return NextResponse.json({ status: 400, message: 'Category id is required for edit', data: {} }, { status: 400 });
      }

      const category = await Category.findOne({ categoryId: id, isDeleted: false });
      if (!category) {
        return NextResponse.json({ status: 404, message: 'Category not found', data: {} }, { status: 404 });
      }

      // Require both name and image for edit (as requested)
      if (!name) {
        return NextResponse.json({ status: 400, message: 'Category name is required for edit', data: {} }, { status: 400 });
      }
      if (!imagePath) {
        return NextResponse.json({ status: 400, message: 'Category image is required for edit', data: {} }, { status: 400 });
      }

      const validation = validateCategoryName(name);
      if (!validation.isValid) {
        return NextResponse.json({ status: 400, message: validation.message, data: {} }, { status: 400 });
      }

      const normalized = validation.name as string;
      // check duplicates excluding current id
      const dup = await Category.findOne({
        name: { $regex: `^${escapeRegExp(normalized)}$`, $options: 'i' },
        isDeleted: false,
        categoryId: { $ne: category.categoryId },
      });
      if (dup) {
        return NextResponse.json({ status: 409, message: 'Another category with this name already exists', data: {} }, { status: 409 });
      }

      category.name = normalized;
      category.image = imagePath;
      await category.save();

      return NextResponse.json({ status: 200, message: 'Category updated', data: category }, { status: 200 });
    }

    if (action === 'delete') {
      if (!id) {
        return NextResponse.json({ status: 400, message: 'Category id is required for delete', data: {} }, { status: 400 });
      }

      console.debug('DELETE /api/category - received id:', id);
      // Try to find by categoryId first, then fallback to _id (ObjectId) for clients sending DB _id
      let category = await Category.findOne({ categoryId: id });
      if (!category) {
        try {
          category = await Category.findOne({ _id: id });
        } catch (err) {
          // invalid ObjectId or other error - ignore and treat as not found
          console.debug('DELETE /api/category - fallback _id lookup failed', String(err));
        }
      }
      if (!category) {
        return NextResponse.json({ status: 404, message: 'Category not found', data: {} }, { status: 404 });
      }

      // remove image file from disk if present
      try {
        if (category.image) {
          const rel = String(category.image).replace(/^\//, '');
          const filePath = path.join(process.cwd(), 'public', rel);
          await fs.promises.unlink(filePath).catch(() => null);
        }
      } catch (e) {
        console.debug('DELETE /api/category - failed to remove image file', String(e));
      }

      // perform hard delete from DB
      try {
        await Category.deleteOne({ _id: category._id });
      } catch (e) {
        console.error('DELETE /api/category - DB delete failed', String(e));
        return NextResponse.json({ status: 500, message: 'Failed to delete category', data: {} }, { status: 500 });
      }

      return NextResponse.json({ status: 200, message: 'Category deleted', data: {} }, { status: 200 });
    }

    return NextResponse.json({ status: 400, message: 'Unknown action', data: {} }, { status: 400 });
  } catch (error: any) {
    console.error('POST /api/category error', error);
    return NextResponse.json({ status: 500, message: error.message || 'Failed to process category action', data: {} }, { status: 500 });
  }
}

