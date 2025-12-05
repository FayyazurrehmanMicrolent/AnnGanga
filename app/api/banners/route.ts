import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Banner from '@/models/banner';
import { saveUpload } from '@/lib/upload';
import fs from 'fs';
import path from 'path';
import { verifyToken } from '@/lib/auth';
import User from '@/models/users';
import Role from '@/models/roles';

async function findBannerByIdSafe(id: string) {
  if (!id) return null;
  try {
    let b = await Banner.findOne({ bannerId: id, isDeleted: false });
    if (b) return b;
  } catch (e) {
    // ignore
  }
  try {
    return await Banner.findOne({ _id: id, isDeleted: false });
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    let url: URL;
    try {
      url = new URL(req.url);
    } catch (e) {
      const host = req.headers.get('host') || 'localhost:3000';
      url = new URL(req.url, `http://${host}`);
    }
    const id = url.searchParams.get('id') || url.searchParams.get('bannerId');
    const activeOnly = url.searchParams.get('active') || null;

    if (id) {
      const b = await findBannerByIdSafe(id);
      if (!b) return NextResponse.json({ status: 404, message: 'Banner not found', data: {} }, { status: 404 });
      return NextResponse.json({ status: 200, message: 'Banner fetched', data: b }, { status: 200 });
    }

    const filter: any = { isDeleted: false };
    if (activeOnly !== null) filter.isActive = activeOnly === '1' || activeOnly === 'true' || activeOnly === 'yes';

    const banners = await Banner.find(filter).sort({ priority: -1, createdAt: -1 }).lean();
    return NextResponse.json({ status: 200, message: 'Banners fetched', data: banners }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/banner error', error);
    return NextResponse.json({ status: 500, message: error.message || 'Failed to fetch banners', data: {} }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    let action = 'create';
    let parsedData: any = null;
    let imagesPaths: string[] = [];
    let id: string | null = null;

    // allow overriding via query params (useful for wrapper routes like /api/banner/:id)
    try {
      let urlObj: URL;
      try {
        urlObj = new URL(req.url);
      } catch (err) {
        const host = req.headers.get('host') || 'localhost:3000';
        urlObj = new URL(req.url, `http://${host}`);
      }
      const qAction = urlObj.searchParams.get('action');
      const qId = urlObj.searchParams.get('id') || urlObj.searchParams.get('bannerId');
      if (qAction) action = String(qAction).toLowerCase();
      if (qId && !id) id = String(qId);
      // If caller targeted a specific id but didn't provide an explicit action,
      // treat the request as an edit (POST to /api/banner/:id should update by default)
      if (!qAction && qId && action === 'create') {
        action = 'edit';
      }
    } catch (e) {
      // ignore
    }

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      action = (body.action || action).toLowerCase();
      parsedData = body.data || body;
      id = body.id || body.bannerId || id;
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
      if (!parsedData) parsedData = {};
      // Merge direct form fields into parsedData so clients can send fields outside `data`
      try {
        const directKeys = ['title', 'textColor', 'textAlignment', 'position', 'bannerType', 'type', 'isActive', 'priority', 'startDate', 'endDate'];
        for (const k of directKeys) {
          const v = form.get(k);
          if (v !== null && v !== undefined && typeof v !== 'undefined') {
            const s = String(v);
            if ((k === 'priority') && s.trim()) {
              parsedData[k] = Number(s);
            } else if ((k === 'isActive')) {
              // accept boolean or truthy string
              if (s === 'true' || s === '1' || s.toLowerCase() === 'yes') parsedData[k] = true;
              else if (s === 'false' || s === '0' || s.toLowerCase() === 'no') parsedData[k] = false;
              else parsedData[k] = Boolean(s);
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
      const i = form.get('id') || (parsedData && (parsedData.id || parsedData.bannerId));
      id = i ? String(i) : id;

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
            const saved = await saveUpload(f as Blob, 'banners', desired);
            if (saved) imagesPaths.push(saved);
          }
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      action = (body.action || action).toLowerCase();
      parsedData = body.data || body;
      id = body.id || body.bannerId || id;
      if (Array.isArray(body.images)) imagesPaths = body.images;
      try {
        const form = await req.formData();
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
              const saved = await saveUpload(f as Blob, 'banners', desired);
              if (saved) imagesPaths.push(saved);
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }

    const data = parsedData || {};
    console.log('📦 Parsed data:', JSON.stringify(data, null, 2));
    console.log('📦 Data title:', data.title);

    function sanitizeForFilename(raw: any, maxLen = 50) {
      if (raw === null || typeof raw === 'undefined') return undefined;
      let s = String(raw).trim();
      if (!s) return undefined;
      s = s.replace(/[^a-z0-9._-]+/gi, '-');
      s = s.replace(/-+/g, '-');
      s = s.replace(/^[.-]+|[.-]+$/g, '');
      if (s.length > maxLen) s = s.slice(0, maxLen);
      return s || undefined;
    }

    function parseDate(raw: any): Date | null | undefined {
      if (raw === null) return null;
      if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? undefined : raw;
      if (typeof raw === 'number') {
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? undefined : d;
      }
      if (typeof raw === 'string') {
        const s = raw.trim();
        if (s === '') return null;
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

    // Authorization: require admin for mutating actions (create / edit / delete)
    try {
      let token: string | null = null;
      try {
        const c = (req as any).cookies?.get?.('token') || (req as any).cookies?.get?.('token')?.value;
        token = c && c.value ? String(c.value) : (c ? String(c) : null);
      } catch (e) {
        token = null;
      }
      if (!token) {
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.substring(7);
      }

      if (['create', 'edit', 'delete'].includes(action)) {
        if (!token) return NextResponse.json({ status: 401, message: 'Authentication token required', data: {} }, { status: 401 });
        const decoded: any = verifyToken(token);
        if (!decoded || !decoded.userId) return NextResponse.json({ status: 401, message: 'Invalid or expired token', data: {} }, { status: 401 });

        const authUser = await User.findOne({ _id: decoded.userId, isDeleted: false });
        if (!authUser) return NextResponse.json({ status: 401, message: 'User not found', data: {} }, { status: 401 });
        if (!authUser.isActive) return NextResponse.json({ status: 403, message: 'Account inactive', data: {} }, { status: 403 });

        let roleInfo = null;
        try {
          if (authUser.roleId) roleInfo = await Role.findOne({ roleId: authUser.roleId }).lean();
        } catch (e) {
          roleInfo = null;
        }
        const roleName = roleInfo && (roleInfo as any).role ? String((roleInfo as any).role).toLowerCase() : null;
        if (roleName !== 'admin') return NextResponse.json({ status: 403, message: 'Admin role required', data: {} }, { status: 403 });
      }
    } catch (e) {
      return NextResponse.json({ status: 500, message: 'Authorization check failed', data: {} }, { status: 500 });
    }

    if (action === 'create') {
      // required validation: title must be present and non-empty
      const titleRaw = data.title ?? data.name ?? null;
      const title = titleRaw !== null && typeof titleRaw !== 'undefined' ? String(titleRaw).trim() : '';
      if (!title) {
        return NextResponse.json({
          status: 400,
          message: 'Validation failed',
          data: { errors: { title: 'Banner title is required and cannot be empty' } }
        }, { status: 400 });
      }
      if (title.length > 100) {
        return NextResponse.json({
          status: 400,
          message: 'Validation failed',
          data: { errors: { title: 'Banner title must be at most 100 characters' } }
        }, { status: 400 });
      }

      const startDate = parseDate(data.startDate ?? data.start_at ?? null);
      const endDate = parseDate(data.endDate ?? data.end_at ?? null);

      const banner = new Banner({
        title: String(title).trim(),
        textColor: data.textColor ?? '#000000',
        textAlignment: data.textAlignment ?? 'center',
        position: data.position ?? 'top-left',
        bannerType: data.bannerType ?? data.type ?? 'generic',
        isActive: typeof data.isActive === 'boolean' ? data.isActive : (data.isActive ? true : true),
        priority: typeof data.priority !== 'undefined' ? Number(data.priority) : (data.priority ?? 0),
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        image: imagesPaths.length > 0 ? imagesPaths[0] : undefined,
      });

      try {
        await banner.save();
        return NextResponse.json({ status: 201, message: 'Banner created', data: banner }, { status: 201 });
      } catch (e: any) {
        // handle mongoose validation errors with clear message
        if (e && e.name === 'ValidationError' && e.errors) {
          const errors: Record<string, string> = {};
          for (const k of Object.keys(e.errors)) {
            try { errors[k] = e.errors[k].message || String(e.errors[k]); } catch (_) { errors[k] = 'Invalid value'; }
          }
          return NextResponse.json({ status: 400, message: 'Validation failed', data: { errors } }, { status: 400 });
        }
        throw e;
      }
    }

    if (action === 'edit') {
      if (!id) return NextResponse.json({ status: 400, message: 'Banner id is required for edit', data: {} }, { status: 400 });
      const banner = await findBannerByIdSafe(id);
      if (!banner) return NextResponse.json({ status: 404, message: 'Banner not found', data: {} }, { status: 404 });

      // update provided fields
      if (Object.prototype.hasOwnProperty.call(data, 'title')) {
        const t = data.title === null || typeof data.title === 'undefined' ? '' : String(data.title).trim();
        if (!t) {
          return NextResponse.json({ status: 400, message: 'Validation failed', data: { errors: { title: 'Banner title cannot be empty' } } }, { status: 400 });
        }
        if (t.length > 100) {
          return NextResponse.json({ status: 400, message: 'Validation failed', data: { errors: { title: 'Banner title must be at most 100 characters' } } }, { status: 400 });
        }
        banner.title = t;
      }
      // Only overwrite fields when a meaningful value is provided. This preserves existing values
      // if the client does not include the field (or sends an empty string unintentionally).
      if (Object.prototype.hasOwnProperty.call(data, 'textColor')) {
        if (data.textColor !== null && typeof data.textColor !== 'undefined' && String(data.textColor).trim() !== '') {
          banner.textColor = String(data.textColor).trim();
        }
      }
      if (Object.prototype.hasOwnProperty.call(data, 'textAlignment')) {
        if (data.textAlignment !== null && typeof data.textAlignment !== 'undefined' && String(data.textAlignment).trim() !== '') {
          banner.textAlignment = String(data.textAlignment).trim();
        }
      }
      if (Object.prototype.hasOwnProperty.call(data, 'position')) {
        if (data.position !== null && typeof data.position !== 'undefined' && String(data.position).trim() !== '') {
          banner.position = String(data.position).trim();
        }
      }
      if (Object.prototype.hasOwnProperty.call(data, 'bannerType') || Object.prototype.hasOwnProperty.call(data, 'type')) {
        const bt = data.bannerType ?? data.type;
        if (bt !== null && typeof bt !== 'undefined' && String(bt).trim() !== '') {
          banner.bannerType = String(bt).trim();
        }
      }
      if (Object.prototype.hasOwnProperty.call(data, 'isActive')) {
        if (typeof data.isActive === 'boolean') {
          banner.isActive = data.isActive;
        } else {
          const s = String(data.isActive).toLowerCase();
          if (s === 'true' || s === '1' || s === 'yes') banner.isActive = true;
          else if (s === 'false' || s === '0' || s === 'no') banner.isActive = false;
        }
      }
      if (Object.prototype.hasOwnProperty.call(data, 'priority')) {
        if (data.priority !== null && typeof data.priority !== 'undefined' && String(data.priority).trim() !== '') {
          const p = Number(data.priority);
          if (!Number.isNaN(p)) banner.priority = p;
        }
      }
      if (Object.prototype.hasOwnProperty.call(data, 'startDate')) {
        // only update when a non-empty value provided; allow explicit null to clear
        if (data.startDate === null) banner.startDate = null;
        else if (typeof data.startDate !== 'undefined' && String(data.startDate).trim() !== '') {
          const sd = parseDate(data.startDate ?? data.start_at ?? null);
          if (sd !== undefined) banner.startDate = sd ?? null;
        }
      }
      if (Object.prototype.hasOwnProperty.call(data, 'endDate')) {
        if (data.endDate === null) banner.endDate = null;
        else if (typeof data.endDate !== 'undefined' && String(data.endDate).trim() !== '') {
          const ed = parseDate(data.endDate ?? data.end_at ?? null);
          if (ed !== undefined) banner.endDate = ed ?? null;
        }
      }

      // Images handling: support imagesMode: 'append' | 'replace' and removeImages array
      const imagesMode = (data.imagesMode || data.imagesAction || '').toString().toLowerCase() || 'append';
      if (Array.isArray(data.removeImages) && data.removeImages.length) {
        const toRemove: string[] = data.removeImages.map((x: any) => String(x));
        const keep: string[] = [];
        for (const img of banner.images || []) {
          if (toRemove.includes(img)) {
            try {
              if (img && String(img).startsWith('/uploads/banners/')) {
                const rel = String(img).replace(/^\//, '');
                const filePath = path.join(process.cwd(), 'public', rel);
                await fs.promises.unlink(filePath).catch(() => null);
              }
            } catch (e) {
              console.debug('Failed to remove banner image', String(e));
            }
          } else {
            keep.push(img);
          }
        }
        banner.images = keep;
      }

      if (imagesPaths.length) {
        if (imagesMode === 'replace' || data.forceReplaceImages) {
          try {
            for (const img of banner.images || []) {
              if (img && String(img).startsWith('/uploads/banners/')) {
                const rel = String(img).replace(/^\//, '');
                const filePath = path.join(process.cwd(), 'public', rel);
                await fs.promises.unlink(filePath).catch(() => null);
              }
            }
          } catch (e) {
            console.debug('Failed to remove old banner images', String(e));
          }
          banner.images = imagesPaths;
        } else {
          banner.images = Array.from(new Set([...(banner.images || []), ...imagesPaths]));
        }
      }

      await banner.save();
      return NextResponse.json({ status: 200, message: 'Banner updated', data: banner }, { status: 200 });
    }

    if (action === 'delete') {
      if (!id) return NextResponse.json({ status: 400, message: 'Banner id is required for delete', data: {} }, { status: 400 });
      const banner = await findBannerByIdSafe(id);
      if (!banner) return NextResponse.json({ status: 404, message: 'Banner not found', data: {} }, { status: 404 });

      try {
        for (const img of banner.images || []) {
          if (img && String(img).startsWith('/uploads/banners/')) {
            const rel = String(img).replace(/^\//, '');
            const filePath = path.join(process.cwd(), 'public', rel);
            await fs.promises.unlink(filePath).catch(() => null);
          }
        }
      } catch (e) {
        console.debug('DELETE /api/banner - failed to remove images', String(e));
      }

      await Banner.deleteOne({ _id: banner._id });
      return NextResponse.json({ status: 200, message: 'Banner deleted', data: {} }, { status: 200 });
    }

    return NextResponse.json({ status: 400, message: 'Unknown action', data: {} }, { status: 400 });
  } catch (error: any) {
    console.error('POST /api/banner error', error);
    return NextResponse.json({ status: 500, message: error.message || 'Failed to process banner action', data: {} }, { status: 500 });
  }
}
