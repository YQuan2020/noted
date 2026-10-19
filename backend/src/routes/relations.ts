import { Router } from 'express';
import { prisma } from '../db';
import { requireUser } from '../middleware/auth';

export const relationsRouter = Router();
relationsRouter.use(requireUser);

const include = {
  sourceCard: { include: { image: true } },
  targetCard: { include: { image: true } },
  relationCard: { include: { image: true } },
};

function toDto(r: any) {
  return {
    id: r.id,
    label: r.label,
    createdAt: r.createdAt,
    sourceCard: r.sourceCard && {
      id: r.sourceCard.id,
      front: r.sourceCard.front,
      imageUrl: r.sourceCard.image
        ? r.sourceCard.image.url ?? `/api/images/${r.sourceCard.image.id}`
        : null,
    },
    targetCard: r.targetCard && {
      id: r.targetCard.id,
      front: r.targetCard.front,
      imageUrl: r.targetCard.image
        ? r.targetCard.image.url ?? `/api/images/${r.targetCard.image.id}`
        : null,
    },
    relationCard: r.relationCard && {
      id: r.relationCard.id,
      front: r.relationCard.front,
      back: r.relationCard.back,
      imageUrl: r.relationCard.image
        ? r.relationCard.image.url ?? `/api/images/${r.relationCard.image.id}`
        : null,
    },
  };
}

/**
 * GET /api/relations?cardId=<id> — relations for the user, optionally scoped
 * to those touching a specific card.
 */
relationsRouter.get('/', async (req, res) => {
  const userId = res.locals.user.id;
  const cardId = req.query.cardId as string | undefined;

  const where: any = { userId };
  if (cardId) {
    where.OR = [{ sourceCardId: cardId }, { targetCardId: cardId }, { relationCardId: cardId }];
  }

  const relations = await prisma.cardRelation.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include,
  });
  res.json({ relations: relations.map(toDto) });
});

/**
 * POST /api/relations — link two cards. `relationCardId` (optional) points at
 * a normal card that describes the relationship itself.
 */
relationsRouter.post('/', async (req, res) => {
  const userId = res.locals.user.id;
  const { sourceCardId, targetCardId, relationCardId, label } = req.body ?? {};

  if (!sourceCardId || !targetCardId) {
    res.status(400).json({ error: 'sourceCardId and targetCardId are required' });
    return;
  }
  if (sourceCardId === targetCardId) {
    res.status(400).json({ error: 'sourceCardId and targetCardId must differ' });
    return;
  }

  const ids = [sourceCardId, targetCardId, relationCardId].filter(Boolean);
  const owned = await prisma.card.count({ where: { id: { in: ids }, userId } });
  if (owned !== new Set(ids).size) {
    res.status(400).json({ error: 'one or more cards do not exist' });
    return;
  }

  const relation = await prisma.cardRelation.create({
    data: {
      userId,
      sourceCardId,
      targetCardId,
      relationCardId: relationCardId || null,
      label: label?.toString() || null,
    },
    include,
  });
  res.status(201).json({ relation: toDto(relation) });
});

/**
 * POST /api/relations/import — bulk-create relations.
 * Body: `{ "relations": [{ "source", "target", "label"?, "relation"? }] }`.
 * `source`, `target`, and `relation` reference cards by their exact `front`
 * text (the most recently created card wins if fronts collide).
 */
relationsRouter.post('/import', async (req, res) => {
  const userId = res.locals.user.id;
  const { relations: raw } = req.body ?? {};

  if (!Array.isArray(raw)) {
    res.status(400).json({ error: 'body must contain a "relations" array' });
    return;
  }
  if (raw.length === 0) {
    res.status(400).json({ error: 'no relations to import' });
    return;
  }
  if (raw.length > 1000) {
    res.status(400).json({ error: 'too many relations (max 1000 per import)' });
    return;
  }

  const cards = await prisma.card.findMany({
    where: { userId },
    select: { id: true, front: true },
    orderBy: { createdAt: 'desc' },
  });
  const byFront = new Map<string, string>();
  for (const c of cards) if (!byFront.has(c.front)) byFront.set(c.front, c.id);

  let imported = 0;
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] ?? {};
    const source = (item.source ?? '').toString().trim();
    const target = (item.target ?? '').toString().trim();
    const relation = item.relation ? item.relation.toString().trim() : '';
    const label = item.label ? item.label.toString().trim() : null;

    if (!source || !target) {
      errors.push({ index: i, error: 'source and target are required' });
      continue;
    }
    const sourceCardId = byFront.get(source);
    if (!sourceCardId) {
      errors.push({ index: i, error: `source card not found: "${source}"` });
      continue;
    }
    const targetCardId = byFront.get(target);
    if (!targetCardId) {
      errors.push({ index: i, error: `target card not found: "${target}"` });
      continue;
    }
    if (sourceCardId === targetCardId) {
      errors.push({ index: i, error: 'source and target must differ' });
      continue;
    }

    let relationCardId: string | null = null;
    if (relation) {
      relationCardId = byFront.get(relation) ?? null;
      if (!relationCardId) {
        errors.push({ index: i, error: `relation card not found: "${relation}"` });
        continue;
      }
    }

    await prisma.cardRelation.create({
      data: { userId, sourceCardId, targetCardId, relationCardId, label },
    });
    imported++;
  }

  res.status(201).json({ imported, skipped: errors.length, errors: errors.slice(0,50) });
});

/** DELETE /api/relations/:id */
relationsRouter.delete('/:id', async (req, res) => {
  const userId = res.locals.user.id;
  const relation = await prisma.cardRelation.findFirst({
    where: { id: req.params.id, userId },
  });
  if (!relation) {
    res.status(404).json({ error: 'Relation not found' });
    return;
  }
  await prisma.cardRelation.delete({ where: { id: relation.id } });
  res.status(204).end();
});
