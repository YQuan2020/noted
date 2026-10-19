import { config } from '../config';
import type { ImageStorage } from './driver';
import { LocalStorage } from './local';
import { OssStorage } from './oss';

export type { ImageStorage } from './driver';

let storage: ImageStorage | null = null;

export function getStorage(): ImageStorage {
  if (!storage) {
    storage =
      config.storageDriver === 'oss'
        ? new OssStorage(config.oss)
        : new LocalStorage(config.uploadDir);
  }
  return storage;
}
