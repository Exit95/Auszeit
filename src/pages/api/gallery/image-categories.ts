import type { APIRoute } from 'astro';
import { setImageCategories, addImageToCategory, removeImageFromCategory, getImageMetadata } from '../../../lib/storage';

// Authentifizierung
function checkAuth(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  const adminPassword = import.meta.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  if (!authHeader) return false;

  const [type, credentials] = authHeader.split(' ');
  if (type !== 'Basic') return false;

  const decoded = Buffer.from(credentials, 'base64').toString();
  const [username, password] = decoded.split(':');

  return username === 'admin' && password === adminPassword;
}

// GET - Alle Bild-Metadaten abrufen
export const GET: APIRoute = async ({ request }) => {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const metadata = await getImageMetadata();
    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting image metadata:', error);
    return new Response(JSON.stringify({ error: 'Failed to get image metadata' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Kategorien für ein Bild setzen (überschreibt bestehende)
export const POST: APIRoute = async ({ request }) => {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { filename, categoryIds } = body;

    if (!filename || !Array.isArray(categoryIds)) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const metadata = await setImageCategories(filename, categoryIds);
    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error setting image categories:', error);
    return new Response(JSON.stringify({ error: 'Failed to set image categories' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Kategorie zu einem Bild hinzufügen
export const PUT: APIRoute = async ({ request }) => {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { filename, categoryId } = body;

    if (!filename || !categoryId) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const metadata = await addImageToCategory(filename, categoryId);
    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error adding image to category:', error);
    return new Response(JSON.stringify({ error: 'Failed to add image to category' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Kategorie von einem Bild entfernen
export const DELETE: APIRoute = async ({ request }) => {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const filename = url.searchParams.get('filename');
    const categoryId = url.searchParams.get('categoryId');

    if (!filename || !categoryId) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const metadata = await removeImageFromCategory(filename, categoryId);
    
    if (!metadata) {
      return new Response(JSON.stringify({ error: 'Image metadata not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error removing image from category:', error);
    return new Response(JSON.stringify({ error: 'Failed to remove image from category' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

