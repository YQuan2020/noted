import type { ImageStorage } from './driver';

export interface OssOptions {
  region: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
  endpoint?: string;
  publicBaseUrl?: string;
}

/**
 * Object-storage (OSS / S3-compatible) driver stub.
 *
 * The interface is complete so the app already compiles against it. To enable
 * it, implement `save`/`read`/`remove` with your OSS SDK (e.g. `ali-oss` or
 * `@aws-sdk/client-s3`) and set STORAGE_DRIVER=oss plus the OSS_* env vars.
 *
 * `save` should return the object's public URL (or a base URL + key) so the
 * client can render the image directly without a round-trip through this API.
 */
export class OssStorage implements ImageStorage {
  private readonly configured: boolean;

  constructor(private readonly options: OssOptions) {
    this.configured = Boolean(
      options.accessKeyId && options.accessKeySecret && options.bucket,
    );
  }

  private ensureConfigured(): void {
    if (!this.configured) {
      throw new Error(
        'OSS storage is not configured. Set OSS_BUCKET, OSS_ACCESS_KEY_ID and OSS_ACCESS_KEY_SECRET.',
      );
    }
  }

  async save(_key: string, _data: Buffer, _contentType: string): Promise<string | null> {
    this.ensureConfigured();
    throw new Error('OSS driver is a stub — implement save() with your OSS SDK.');
  }

  async read(_key: string): Promise<Buffer> {
    this.ensureConfigured();
    throw new Error('OSS driver is a stub — implement read() with your OSS SDK.');
  }

  async remove(_key: string): Promise<void> {
    this.ensureConfigured();
    throw new Error('OSS driver is a stub — implement remove() with your OSS SDK.');
  }
}
