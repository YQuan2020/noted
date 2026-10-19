/**
 * Image storage abstraction.
 *
 * The application talks to this interface only, so swapping the local
 * filesystem driver for an object-storage driver (OSS / S3-compatible) is a
 * matter of implementing the same three methods and setting STORAGE_DRIVER.
 */
export interface ImageStorage {
  /** Persist bytes under `key` and return a public URL (or null if served via API). */
  save(key: string, data: Buffer, contentType: string): Promise<string | null>;

  /** Read raw bytes back for a key. */
  read(key: string): Promise<Buffer>;

  /** Delete a key. Should be a no-op if the key does not exist. */
  remove(key: string): Promise<void>;
}
