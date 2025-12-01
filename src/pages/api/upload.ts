import type { APIRoute } from 'astro';
import busboy from 'busboy';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');
const CHUNK_SIZE = 128 * 1024; // 128 KB
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

// Sicherstellen, dass Upload-Verzeichnisse existieren
function ensureUploadDirs() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

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

export const POST: APIRoute = async ({ request }) => {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  ensureUploadDirs();

  return new Promise((resolve) => {
    const contentType = request.headers.get('content-type') || '';
    
    const bb = busboy({ 
      headers: { 
        'content-type': contentType 
      },
      limits: {
        fileSize: MAX_FILE_SIZE
      }
    });

    let chunkIndex: number | null = null;
    let totalChunks: number | null = null;
    let filename: string | null = null;
    let fileProcessed = false;

    bb.on('field', (fieldname, val) => {
      if (fieldname === 'chunkIndex') {
        chunkIndex = parseInt(val, 10);
      } else if (fieldname === 'totalChunks') {
        totalChunks = parseInt(val, 10);
      } else if (fieldname === 'filename') {
        filename = val;
      }
    });

    bb.on('file', (fieldname, file, info) => {
      if (fieldname !== 'file') {
        file.resume();
        return;
      }

      if (!filename || chunkIndex === null || totalChunks === null) {
        file.resume();
        resolve(new Response(JSON.stringify({ error: 'Missing chunk metadata' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }));
        return;
      }

      const tempFilePath = path.join(TEMP_DIR, filename);
      const finalFilePath = path.join(UPLOAD_DIR, filename);

      try {
        // Chunk an temporäre Datei anhängen (append mode)
        const writeStream = fs.createWriteStream(tempFilePath, { flags: 'a' });

        file.pipe(writeStream);

        writeStream.on('finish', () => {
          fileProcessed = true;

          // Wenn letzter Chunk, verschiebe Datei in finalen Upload-Ordner
          if (chunkIndex === totalChunks - 1) {
            fs.renameSync(tempFilePath, finalFilePath);
            
            resolve(new Response(JSON.stringify({ 
              success: true, 
              message: 'Upload complete',
              filename: filename,
              isLastChunk: true
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }));
          } else {
            resolve(new Response(JSON.stringify({ 
              success: true, 
              message: 'Chunk received',
              chunkIndex: chunkIndex,
              isLastChunk: false
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }));
          }
        });

        writeStream.on('error', (err) => {
          console.error('Write stream error:', err);
          resolve(new Response(JSON.stringify({ error: 'Upload failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }));
        });

        file.on('error', (err) => {
          console.error('File stream error:', err);
          writeStream.destroy();
          resolve(new Response(JSON.stringify({ error: 'Upload failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }));
        });

      } catch (error) {
        console.error('Upload error:', error);
        resolve(new Response(JSON.stringify({ error: 'Upload failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
    });

    bb.on('error', (err) => {
      console.error('Busboy error:', err);
      resolve(new Response(JSON.stringify({ error: 'Upload failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }));
    });

    bb.on('finish', () => {
      if (!fileProcessed) {
        resolve(new Response(JSON.stringify({ error: 'No file received' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
    });

    // Pipe request body to busboy
    request.body?.pipeTo(new WritableStream({
      write(chunk) {
        bb.write(chunk);
      },
      close() {
        bb.end();
      }
    }));
  });
};

