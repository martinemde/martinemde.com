import { Octokit } from '@octokit/rest';
import type { StorageBackend } from './types';

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
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;

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
      } catch (error: unknown) {
        // 404 means file doesn't exist, which is fine for creation
        if (error && typeof error === 'object' && 'status' in error) {
          if ((error as { status: number }).status !== 404) {
            throw error;
          }
        } else {
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
    } catch (error: unknown) {
      // Enhance error message with context
      const status =
        error && typeof error === 'object' && 'status' in error
          ? (error as { status: number }).status
          : undefined;
      const message =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : 'Unknown error';
      const action = status === 404 ? 'create' : 'update';
      throw new Error(`Failed to ${action} file in GitHub: ${message}`, {
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
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error) {
        if ((error as { status: number }).status === 404) {
          return false;
        }
      }
      // For other errors, rethrow
      const message =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : 'Unknown error';
      throw new Error(`Failed to check if file exists in GitHub: ${message}`, {
        cause: error
      });
    }
  }

  async uploadImage(filename: string, buffer: Buffer, _mimeType: string): Promise<string> {
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
      } catch (error: unknown) {
        // 404 is expected for new files
        if (error && typeof error === 'object' && 'status' in error) {
          if ((error as { status: number }).status !== 404) {
            throw error;
          }
        } else {
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
      const baseUrl = process.env.PUBLIC_APP_URL || 'https://martinemde.com';
      const publicUrl = `${baseUrl}/images/blog/${filename}`;

      return publicUrl;
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : 'Unknown error';
      throw new Error(`Failed to upload image to GitHub: ${message}`, {
        cause: error
      });
    }
  }
}
