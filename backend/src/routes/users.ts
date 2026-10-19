import { Router } from 'express';
import { prisma } from '../db';
import { requireUser } from '../middleware/auth';

export const usersRouter = Router();

/**
 * POST /api/users
 * Create a user for a unique username, or return the existing user.
 * No password is involved (per requirements).
 */
usersRouter.post('/', async (req, res) => {
  const username = (req.body?.username ?? '').toString().trim();
  if (!username) {
    res.status(400).json({ error: 'username is required' });
    return;
  }
  if (username.length > 100) {
    res.status(400).json({ error: 'username must be 100 characters or fewer' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    res.status(200).json({ user: existing, created: false });
    return;
  }

  const user = await prisma.user.create({ data: { username } });
  res.status(201).json({ user, created: true });
});

/** GET /api/users/me — returns the current user for the given X-User-Id. */
usersRouter.get('/me', requireUser, async (_req, res) => {
  res.json({ user: res.locals.user });
});
