import { Octokit } from '@octokit/rest';

/**
 * Get authenticated user information from GitHub
 *
 * @param token - GitHub OAuth token
 * @returns User information
 */
export async function getGitHubUser(token: string) {
  const octokit = new Octokit({ auth: token });

  const { data: user } = await octokit.users.getAuthenticated();

  return {
    id: user.id,
    login: user.login,
    name: user.name,
    avatar_url: user.avatar_url
  };
}

/**
 * Verify that the user has write access to the configured repository
 *
 * @param token - GitHub OAuth token
 * @param username - GitHub username to verify
 * @returns true if user owns or has write access to the repository
 */
export async function verifyRepoOwnership(token: string, username: string): Promise<boolean> {
  const octokit = new Octokit({ auth: token });

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO || `${owner}.github.io`;

  if (!owner) {
    throw new Error('GITHUB_OWNER environment variable is required');
  }

  try {
    // Get repository information
    const { data: repository } = await octokit.repos.get({
      owner,
      repo
    });

    // Check if user owns the repository
    if (repository.owner.login === username) {
      return true;
    }

    // Check if user has write permission
    const { data: permission } = await octokit.repos.getCollaboratorPermissionLevel({
      owner,
      repo,
      username
    });

    // Allow if user has write, maintain, or admin permission
    return ['write', 'maintain', 'admin'].includes(permission.permission);
  } catch (error: unknown) {
    // If repository not found or no access, return false
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 404 || status === 403) {
        return false;
      }
    }
    throw error;
  }
}
