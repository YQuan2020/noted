import { randomUUID } from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../db';
import { requireUser } from '../middleware/auth';
import { getStorage } from '../storage';

export const imagesRouter = Router();
imagesRouter.use(requireUser);

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
]);

const EXT_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

/**
 * POST /api/images — upload an image (multipart field "file").
 * Returns the image record; attach its id to a card via `imageId`.
 */
imagesRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'file is required' });
    return;
  }

  const userId = res.locals.user.id;
  const id = randomUUID();
  const ext = EXT_BY_MIME[req.file.mimetype] ?? (path.extname(req.file.originalname) || '.bin');
  const key = `images/${userId}/${id}${ext}`;

  const url = await getStorage().save(key, req.file.buffer, req.file.mimetype);

  const image = await prisma.image.create({
    data: {
      id,
      userId,
      storageKey: key,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url,
    },
  });

  res.status(201).json({
    image: { ...image, url: url ?? `/api/images/${image.id}` },
  });
});

/**
 * GET /api/images/:id — stream the image (local driver) or redirect (OSS).
 */
imagesRouter.get('/:id', async (req, res) => {
  const userId = res.locals.user.id;
  const image = await prisma.image.findFirst({ where: { id: req.params.id, userId } });
  if (!image) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }

  if (image.url) {
    res.redirect(302, image.url);
    return;
  }

  const data = await getStorage().read(image.storageKey);
  res.setHeader('Content-Type', image.mimeType);
  res.setHeader('Content-Length', String(data.length));
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(data);
});

/** DELETE /api/images/:id — remove an image and its stored bytes. */
imagesRouter.delete('/:id', async (req, res) => {
  const userId = res.locals.user.id;
  const image = await prisma.image.findFirst({ where: { id: req.params.id, userId } });
  if (!image) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }

  await getStorage().remove(image.storageKey).catch(() => undefined);
  await prisma.image.delete({ where: { id: image.id } });
  res.status(204).end();
});
