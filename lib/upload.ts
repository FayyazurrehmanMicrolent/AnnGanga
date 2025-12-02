import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function saveUpload(
  file: Blob | undefined | null,
  folder = 'categories',
  desiredName?: string
) {
  if (!file) return null;

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', folder);
  await fs.promises.mkdir(uploadsDir, { recursive: true });

  // Detect extension from original filename if available
  // @ts-ignore - some runtimes provide `name` on File
  const originalName = (file as any).name || '';
  const extMatch = originalName.match(/(\.[a-zA-Z0-9]+)$/);
  let ext = extMatch ? extMatch[1] : '';

  // If extension not present, try to derive from file.type (MIME)
  if (!ext) {
    // @ts-ignore - some runtimes provide `type` on File
    const mtype = (file as any).type || '';
    const mimeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'image/bmp': '.bmp',
    };
    if (mtype && mimeMap[mtype]) {
      ext = mimeMap[mtype];
    } else if (mtype && mtype.startsWith('image/')) {
      const subtype = mtype.split('/')[1];
      // handle svg+xml -> svg
      const clean = subtype.replace('+xml', '');
      ext = `.${clean}`;
    } else {
      // default to jpeg if unknown
      ext = '.jpg';
    }
  }

  // If caller provided a desiredName, slugify it; otherwise use original name
  let baseName = '';
  if (desiredName && String(desiredName).trim()) {
    baseName = String(desiredName)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  } else {
    const safeName = originalName ? originalName.replace(/[^a-zA-Z0-9.\-_]/g, '-') : `${Date.now()}`;
    baseName = safeName;
  }

  // Ensure uniqueness by appending uuid
  const filename = `${baseName}-${uuidv4()}${ext}`;
  const filepath = path.join(uploadsDir, filename);

  // Convert Blob/File to buffer
  const arrayBuffer = await (file as any).arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await fs.promises.writeFile(filepath, buffer);

  // return public path
  return `/uploads/${folder}/${filename}`;
}
