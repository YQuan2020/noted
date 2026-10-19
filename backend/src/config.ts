import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  storageDriver: (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 'oss',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  oss: {
    region: process.env.OSS_REGION ?? '',
    bucket: process.env.OSS_BUCKET ?? '',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID ?? '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET ?? '',
    endpoint: process.env.OSS_ENDPOINT ?? '',
    publicBaseUrl: process.env.OSS_PUBLIC_BASE_URL ?? '',
  },
};
