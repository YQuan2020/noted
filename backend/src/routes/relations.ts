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
