import { Octokit } from '@octokit/rest';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { StorageBackend, BlogPostFileInfo } from './types';

/**
 * GitHub-based storage backend for production
 *
 * Uses the GitHub API to create/update files and upload images to the repository.
 * All operations create commits in the GitHub repository.
 */
export class GitHubStorageBackend implements StorageBackend {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });

    // Get repository configuration from environment variables
    const owner = env.GITHUB_OWNER;
    const repo = env.GITHUB_REPO;

    if (!owner) {
      throw new Error('GITHUB_OWNER environment variable is required');
    }

    // Default repo to owner.github.io if not specified
    this.owner = owner;
    this.repo = repo || `${owner}.github.io`;
  }

  async createOrUpdateFile(path: string, content: string, message: string): Promise<void> {
    try {
      // Check if file exists to determine if we're creating or updating
      let sha: string | undefined;

      try {
        const { data } = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path
        });

        // File exists, get its SHA for updating
        if ('sha' in data) {
          sha = data.sha;
        }
      } catch (error: any) {
        // 404 means file doesn't exist, which is fine for creation
        if (error.status !== 404) {
          throw error;
        }
      }

      // Create or update the file
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        sha // Include SHA if updating, omit if creating
      });
    } catch (error: any) {
      // Enhance error message with context
      const action = error.status === 404 ? 'create' : 'update';
      throw new Error(`Failed to ${action} file in GitHub: ${error.message || 'Unknown error'}`, {
        cause: error
      });
    }
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path
      });
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      // For other errors, rethrow
      throw new Error(`Failed to check if file exists in GitHub: ${error.message}`, {
        cause: error
      });
    }
  }

  async uploadImage(filename: string, buffer: Buffer, mimeType: string): Promise<string> {
    const path = `static/images/blog/${filename}`;

    try {
      // Check if file already exists
      let sha: string | undefined;

      try {
        const { data } = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path
        });

        if ('sha' in data) {
          sha = data.sha;
        }
      } catch (error: any) {
        // 404 is expected for new files
        if (error.status !== 404) {
          throw error;
        }
      }

      // Upload the image
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message: `Upload image: ${filename}`,
        content: buffer.toString('base64'),
        sha
      });

      // Get public URL from environment
      const baseUrl = publicEnv.PUBLIC_APP_URL || 'https://martinemde.com';
      const publicUrl = `${baseUrl}/images/blog/${filename}`;

      return publicUrl;
    } catch (error: any) {
      throw new Error(`Failed to upload image to GitHub: ${error.message}`, {
        cause: error
      });
    }
  }

  async readFile(path: string): Promise<string> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path
      });

      // GitHub API returns content as base64
      if ('content' in data && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }

      throw new Error('File content not available');
    } catch (error: any) {
      throw new Error(`Failed to read file from GitHub: ${error.message}`, {
        cause: error
      });
    }
  }

  async listBlogPosts(): Promise<BlogPostFileInfo[]> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: 'src/content/blog'
      });

      // Ensure we got a directory listing
      if (!Array.isArray(data)) {
        throw new Error('Expected directory listing');
      }

      const posts: BlogPostFileInfo[] = [];

      for (const file of data) {
        if (file.type !== 'file' || !file.name.endsWith('.md')) continue;

        // Parse filename format: YYYY-MM-DD-slug.md
        const match = file.name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
        if (!match) continue;

        const [, dateStr, slug] = match;

        posts.push({
          filename: file.name,
          path: file.path,
          slug,
          date: dateStr
        });
      }

      // Sort by date, newest first
      posts.sort((a, b) => b.date.localeCompare(a.date));

      return posts;
    } catch (error: any) {
      // If directory doesn't exist, return empty array
      if (error.status === 404) {
        return [];
      }
      throw new Error(`Failed to list blog posts from GitHub: ${error.message}`, {
        cause: error
      });
    }
  }
}
