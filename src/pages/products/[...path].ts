import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';
import { isS3Configured, getImageFromS3, getS3Key } from '../../lib/s3-storage';

// Für Docker: dist/client/products statt public/products
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const DIST_CLIENT_DIR = path.join(process.cwd(), 'dist', 'client');
const PRODUCTS_DIR = fs.existsSync(path.join(PUBLIC_DIR, 'products'))
  ? path.join(PUBLIC_DIR, 'products')
  : path.join(DIST_CLIENT_DIR, 'products');

const contentTypeMap: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

export const GET: APIRoute = async ({ params }) => {
  try {
    const filePath = params.path || '';

    // Sicherheitscheck: Verhindere Directory Traversal
    const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const ext = path.extname(safePath).toLowerCase();
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // S3-Modus
    if (isS3Configured()) {
      const s3Key = getS3Key(`products/${safePath}`);
      const imageBuffer = await getImageFromS3(s3Key);

      if (!imageBuffer) {
        // Fallback: Versuche lokale Datei (für statische Bilder die im Build waren)
        const localPath = path.join(PRODUCTS_DIR, safePath);
        if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
          const fileBuffer = fs.readFileSync(localPath);
          return new Response(fileBuffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=31536000'
            }
          });
        }
        return new Response('Not Found', { status: 404 });
      }

      return new Response(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    }

    // Lokaler Fallback
    const fullPath = path.join(PRODUCTS_DIR, safePath);

    // Prüfe ob Datei im Products-Verzeichnis liegt
    if (!fullPath.startsWith(PRODUCTS_DIR)) {
      return new Response('Forbidden', { status: 403 });
    }

    // Prüfe ob Datei existiert
    if (!fs.existsSync(fullPath)) {
      return new Response('Not Found', { status: 404 });
    }

    // Prüfe ob es eine Datei ist
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      return new Response('Not Found', { status: 404 });
    }

    // Lese Datei
    const fileBuffer = fs.readFileSync(fullPath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    console.error('Error serving product image:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

