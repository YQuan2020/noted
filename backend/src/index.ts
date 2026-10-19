import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { config } from './config';
import { cardsRouter } from './routes/cards';
import { decksRouter } from './routes/decks';
import { imagesRouter } from './routes/images';
import { relationsRouter } from './routes/relations';
import { usersRouter } from './routes/users';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/users', usersRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/decks', decksRouter);
app.use('/api/images', imagesRouter);
app.use('/api/relations', relationsRouter);

// Central error handler (multer/file errors, OSS stub errors, etc.).
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err?.status ?? (err?.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (res.headersSent) return;
  res.status(status).json({ error: err?.message ?? 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`[noted] backend listening on :${config.port} (storage: ${config.storageDriver})`);
});
