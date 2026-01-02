import { error, redirect } from '@sveltejs/kit';
import { generateState, getAuthorizationUrl, getSession, setSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

/**
 * IndieAuth Authorization Endpoint
 *
 * Accepts IndieAuth authorization requests and initiates GitHub OAuth flow.
 * Parameters:
 * - me: User's profile URL (e.g., https://martinemde.com/)
 * - client_id: Client application URL
 * - redirect_uri: Where to send the user after authorization
 * - state: Client's CSRF protection token
 * - code_challenge: PKCE challenge (optional but recommended)
 * - code_challenge_method: Should be 'S256' or 'plain'
 * - response_type: Should be 'code'
 */
export const GET: RequestHandler = async (event) => {
  const { url } = event;

  // Extract IndieAuth parameters
  const me = url.searchParams.get('me');
  const clientId = url.searchParams.get('client_id');
  const redirectUri = url.searchParams.get('redirect_uri');
  const state = url.searchParams.get('state');
  const codeChallenge = url.searchParams.get('code_challenge');
  const codeChallengeMethod = url.searchParams.get('code_challenge_method');
  const responseType = url.searchParams.get('response_type');

  // Validate required parameters
  if (!me || !clientId || !redirectUri || !state) {
    error(400, 'Missing required parameters: me, client_id, redirect_uri, state');
  }

  if (responseType && responseType !== 'code') {
    error(400, 'Only response_type=code is supported');
  }

  // Validate code challenge method if provided
  if (codeChallenge && codeChallengeMethod && !['S256', 'plain'].includes(codeChallengeMethod)) {
    error(400, 'code_challenge_method must be S256 or plain');
  }

  // Validate me parameter matches our domain
  const siteUrl = new URL(event.url.origin);
  const meUrl = new URL(me);

  if (meUrl.origin !== siteUrl.origin) {
    error(400, `The 'me' parameter must match your site URL: ${siteUrl.origin}`);
  }

  // Generate OAuth state for CSRF protection
  const oauthState = generateState();

  // Store IndieAuth request details in session
  const session = await getSession(event);
  await setSession(event, {
    ...session,
    oauthState,
    indieAuthRequest: {
      me,
      clientId,
      redirectUri,
      state,
      codeChallenge: codeChallenge ?? undefined,
      codeChallengeMethod: codeChallengeMethod ?? undefined
    }
  });

  // Build GitHub OAuth URL
  const githubCallbackUri = `${event.url.origin}/auth/github/callback`;
  const authUrl = getAuthorizationUrl(oauthState, githubCallbackUri);

  // Redirect to GitHub for authentication
  redirect(302, authUrl);
};
