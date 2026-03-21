import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../db/connection';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ordner erstellen falls nötig
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilder erlaubt (JPG, PNG, WebP, HEIC)'));
    }
  },
});

// POST /api/images/upload/:orderId
router.post('/upload/:orderId', upload.array('images', 10), async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params.orderId;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'Keine Bilder hochgeladen' });
      return;
    }

    const images = [];
    for (const file of files) {
      const result = await execute(
        'INSERT INTO brenn_order_images (order_id, file_path, file_name) VALUES (?, ?, ?)',
        [orderId, file.filename, file.originalname]
      );
      images.push({
        id: result.insertId,
        order_id: parseInt(orderId),
        file_path: file.filename,
        file_name: file.originalname,
      });
    }

    res.status(201).json(images);
  } catch (error) {
    console.error('Bild-Upload fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// GET /api/images/:filename
router.get('/:filename', (req, res: Response) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Bild nicht gefunden' });
    return;
  }
  res.sendFile(path.resolve(filePath));
});

// DELETE /api/images/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const images = await query<{ file_path: string }[]>(
      'SELECT file_path FROM brenn_order_images WHERE id = ?',
      [req.params.id]
    );

    if (images.length === 0) {
      res.status(404).json({ error: 'Bild nicht gefunden' });
      return;
    }

    const filePath = path.join(UPLOAD_DIR, images[0].file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await execute('DELETE FROM brenn_order_images WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Bild löschen fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

export default router;
