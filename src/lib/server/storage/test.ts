import type { StorageBackend, BlogPostFileInfo } from './types';

/**
 * In-memory storage backend for testing
 *
 * Stores files and images in memory using Maps. Data is lost when the process ends.
 * Provides additional inspection methods for test assertions.
 */
export class TestStorageBackend implements StorageBackend {
  private files = new Map<string, string>();
  private images = new Map<string, Buffer>();

  async createOrUpdateFile(path: string, content: string, _message: string): Promise<void> {
    this.files.set(path, content);
  }

  async fileExists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async uploadImage(filename: string, buffer: Buffer, _mimeType: string): Promise<string> {
    this.images.set(filename, buffer);
    // Return fake URL for testing
    return `/test-images/${filename}`;
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  async listBlogPosts(): Promise<BlogPostFileInfo[]> {
    const posts: BlogPostFileInfo[] = [];

    for (const [path, _content] of this.files.entries()) {
      // Only look at blog post files
      if (!path.startsWith('src/content/blog/') || !path.endsWith('.md')) {
        continue;
      }

      const filename = path.split('/').pop()!;

      // Parse filename format: YYYY-MM-DD-slug.md
      const match = filename.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
      if (!match) continue;

      const [, dateStr, slug] = match;

      posts.push({
        filename,
        path,
        slug,
        date: dateStr
      });
    }

    // Sort by date, newest first
    posts.sort((a, b) => b.date.localeCompare(a.date));

    return posts;
  }

  // Test inspection methods

  /**
   * Get file content by path (for test assertions)
   */
  getFile(path: string): string | undefined {
    return this.files.get(path);
  }

  /**
   * Get all files (for test assertions)
   */
  getAllFiles(): Map<string, string> {
    return new Map(this.files);
  }

  /**
   * Get image buffer by filename (for test assertions)
   */
  getImage(filename: string): Buffer | undefined {
    return this.images.get(filename);
  }

  /**
   * Get all images (for test assertions)
   */
  getAllImages(): Map<string, Buffer> {
    return new Map(this.images);
  }

  /**
   * Clear all stored data (for test cleanup)
   */
  clear(): void {
    this.files.clear();
    this.images.clear();
  }

  /**
   * Get count of stored files
   */
  getFileCount(): number {
    return this.files.size;
  }

  /**
   * Get count of stored images
   */
  getImageCount(): number {
    return this.images.size;
  }
}
