import { redirect } from '@sveltejs/kit';
import { clearSession } from '$lib/server/auth';
import { revokeTokensByGithubToken } from '$lib/server/token-store';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
  // Revoke all IndieAuth tokens for this GitHub session
  if (event.locals.githubToken) {
    const revoked = revokeTokensByGithubToken(event.locals.githubToken);
    console.log(`Revoked ${revoked} IndieAuth token(s) on logout`);
  }

  // Clear session cookie
  clearSession(event);

  // Redirect to home
  redirect(302, '/editor');
};
