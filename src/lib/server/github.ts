import { Octokit } from '@octokit/rest';
import { GITHUB_OWNER, GITHUB_REPO } from '$env/static/private';

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
}

export interface CreateFileOptions {
  path: string;
  content: string;
  message: string;
  token: string;
}

export interface UploadImageOptions {
  filename: string;
  content: Buffer;
  message: string;
  token: string;
}

/**
 * Get authenticated user information from GitHub
 */
export async function getGitHubUser(token: string): Promise<GitHubUser> {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.users.getAuthenticated();

  return {
    id: data.id,
    login: data.login,
    name: data.name,
    avatar_url: data.avatar_url
  };
}

/**
 * Verify that the authenticated user owns the configured repository
 */
export async function verifyRepoOwnership(token: string, username: string): Promise<boolean> {
  try {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.rest.repos.get({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO
    });

    // Check if user is the owner or has admin access
    return (
      data.owner.login.toLowerCase() === username.toLowerCase() ||
      (data.permissions?.admin ?? false)
    );
  } catch (error) {
    console.error('Failed to verify repo ownership:', error);
    return false;
  }
}

/**
 * Create or update a file in the GitHub repository
 */
export async function createOrUpdateFile({
  path,
  content,
  message,
  token
}: CreateFileOptions): Promise<string> {
  const octokit = new Octokit({ auth: token });

  // Convert content to base64
  const contentBase64 = Buffer.from(content, 'utf-8').toString('base64');

  // Check if file exists to get its SHA for update
  let sha: string | undefined;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path
    });

    if ('sha' in data) {
      sha = data.sha;
    }
  } catch (error) {
    // File doesn't exist, that's fine for create
  }

  // Create or update the file
  const { data } = await octokit.rest.repos.createOrUpdateFileContents({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    path,
    message,
    content: contentBase64,
    sha // undefined for create, SHA for update
  });

  return data.content?.html_url || '';
}

/**
 * Upload an image to the static/images/blog directory
 */
export async function uploadImage({
  filename,
  content,
  message,
  token
}: UploadImageOptions): Promise<string> {
  const octokit = new Octokit({ auth: token });

  // Generate date-based path
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  // Clean filename and add date prefix
  const cleanFilename = filename.replace(/[^a-z0-9._-]/gi, '-').toLowerCase();
  const datePrefix = `${year}-${month}-${day}`;
  const path = `static/images/blog/${datePrefix}-${cleanFilename}`;

  // Convert buffer to base64
  const contentBase64 = content.toString('base64');

  // Create the file (no update for images, always create with unique name)
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    path,
    message,
    content: contentBase64
  });

  // Return the public URL path (without static/)
  return `/images/blog/${datePrefix}-${cleanFilename}`;
}

/**
 * Check if a file exists at the given path
 */
export async function fileExists(path: string, token: string): Promise<boolean> {
  try {
    const octokit = new Octokit({ auth: token });
    await octokit.rest.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path
    });
    return true;
  } catch {
    return false;
  }
}
