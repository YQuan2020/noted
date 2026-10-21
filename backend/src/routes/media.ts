import { randomUUID } from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { load, type Cheerio } from 'cheerio';
import TurndownService from 'turndown';
import { prisma } from '../db';
import { requireUser } from '../middleware/auth';
import { getStorage } from '../storage';

export const mediaRouter = Router();
mediaRouter.use(requireUser);

const MEDIA_TYPES = ['video', 'audio', 'article'] as const;

function toMediaType(v: unknown): string {
  const s = String(v ?? '').trim();
  if (!(MEDIA_TYPES as readonly string[]).includes(s)) {
    const err: any = new Error('type must be one of: video, audio, article');
    err.status = 400;
    throw err;
  }
  return s;
}

/** Validate a deck id from a request body; returns the id or null (unfiled). */
async function resolveDeckId(userId: string, deckId: unknown): Promise<string | null> {
  if (deckId === undefined || deckId === null || deckId === '' || deckId === 'none') return null;
  const deck = await prisma.deck.findFirst({ where: { id: String(deckId), userId } });
  if (!deck) {
    const err: any = new Error('Deck not found');
    err.status = 400;
    throw err;
  }
  return deck.id;
}

/** Translate a `?deckId=` value into a Prisma `where` fragment. */
function deckWhere(deckId: unknown): Record<string, unknown> {
  if (deckId === undefined || deckId === '' || deckId === 'all') return {};
  if (deckId === 'none' || deckId === 'null') return { deckId: null };
  return { deckId: String(deckId) };
}

interface MediaWithRefs {
  id: string;
  type: string;
  title: string;
  url: string | null;
  notes: string | null;
  content: string | null;
  fileId: string | null;
  deckId: string | null;
  createdAt: Date;
  updatedAt: Date;
  file: { id: string; url: string | null; mimeType: string } | null;
  deck: { name: string } | null;
}

function toDto(m: MediaWithRefs) {
  const { file, deck, ...rest } = m;
  return {
    ...rest,
    fileUrl: file ? file.url ?? `/api/images/${file.id}` : null,
    fileMimeType: file?.mimeType ?? null,
    deckName: deck?.name ?? null,
  };
}

const MEDIA_EXT: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-matroska': '.mkv',
  'video/ogg': '.ogv',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/aac': '.aac',
  'audio/flac': '.flac',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (MEDIA_EXT[file.mimetype]) cb(null, true);
    else cb(new Error('Only video or audio files are allowed'));
  },
});

/**
 * POST /api/media/upload — upload a video/audio file (multipart field "file").
 * Files land in the shared `Image` table (generic file store) and are served
 * via `/api/images/:id`; attach the returned id to a media item via `fileId`.
 */
mediaRouter.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'file is required' });
    return;
  }

  const userId = res.locals.user.id;
  const id = randomUUID();
  const ext = MEDIA_EXT[req.file.mimetype] ?? (path.extname(req.file.originalname) || '.bin');
  const key = `media/${userId}/${id}${ext}`;

  const url = await getStorage().save(key, req.file.buffer, req.file.mimetype);

  const file = await prisma.image.create({
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

  res.status(201).json({ file: { ...file, url: url ?? `/api/images/${file.id}` } });
});

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
});

/** Block obvious internal/private hosts to avoid server-side request forgery. */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true;
  if (h === '::1' || h === '::' || h.startsWith('fe80:')) return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return true;
    }
  }
  return false;
}

/** Pull the main content out of an HTML page and render it as Markdown. */
function extractArticle(html: string): { title: string; markdown: string } | null {
  const $ = load(html);
  const title = (
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text() ||
    $('h1').first().text() ||
    ''
  ).trim();

  let root: Cheerio<any> = $('body');
  for (const sel of ['article', 'main', '[role="main"]']) {
    const el = $(sel).first();
    if (el.length) {
      root = el;
      break;
    }
  }

  const $content = root.clone();
  $content
    .find(
      'script, style, noscript, iframe, nav, header, footer, aside, form, button, select, textarea, ' +
        '[aria-hidden="true"], .ad, .advert, .advertisement, [class*="advert"], [class*="sidebar"], ' +
        '[class*="comment"], [class*="social"], [class*="share"], [class*="nav"], [class*="menu"]',
    )
    .remove();

  const markdown = turndown.turndown($content.html() ?? '').trim();
  if (markdown.length < 40) return null;
  return { title, markdown };
}

/**
 * POST /api/media/fetch — fetch an article URL server-side, extract the main
 * content, and return it as Markdown (for the frontend to prefill a media item).
 */
mediaRouter.post('/fetch', async (req, res) => {
  const raw = (req.body?.url ?? '').toString().trim();
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    res.status(400).json({ error: 'url is invalid' });
    return;
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    res.status(400).json({ error: 'only http/https urls are allowed' });
    return;
  }
  if (isBlockedHost(target.hostname)) {
    res.status(400).json({ error: 'this host is not allowed' });
    return;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Noted/1.0)' },
    });
    clearTimeout(timer);

    if (!resp.ok) {
      res.status(502).json({ error: `Failed to fetch article (HTTP ${resp.status})` });
      return;
    }
    const contentType = resp.headers.get('content-type') ?? '';
    if (contentType && !contentType.includes('html')) {
      res.status(422).json({ error: 'The URL does not point to an HTML page' });
      return;
    }

    const article = extractArticle(await resp.text());
    if (!article) {
      res.status(422).json({ error: 'Could not extract article content from that page' });
      return;
    }
    res.json(article);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      res.status(504).json({ error: 'Timed out fetching the article' });
      return;
    }
    res.status(502).json({ error: 'Failed to fetch the article' });
  }
});

/** GET /api/media — list media items (optional `?type=`, `?deckId=`). */
mediaRouter.get('/', async (req, res) => {
  const userId = res.locals.user.id;
  const type = (req.query.type as string | undefined)?.trim();
  if (type && !(MEDIA_TYPES as readonly string[]).includes(type)) {
    res.status(400).json({ error: 'type must be one of: video, audio, article' });
    return;
  }

  const where: any = { userId, ...deckWhere(req.query.deckId) };
  if (type) where.type = type;

  const media = await prisma.media.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { file: true, deck: true },
  });
  res.json({ media: media.map(toDto) });
});

/** POST /api/media — create a media item. */
mediaRouter.post('/', async (req, res) => {
  const userId = res.locals.user.id;
  const { type, title, url, notes, content, fileId, deckId } = req.body ?? {};

  let nextType: string;
  let nextDeckId: string | null;
  try {
    nextType = toMediaType(type);
    nextDeckId = await resolveDeckId(userId, deckId);
  } catch (err: any) {
    res.status(err.status ?? 400).json({ error: err.message });
    return;
  }

  const trimmedTitle = (title ?? '').toString().trim();
  if (!trimmedTitle) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  let nextFileId: string | null = null;
  if (fileId) {
    const file = await prisma.image.findFirst({ where: { id: fileId, userId } });
    if (!file) {
      res.status(400).json({ error: 'file not found' });
      return;
    }
    nextFileId = file.id;
  }

  const media = await prisma.media.create({
    data: {
      userId,
      type: nextType,
      title: trimmedTitle,
      url: url?.toString().trim() || null,
      notes: notes?.toString().trim() || null,
      content: content?.toString().trim() || null,
      fileId: nextFileId,
      deckId: nextDeckId,
    },
    include: { file: true, deck: true },
  });
  res.status(201).json({ media: toDto(media) });
});

/** PUT /api/media/:id — update a media item. */
mediaRouter.put('/:id', async (req, res) => {
  const userId = res.locals.user.id;
  const existing = await prisma.media.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) {
    res.status(404).json({ error: 'Media not found' });
    return;
  }

  const { type, title, url, notes, content, fileId, deckId } = req.body ?? {};
  const data: any = {};

  if (type !== undefined) {
    try {
      data.type = toMediaType(type);
    } catch (err: any) {
      res.status(err.status ?? 400).json({ error: err.message });
      return;
    }
  }
  if (title !== undefined) {
    const t = title.toString().trim();
    if (!t) {
      res.status(400).json({ error: 'title is required' });
      return;
    }
    data.title = t;
  }
  if (url !== undefined) data.url = url?.toString().trim() || null;
  if (notes !== undefined) data.notes = notes?.toString().trim() || null;
  if (content !== undefined) data.content = content?.toString().trim() || null;
  if (fileId !== undefined) {
    if (fileId === null) {
      data.fileId = null;
    } else {
      const file = await prisma.image.findFirst({ where: { id: fileId, userId } });
      if (!file) {
        res.status(400).json({ error: 'file not found' });
        return;
      }
      data.fileId = file.id;
    }
  }
  if (deckId !== undefined) {
    try {
      data.deckId = await resolveDeckId(userId, deckId);
    } catch (err: any) {
      res.status(err.status ?? 400).json({ error: err.message });
      return;
    }
  }

  const media = await prisma.media.update({
    where: { id: existing.id },
    data,
    include: { file: true, deck: true },
  });
  res.json({ media: toDto(media) });
});

/** DELETE /api/media/:id — delete a media item and its uploaded file if unreferenced. */
mediaRouter.delete('/:id', async (req, res) => {
  const userId = res.locals.user.id;
  const media = await prisma.media.findFirst({
    where: { id: req.params.id, userId },
    include: { file: true },
  });
  if (!media) {
    res.status(404).json({ error: 'Media not found' });
    return;
  }

  await prisma.media.delete({ where: { id: media.id } });

  // Remove the uploaded file only once no other media/card still references it.
  if (media.file) {
    const [mediaRefs, cardRefs] = await Promise.all([
      prisma.media.count({ where: { fileId: media.file.id } }),
      prisma.card.count({ where: { imageId: media.file.id } }),
    ]);
    if (mediaRefs === 0 && cardRefs === 0) {
      await getStorage().remove(media.file.storageKey).catch(() => undefined);
      await prisma.image.delete({ where: { id: media.file.id } }).catch(() => undefined);
    }
  }

  res.status(204).end();
});
