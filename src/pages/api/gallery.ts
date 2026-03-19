import type { APIRoute } from 'astro';
import { Readable } from 'stream';
import Busboy from 'busboy';
import { isS3Configured, listS3Objects, uploadToS3, deleteFromS3, getS3Key, getContentType } from '../../lib/s3-storage';
import { sanitizeFilename, isPathSafe } from '../../lib/sanitize';
import { validateCredentials } from '../../lib/totp';

const GALLERY_PREFIX = 'gallery';

// Auth check - akzeptiert Superuser und Admin
function checkAuth(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const [type, credentials] = authHeader.split(' ');
  if (type !== 'Basic') return false;
  const decoded = Buffer.from(credentials, 'base64').toString();
  const [username, password] = decoded.split(':');
  const validation = validateCredentials(username, password);
  return validation.valid;
}

// Kategorien und ihre Pfade im products-Ordner (passend zu Offerings.astro)
const PRODUCT_CATEGORIES = [
  { id: 'tassen', folder: 'tassen' },
  { id: 'teller', folder: 'teller' },
  { id: 'spardosen', folder: 'spardosen' },
  { id: 'anhaenger', folder: 'anhaenger' },
];

// GET - Liste aller Bilder (aus gallery/ UND products/)
export const GET: APIRoute = async () => {
  if (!isS3Configured()) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const allImages: Array<{
      filename: string;
      url: string;
      size: number;
      date: Date;
      source: 'gallery' | 'products';
      category?: string;
    }> = [];

    // 1. Bilder aus gallery/ laden
    try {
      const galleryKey = getS3Key(`${GALLERY_PREFIX}/`);
      const galleryObjects = await listS3Objects(galleryKey);

      for (const obj of galleryObjects) {
        if (obj.key && !obj.key.endsWith('/')) {
          const filename = obj.key.split('/').pop() || '';
          if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
            allImages.push({
              filename,
              url: obj.url,
              size: obj.size,
              date: obj.lastModified,
              source: 'gallery',
            });
          }
        }
      }
    } catch (error) {
      console.warn('Konnte Gallery-Bilder nicht laden:', error);
    }

    // 2. Bilder aus products/ laden (mit Kategorie-Mapping)
    for (const cat of PRODUCT_CATEGORIES) {
      try {
        const productKey = getS3Key(`products/${cat.folder}/`);
        const productObjects = await listS3Objects(productKey);

        for (const obj of productObjects) {
          if (obj.key && !obj.key.endsWith('/') && /\.(jpg|jpeg|png|gif|webp)$/i.test(obj.key)) {
            const filename = obj.key.split('/').pop() || '';
            allImages.push({
              filename: `products/${cat.id}/${filename}`,
              url: obj.url,
              size: obj.size,
              date: obj.lastModified,
              source: 'products',
              category: cat.id,
            });
          }
        }
      } catch (error) {
        console.warn(`Konnte Produkt-Bilder für ${cat.id} nicht laden:`, error);
      }
    }

    // Nach Datum sortieren
    allImages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return new Response(JSON.stringify(allImages), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error listing gallery:', error);
    return new Response(JSON.stringify({ error: 'Failed to list images' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Bild hochladen
export const POST: APIRoute = async ({ request }) => {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isS3Configured()) {
    return new Response(JSON.stringify({ error: 'S3 not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Promise((resolve) => {
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      resolve(new Response(JSON.stringify({ error: 'Invalid content type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }));
      return;
    }

    const busboy = Busboy({ headers: { 'content-type': contentType } });
    let fileBuffer: Buffer | null = null;
    let originalFilename = '';

    busboy.on('field', (name, val) => {
      if (name === 'filename') originalFilename = val;
    });

    busboy.on('file', (_, file) => {
      const chunks: Buffer[] = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });

    busboy.on('finish', async () => {
      if (!fileBuffer) {
        resolve(new Response(JSON.stringify({ error: 'No file uploaded' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        }));
        return;
      }

      try {
        // Sanitize filename and validate extension
        const safeOriginalName = sanitizeFilename(originalFilename);
        const ext = safeOriginalName.split('.').pop()?.toLowerCase() || 'jpg';

        // Only allow image extensions
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!allowedExtensions.includes(ext)) {
          resolve(new Response(JSON.stringify({ error: 'Invalid file type' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
          }));
          return;
        }

        const filename = `${Date.now()}.${ext}`;
        const key = getS3Key(`${GALLERY_PREFIX}/${filename}`);

        // Validate path safety
        if (!isPathSafe(key)) {
          resolve(new Response(JSON.stringify({ error: 'Invalid path' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
          }));
          return;
        }

        const mimeType = getContentType(filename);
        const url = await uploadToS3(fileBuffer, key, mimeType);

        resolve(new Response(JSON.stringify({ success: true, url, filename }), {
          headers: { 'Content-Type': 'application/json' },
        }));
      } catch (error) {
        console.error('Upload error:', error);
        resolve(new Response(JSON.stringify({ error: 'Upload failed' }), {
          status: 500, headers: { 'Content-Type': 'application/json' },
        }));
      }
    });

    const nodeStream = Readable.fromWeb(request.body as any);
    nodeStream.pipe(busboy);
  });
};

// DELETE - Bild löschen
export const DELETE: APIRoute = async ({ request }) => {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isS3Configured()) {
    return new Response(JSON.stringify({ error: 'S3 not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const rawFilename = url.searchParams.get('filename');

    if (!rawFilename) {
      return new Response(JSON.stringify({ error: 'Missing filename' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Sanitize filename to prevent path traversal
    const filename = sanitizeFilename(rawFilename);
    if (!filename || !isPathSafe(filename)) {
      return new Response(JSON.stringify({ error: 'Invalid filename' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = getS3Key(`${GALLERY_PREFIX}/${filename}`);
    await deleteFromS3(key);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete error:', error);
    return new Response(JSON.stringify({ error: 'Delete failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
