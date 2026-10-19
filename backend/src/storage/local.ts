import { promises as fs } from 'fs';
import path from 'path';
import type { ImageStorage } from './driver';

/**
 * Local filesystem storage driver.
 *
 * Files are written under `rootDir` keyed by a path supplied by the caller
 * (e.g. `images/<userId>/<imageId>.<ext>`). The public URL is left null so
 * images are streamed through the API's `GET /api/images/:id` endpoint.
 */
export class LocalStorage implements ImageStorage {
  constructor(private readonly rootDir: string) {}

  private resolve(key: string): string {
    // Guard against path traversal: ensure the resolved path stays inside rootDir.
    const full = path.resolve(this.rootDir, key);
    if (!full.startsWith(path.resolve(this.rootDir) + path.sep) && full !== path.resolve(this.rootDir)) {
      throw new Error('Invalid storage key');
    }
    return full;
  }

  async save(key: string, data: Buffer, _contentType: string): Promise<string | null> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    return null;
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch (err: any) {
      if (err?.code !== 'ENOENT') throw err;
    }
  }
}
