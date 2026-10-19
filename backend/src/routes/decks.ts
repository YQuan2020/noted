import { Router } from 'express';
import { prisma } from '../db';
import { requireUser } from '../middleware/auth';

export const decksRouter = Router();
decksRouter.use(requireUser);

/** GET /api/decks — the user's decks with card/due counts, plus unfiled & totals. */
decksRouter.get('/', async (_req, res) => {
  const userId = res.locals.user.id;
  const now = new Date();

  const decks = await prisma.deck.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { cards: true } } },
  });

  const dueCounts = await prisma.card.groupBy({
    by: ['deckId'],
    where: { userId, OR: [{ due: null }, { due: { lte: now } }] },
    _count: { _all: true },
  });
  const dueMap = new Map<string | null, number>(
    dueCounts.map((d) => [d.deckId, d._count._all]),
  );

  const [totalCount, totalDueCount, unfiledCount] = await Promise.all([
    prisma.card.count({ where: { userId } }),
    prisma.card.count({ where: { userId, OR: [{ due: null }, { due: { lte: now } }] } }),
    prisma.card.count({ where: { userId, deckId: null } }),
  ]);

  res.json({
    decks: decks.map((d) => ({
      id: d.id,
      name: d.name,
      cardCount: d._count.cards,
      dueCount: dueMap.get(d.id) ?? 0,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
    stats: {
      total: { cardCount: totalCount, dueCount: totalDueCount },
      unfiled: { cardCount: unfiledCount, dueCount: dueMap.get(null) ?? 0 },
    },
  });
});

/** POST /api/decks — create a deck. */
decksRouter.post('/', async (req, res) => {
  const userId = res.locals.user.id;
  const name = (req.body?.name ?? '').toString().trim();
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (name.length > 100) {
    res.status(400).json({ error: 'name must be 100 characters or fewer' });
    return;
  }
  const deck = await prisma.deck.create({ data: { userId, name } });
  res.status(201).json({ deck });
});

/** PUT /api/decks/:id — rename a deck. */
decksRouter.put('/:id', async (req, res) => {
  const userId = res.locals.user.id;
  const name = (req.body?.name ?? '').toString().trim();
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  const existing = await prisma.deck.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) {
    res.status(404).json({ error: 'Deck not found' });
    return;
  }
  const deck = await prisma.deck.update({
    where: { id: existing.id },
    data: { name },
  });
  res.json({ deck });
});

/** DELETE /api/decks/:id — delete a deck (its cards become unfiled). */
decksRouter.delete('/:id', async (req, res) => {
  const userId = res.locals.user.id;
  const deck = await prisma.deck.findFirst({ where: { id: req.params.id, userId } });
  if (!deck) {
    res.status(404).json({ error: 'Deck not found' });
    return;
  }
  await prisma.deck.delete({ where: { id: deck.id } });
  res.status(204).end();
});
