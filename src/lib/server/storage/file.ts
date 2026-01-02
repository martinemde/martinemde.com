import { writeFile, access, mkdir, readFile, readdir } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { cwd } from 'node:process';
import type { StorageBackend, BlogPostFileInfo } from './types';

/**
 * File-based storage backend for local development
 *
 * Writes blog posts and images directly to the filesystem in the same
 * directory structure as production:
 * - Posts: src/content/blog/
 * - Images: static/images/blog/
 */
export class FileStorageBackend implements StorageBackend {
  private projectRoot: string;

  constructor() {
    // Use current working directory as project root
    this.projectRoot = cwd();
  }

  /**
   * Resolve a relative path to an absolute path within the project
   */
  private resolvePath(relativePath: string): string {
    // Normalize path separators and remove any leading slashes
    const normalized = relativePath.replace(/^\/+/, '');
    return join(this.projectRoot, normalized);
  }

  /**
   * Ensure the directory exists, creating it if necessary
   */
  private async ensureDirectory(filePath: string): Promise<void> {
    const dir = dirname(filePath);
    try {
      await access(dir);
    } catch {
      // Directory doesn't exist, create it
      await mkdir(dir, { recursive: true });
    }
  }

  async createOrUpdateFile(path: string, content: string, message: string): Promise<void> {
    const absolutePath = this.resolvePath(path);

    // Ensure parent directory exists
    await this.ensureDirectory(absolutePath);

    // Write file (will create or overwrite)
    await writeFile(absolutePath, content, 'utf-8');

    // Log the message for debugging (simulates commit message)
    console.log(`[FileBackend] ${message} → ${path}`);
  }

  async fileExists(path: string): Promise<boolean> {
    const absolutePath = this.resolvePath(path);

    try {
      await access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  async uploadImage(filename: string, buffer: Buffer, mimeType: string): Promise<string> {
    // Store images in static/images/blog/ directory
    const relativePath = `static/images/blog/${filename}`;
    const absolutePath = this.resolvePath(relativePath);

    // Ensure directory exists
    await this.ensureDirectory(absolutePath);

    // Write image file
    await writeFile(absolutePath, buffer);

    // Return public URL (images in static/ are served at root)
    const publicUrl = `/images/blog/${filename}`;
    console.log(`[FileBackend] Uploaded image ${filename} (${mimeType}) → ${publicUrl}`);

    return publicUrl;
  }

  async readFile(path: string): Promise<string> {
    const absolutePath = this.resolvePath(path);

    try {
      const content = await readFile(absolutePath, 'utf-8');
      return content;
    } catch (error: any) {
      throw new Error(`Failed to read file: ${error.message}`, {
        cause: error
      });
    }
  }

  async listBlogPosts(): Promise<BlogPostFileInfo[]> {
    const blogDir = this.resolvePath('src/content/blog');

    try {
      // Read directory contents
      const files = await readdir(blogDir);

      // Filter for markdown files and extract metadata
      const posts: BlogPostFileInfo[] = [];

      for (const filename of files) {
        if (!filename.endsWith('.md')) continue;

        // Parse filename format: YYYY-MM-DD-slug.md
        const match = filename.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
        if (!match) continue;

        const [, dateStr, slug] = match;

        posts.push({
          filename,
          path: `src/content/blog/${filename}`,
          slug,
          date: dateStr
        });
      }

      // Sort by date, newest first
      posts.sort((a, b) => b.date.localeCompare(a.date));

      return posts;
    } catch (error: any) {
      // If directory doesn't exist, return empty array
      if (error.code === 'ENOENT') {
        return [];
      }
      throw new Error(`Failed to list blog posts: ${error.message}`, {
        cause: error
      });
    }
  }
}
