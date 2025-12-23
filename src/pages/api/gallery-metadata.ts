import type { APIRoute } from 'astro';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

// S3 Client (Lazy-loaded)
let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3Client) {
    // Unterstützt beide Varianten der Umgebungsvariablen
    const accessKey = process.env.S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || '';
    const secretKey = process.env.S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || '';

    _s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || 'https://nbg1.your-objectstorage.com',
      region: process.env.S3_REGION || 'eu-central',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
    });
  }
  return _s3Client;
}

const getBucket = () => process.env.S3_BUCKET || 'danapfel-digital';
const METADATA_KEY = 'Auszeit/data/gallery-metadata.json';

// Galerie-Kategorien
export const GALLERY_CATEGORIES = [
  { id: 'tassen', name: 'Tassen' },
  { id: 'teller', name: 'Teller' },
  { id: 'spardosen', name: 'Spardosen & Krüge & Boxen' },
  { id: 'anhaenger', name: 'Weihnachtsanhänger' },
];

interface GalleryMetadata {
  [filename: string]: {
    category: string | null;
    uploadedAt: string;
  };
}

// Auth check
function checkAuth(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  if (!authHeader) return false;
  const [type, credentials] = authHeader.split(' ');
  if (type !== 'Basic') return false;
  const decoded = Buffer.from(credentials, 'base64').toString();
  const [username, password] = decoded.split(':');
  return username === 'admin' && password === adminPassword;
}

// Metadata aus S3 lesen
async function getMetadata(): Promise<GalleryMetadata> {
  try {
    const response = await getS3Client().send(
      new GetObjectCommand({ Bucket: getBucket(), Key: METADATA_KEY })
    );
    const body = await response.Body?.transformToString();
    return body ? JSON.parse(body) : {};
  } catch {
    return {};
  }
}

// Metadata in S3 speichern
async function saveMetadata(metadata: GalleryMetadata): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: METADATA_KEY,
      Body: JSON.stringify(metadata, null, 2),
      ContentType: 'application/json',
    })
  );
}

// GET - Alle Metadaten + Kategorien
export const GET: APIRoute = async () => {
  try {
    const metadata = await getMetadata();
    return new Response(JSON.stringify({
      categories: GALLERY_CATEGORIES,
      metadata,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error getting metadata:', error);
    return new Response(JSON.stringify({ error: 'Failed to get metadata' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Kategorie für Bild setzen
export const POST: APIRoute = async ({ request }) => {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { filename, category } = body;

    if (!filename) {
      return new Response(JSON.stringify({ error: 'Missing filename' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const metadata = await getMetadata();
    
    if (category === null || category === '') {
      // Kategorie entfernen
      if (metadata[filename]) {
        metadata[filename].category = null;
      }
    } else {
      // Kategorie setzen
      metadata[filename] = {
        category,
        uploadedAt: metadata[filename]?.uploadedAt || new Date().toISOString(),
      };
    }

    await saveMetadata(metadata);

    return new Response(JSON.stringify({ success: true, metadata: metadata[filename] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating metadata:', error);
    return new Response(JSON.stringify({ error: 'Failed to update metadata' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

