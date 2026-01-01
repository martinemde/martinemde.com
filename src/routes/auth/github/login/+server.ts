import { redirect } from '@sveltejs/kit';
import { generateState, getAuthorizationUrl, setSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
  // Generate CSRF protection state
  const state = generateState();

  // Store state in session for verification
  await setSession(event, { oauthState: state });

  // Build redirect URI for GitHub OAuth
  const redirectUri = `${event.url.origin}/auth/github/callback`;

  // Get GitHub OAuth URL
  const authUrl = getAuthorizationUrl(state, redirectUri);

  // Redirect to GitHub
  redirect(302, authUrl);
};
