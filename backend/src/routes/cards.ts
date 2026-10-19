import { Router } from 'express';
import { prisma } from '../db';
import { requireUser } from '../middleware/auth';
import { schedule, type Grade } from '../scheduler';
import { getStorage } from '../storage';

export const cardsRouter = Router();
cardsRouter.use(requireUser);

const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];

const WORD_PARTS = ['root', 'prefix', 'suffix'] as const;
type WordPart = (typeof WORD_PARTS)[number];

/** Normalize a `wordPart` value; returns null (unmarked) or throws 400. */
function toWordPart(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v);
  if (!(WORD_PARTS as readonly string[]).includes(s)) {
    const err: any = new Error('wordPart must be one of: root, prefix, suffix');
    err.status = 400;
    throw err;
  }
  return s;
}

const ROOT_ORIGINS = ['latin', 'greek', 'germanic', 'oldEnglish'] as const;

/** Normalize a `rootOrigin` value; returns null (unset) or throws 400. */
function toRootOrigin(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v);
  if (!(ROOT_ORIGINS as readonly string[]).includes(s)) {
    const err: any = new Error('rootOrigin must be one of: latin, greek, germanic, oldEnglish');
    err.status = 400;
    throw err;
  }
  return s;
}

/** Translate a `?deckId=` value into a Prisma `where` fragment. */
function deckWhere(deckId: unknown): Record<string, unknown> {
  if (deckId === undefined || deckId === '' || deckId === 'all') return {};
  if (deckId === 'none' || deckId === 'null') return { deckId: null };
  return { deckId: String(deckId) };
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

interface CardWithImage {
  id: string;
  front: string;
  back: string;
  mermaid: string | null;
  wordPart: string | null;
  rootOrigin: string | null;
  imageId: string | null;
  deckId: string | null;
  due: Date | null;
  intervalDays: number;
  ease: number;
  reps: number;
  createdAt: Date;
  updatedAt: Date;
  image: { id: string; url: string | null } | null;
}

function toDto(card: CardWithImage) {
  const { image, ...rest } = card;
  const imageUrl = image ? image.url ?? `/api/images/${image.id}` : null;
  return { ...rest, imageUrl };
}

/** GET /api/cards — list the user's cards (optional `?q=` search, `?limit=`). */
cardsRouter.get('/', async (req, res) => {
  const userId = res.locals.user.id;
  const q = (req.query.q as string | undefined)?.trim();
  const limit = Math.min(Number(req.query.limit) || 200, 500);

  const where: any = { userId, ...deckWhere(req.query.deckId) };
  if (q) {
    where.OR = [
      { front: { contains: q } },
      { back: { contains: q } },
      { mermaid: { contains: q } },
    ];
  }

  const cards = await prisma.card.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { image: true },
  });
  res.json({ cards: cards.map(toDto) });
});

/** GET /api/cards/review — cards due now (new cards first). */
cardsRouter.get('/review', async (req, res) => {
  const userId = res.locals.user.id;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const now = new Date();

  const deckFilter = deckWhere(req.query.deckId);

  const cards = await prisma.card.findMany({
    where: { userId, ...deckFilter, OR: [{ due: null }, { due: { lte: now } }] },
    orderBy: [{ due: 'asc' }, { createdAt: 'asc' }],
    take: limit,
    include: { image: true },
  });

  const totalDue = await prisma.card.count({
    where: { userId, ...deckFilter, OR: [{ due: null }, { due: { lte: now } }] },
  });

  res.json({ cards: cards.map(toDto), total: totalDue });
});

/** GET /api/cards/:id — a single card with its relations. */
cardsRouter.get('/:id', async (req, res) => {
  const userId = res.locals.user.id;
  const card = await prisma.card.findFirst({
    where: { id: req.params.id, userId },
    include: { image: true },
  });
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }
  res.json({ card: toDto(card) });
});

/** POST /api/cards — create a card. */
cardsRouter.post('/', async (req, res) => {
  const userId = res.locals.user.id;
  const { front, back, mermaid, imageId, deckId, wordPart, rootOrigin } = req.body ?? {};

  if (!front?.toString().trim() || !back?.toString().trim()) {
    res.status(400).json({ error: 'front and back are required' });
    return;
  }

  if (imageId) {
    const img = await prisma.image.findFirst({ where: { id: imageId, userId } });
    if (!img) {
      res.status(400).json({ error: 'image not found' });
      return;
    }
  }

  let nextDeckId: string | null;
  let nextWordPart: string | null;
  let nextRootOrigin: string | null;
  try {
    nextDeckId = await resolveDeckId(userId, deckId);
    nextWordPart = toWordPart(wordPart);
    nextRootOrigin = toRootOrigin(rootOrigin);
  } catch (err: any) {
    res.status(err.status ?? 400).json({ error: err.message });
    return;
  }

  const card = await prisma.card.create({
    data: {
      userId,
      front: front.toString(),
      back: back.toString(),
      mermaid: mermaid?.toString() || null,
      wordPart: nextWordPart,
      rootOrigin: nextRootOrigin,
      imageId: imageId || null,
      deckId: nextDeckId,
      due: null,
    },
    include: { image: true },
  });
  res.status(201).json({ card: toDto(card) });
});

/**
 * POST /api/cards/import — bulk-create cards.
 * Body: `{ "cards": [{ "front", "back", "mermaid"? }] }`.
 * The frontend normalizes both JSON and CSV files into this shape.
 */
cardsRouter.post('/import', async (req, res) => {
  const userId = res.locals.user.id;
  const { cards: raw, deckId } = req.body ?? {};

  if (!Array.isArray(raw)) {
    res.status(400).json({ error: 'body must contain a "cards" array' });
    return;
  }
  if (raw.length === 0) {
    res.status(400).json({ error: 'no cards to import' });
    return;
  }
  if (raw.length > 1000) {
    res.status(400).json({ error: 'too many cards (max 1000 per import)' });
    return;
  }

  let nextDeckId: string | null;
  try {
    nextDeckId = await resolveDeckId(userId, deckId);
  } catch (err: any) {
    res.status(err.status ?? 400).json({ error: err.message });
    return;
  }

  const data: Array<{
    userId: string;
    front: string;
    back: string;
    mermaid: string | null;
    deckId: string | null;
    due: null;
  }> = [];
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] ?? {};
    const front = (item.front ?? '').toString().trim();
    const back = (item.back ?? '').toString().trim();
    const mermaid = item.mermaid ? item.mermaid.toString().trim() || null : null;

    if (!front || !back) {
      errors.push({ index: i, error: 'front and back are required' });
      continue;
    }

    data.push({ userId, front, back, mermaid, deckId: nextDeckId, due: null });
  }

  const imported = data.length
    ? await prisma.card.createMany({ data })
    : { count: 0 };

  res.status(201).json({
    imported: imported.count,
    skipped: errors.length,
    errors: errors.slice(0, 50),
  });
});

/** PUT /api/cards/:id — update a card. */
cardsRouter.put('/:id', async (req, res) => {
  const userId = res.locals.user.id;
  const id = req.params.id;
  const { front, back, mermaid, imageId, deckId, wordPart, rootOrigin } = req.body ?? {};

  const existing = await prisma.card.findFirst({ where: { id, userId } });
  if (!existing) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  let nextImageId: string | null | undefined;
  if (imageId === null) {
    nextImageId = null;
  } else if (imageId) {
    const img = await prisma.image.findFirst({ where: { id: imageId, userId } });
    if (!img) {
      res.status(400).json({ error: 'image not found' });
      return;
    }
    nextImageId = imageId;
  }

  const data: any = {};
  if (front !== undefined) data.front = front.toString();
  if (back !== undefined) data.back = back.toString();
  if (mermaid !== undefined) data.mermaid = mermaid?.toString() || null;
  if (wordPart !== undefined) {
    try {
      data.wordPart = toWordPart(wordPart);
    } catch (err: any) {
      res.status(err.status ?? 400).json({ error: err.message });
      return;
    }
  }
  if (rootOrigin !== undefined) {
    try {
      data.rootOrigin = toRootOrigin(rootOrigin);
    } catch (err: any) {
      res.status(err.status ?? 400).json({ error: err.message });
      return;
    }
  }
  if (nextImageId !== undefined) data.imageId = nextImageId;
  if (deckId !== undefined) {
    try {
      data.deckId = await resolveDeckId(userId, deckId);
    } catch (err: any) {
      res.status(err.status ?? 400).json({ error: err.message });
      return;
    }
  }

  const card = await prisma.card.update({
    where: { id },
    data,
    include: { image: true },
  });
  res.json({ card: toDto(card) });
});

/** POST /api/cards/:id/review — grade a card and advance its schedule. */
cardsRouter.post('/:id/review', async (req, res) => {
  const userId = res.locals.user.id;
  const grade = req.body?.grade as Grade;
  if (!GRADES.includes(grade)) {
    res.status(400).json({ error: 'grade must be one of: again, hard, good, easy' });
    return;
  }

  const card = await prisma.card.findFirst({ where: { id: req.params.id, userId } });
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const next = schedule(
    { intervalDays: card.intervalDays, ease: card.ease, reps: card.reps },
    grade,
  );

  const updated = await prisma.card.update({
    where: { id: card.id },
    data: {
      intervalDays: next.intervalDays,
      ease: next.ease,
      reps: next.reps,
      due: next.due,
    },
    include: { image: true },
  });
  res.json({ card: toDto(updated) });
});

/** DELETE /api/cards/:id — delete a card and its attached image. */
cardsRouter.delete('/:id', async (req, res) => {
  const userId = res.locals.user.id;
  const card = await prisma.card.findFirst({
    where: { id: req.params.id, userId },
    include: { image: true },
  });
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  await prisma.card.delete({ where: { id: card.id } });

  // Remove the attached image only once no other card still references it.
  if (card.image) {
    const refs = await prisma.card.count({ where: { imageId: card.image.id } });
    if (refs === 0) {
      await getStorage().remove(card.image.storageKey).catch(() => undefined);
      await prisma.image.delete({ where: { id: card.image.id } }).catch(() => undefined);
    }
  }

  res.status(204).end();
});
