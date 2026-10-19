import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db';

/**
 * Reads the user id from the `X-User-Id` header and attaches the user to the
 * request. Rejects when missing or unknown. (Passwordless, per requirements.)
 */
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const id = (req.header('X-User-Id') ?? '').trim();
  if (!id) {
    res.status(401).json({ error: 'Missing X-User-Id header' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(401).json({ error: 'Unknown user' });
    return;
  }
  res.locals.user = user;
  next();
}
