import { dev } from '$app/environment';
import type { StorageBackend } from './types';
import { GitHubStorageBackend } from './github';
import { FileStorageBackend } from './file';
import { TestStorageBackend } from './test';

/**
 * Create a storage backend based on configuration and environment
 *
 * Backend selection priority:
 * 1. MICROPUB_BACKEND env var (test, file, github)
 * 2. Auto-detect: dev mode → file, production → github
 *
 * @param token - GitHub authentication token (required for GitHub backend)
 * @returns StorageBackend instance
 */
export function createStorageBackend(token?: string): StorageBackend {
  // Environment variable override
  const backendType = process.env.MICROPUB_BACKEND;

  if (backendType === 'test') {
    return new TestStorageBackend();
  }

  if (backendType === 'file') {
    return new FileStorageBackend();
  }

  if (backendType === 'github') {
    if (!token) {
      throw new Error('GitHub backend requires authentication token');
    }
    return new GitHubStorageBackend(token);
  }

  // Auto-detect based on environment
  if (dev) {
    // Local development: use file backend
    return new FileStorageBackend();
  } else {
    // Production: use GitHub backend
    if (!token) {
      throw new Error('GitHub token required for production storage backend');
    }
    return new GitHubStorageBackend(token);
  }
}
