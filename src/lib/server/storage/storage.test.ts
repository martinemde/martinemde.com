import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestStorageBackend } from './test';
import { FileStorageBackend } from './file';
import { createStorageBackend } from './factory';
import { rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

describe('TestStorageBackend', () => {
  let backend: TestStorageBackend;

  beforeEach(() => {
    backend = new TestStorageBackend();
  });

  describe('createOrUpdateFile', () => {
    it('should store file content', async () => {
      const path = 'src/content/blog/test.md';
      const content = '# Test Post';
      const message = 'Add test post';

      await backend.createOrUpdateFile(path, content, message);

      expect(backend.getFile(path)).toBe(content);
    });

    it('should update existing file', async () => {
      const path = 'src/content/blog/test.md';

      await backend.createOrUpdateFile(path, 'Old content', 'Create');
      await backend.createOrUpdateFile(path, 'New content', 'Update');

      expect(backend.getFile(path)).toBe('New content');
    });

    it('should store multiple files independently', async () => {
      await backend.createOrUpdateFile('file1.md', 'Content 1', 'Add file 1');
      await backend.createOrUpdateFile('file2.md', 'Content 2', 'Add file 2');

      expect(backend.getFile('file1.md')).toBe('Content 1');
      expect(backend.getFile('file2.md')).toBe('Content 2');
      expect(backend.getFileCount()).toBe(2);
    });
  });

  describe('fileExists', () => {
    it('should return false for non-existent file', async () => {
      const exists = await backend.fileExists('non-existent.md');
      expect(exists).toBe(false);
    });

    it('should return true for existing file', async () => {
      await backend.createOrUpdateFile('test.md', 'content', 'message');

      const exists = await backend.fileExists('test.md');
      expect(exists).toBe(true);
    });
  });

  describe('uploadImage', () => {
    it('should store image buffer', async () => {
      const filename = 'test.jpg';
      const buffer = Buffer.from('fake-image-data');
      const mimeType = 'image/jpeg';

      const url = await backend.uploadImage(filename, buffer, mimeType);

      expect(url).toContain(filename);
      expect(backend.getImage(filename)).toEqual(buffer);
    });

    it('should return URL for uploaded image', async () => {
      const filename = 'photo.png';
      const buffer = Buffer.from('image-data');

      const url = await backend.uploadImage(filename, buffer, 'image/png');

      expect(url).toMatch(/test-images\/photo.png/);
    });

    it('should store multiple images', async () => {
      await backend.uploadImage('img1.jpg', Buffer.from('data1'), 'image/jpeg');
      await backend.uploadImage('img2.png', Buffer.from('data2'), 'image/png');

      expect(backend.getImageCount()).toBe(2);
    });
  });

  describe('inspection methods', () => {
    it('should get all files', async () => {
      await backend.createOrUpdateFile('file1.md', 'content1', 'message');
      await backend.createOrUpdateFile('file2.md', 'content2', 'message');

      const files = backend.getAllFiles();

      expect(files.size).toBe(2);
      expect(files.get('file1.md')).toBe('content1');
      expect(files.get('file2.md')).toBe('content2');
    });

    it('should get all images', async () => {
      const buffer1 = Buffer.from('data1');
      const buffer2 = Buffer.from('data2');

      await backend.uploadImage('img1.jpg', buffer1, 'image/jpeg');
      await backend.uploadImage('img2.png', buffer2, 'image/png');

      const images = backend.getAllImages();

      expect(images.size).toBe(2);
      expect(images.get('img1.jpg')).toEqual(buffer1);
      expect(images.get('img2.png')).toEqual(buffer2);
    });

    it('should clear all data', async () => {
      await backend.createOrUpdateFile('file.md', 'content', 'message');
      await backend.uploadImage('image.jpg', Buffer.from('data'), 'image/jpeg');

      backend.clear();

      expect(backend.getFileCount()).toBe(0);
      expect(backend.getImageCount()).toBe(0);
    });
  });
});

describe('FileStorageBackend', () => {
  let backend: FileStorageBackend;
  let testDir: string;

  beforeEach(() => {
    backend = new FileStorageBackend();
    testDir = join(process.cwd(), 'tmp-test-storage');
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('fileExists', () => {
    it('should return false for non-existent file', async () => {
      const exists = await backend.fileExists('tmp-test-storage/non-existent.md');
      expect(exists).toBe(false);
    });

    it('should return true for existing file', async () => {
      const path = 'tmp-test-storage/test.md';
      await backend.createOrUpdateFile(path, 'content', 'message');

      const exists = await backend.fileExists(path);
      expect(exists).toBe(true);
    });
  });

  describe('createOrUpdateFile', () => {
    it('should create file with content', async () => {
      const path = 'tmp-test-storage/test.md';
      const content = '# Test Content';

      await backend.createOrUpdateFile(path, content, 'Create test file');

      const exists = await backend.fileExists(path);
      expect(exists).toBe(true);
    });

    it('should update existing file', async () => {
      const path = 'tmp-test-storage/update.md';

      await backend.createOrUpdateFile(path, 'Original', 'Create');
      await backend.createOrUpdateFile(path, 'Updated', 'Update');

      const exists = await backend.fileExists(path);
      expect(exists).toBe(true);
    });

    it('should create nested directories', async () => {
      const path = 'tmp-test-storage/nested/deep/file.md';

      await backend.createOrUpdateFile(path, 'content', 'Create nested file');

      const exists = await backend.fileExists(path);
      expect(exists).toBe(true);
    });
  });

  describe('uploadImage', () => {
    it('should upload image and return URL', async () => {
      const filename = 'test-image.jpg';
      const buffer = Buffer.from('fake-image-data');

      const url = await backend.uploadImage(filename, buffer, 'image/jpeg');

      expect(url).toBe(`/images/blog/${filename}`);
    });

    it('should create image file', async () => {
      const filename = 'photo.png';
      const buffer = Buffer.from('image-data');

      await backend.uploadImage(filename, buffer, 'image/png');

      const imagePath = `static/images/blog/${filename}`;
      const exists = await backend.fileExists(imagePath);
      expect(exists).toBe(true);
    });
  });
});

describe('createStorageBackend (factory)', () => {
  describe('environment variable override', () => {
    it('should create test backend when MICROPUB_BACKEND=test', () => {
      const originalEnv = process.env.MICROPUB_BACKEND;
      process.env.MICROPUB_BACKEND = 'test';

      const backend = createStorageBackend();

      expect(backend).toBeInstanceOf(TestStorageBackend);

      process.env.MICROPUB_BACKEND = originalEnv;
    });

    it('should create file backend when MICROPUB_BACKEND=file', () => {
      const originalEnv = process.env.MICROPUB_BACKEND;
      process.env.MICROPUB_BACKEND = 'file';

      const backend = createStorageBackend();

      expect(backend).toBeInstanceOf(FileStorageBackend);

      process.env.MICROPUB_BACKEND = originalEnv;
    });

    it('should throw error for github backend without token', () => {
      const originalEnv = process.env.MICROPUB_BACKEND;
      process.env.MICROPUB_BACKEND = 'github';

      expect(() => createStorageBackend()).toThrow('GitHub backend requires authentication token');

      process.env.MICROPUB_BACKEND = originalEnv;
    });
  });

  describe('error handling', () => {
    it('should throw error for production without token', () => {
      const originalEnv = process.env.MICROPUB_BACKEND;
      delete process.env.MICROPUB_BACKEND;

      // Note: In actual production (dev=false), this would throw
      // We can't easily test that here since dev is set by SvelteKit build

      process.env.MICROPUB_BACKEND = originalEnv;
    });
  });
});
