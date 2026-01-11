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

  // Validate redirect_uri
  let redirectUrl: URL;
  try {
    redirectUrl = new URL(redirectUri);
  } catch {
    error(400, 'redirect_uri must be a valid URL');
  }

  // Only allow https:// or http://localhost for development
  if (redirectUrl.protocol !== 'https:') {
    const isLocalhost =
      redirectUrl.hostname === 'localhost' ||
      redirectUrl.hostname === '127.0.0.1' ||
      redirectUrl.hostname === '[::1]';

    if (!isLocalhost || redirectUrl.protocol !== 'http:') {
      error(400, 'redirect_uri must use https (except localhost for development)');
    }
  }

  // Validate client_id
  let clientUrl: URL;
  try {
    clientUrl = new URL(clientId);
  } catch {
    error(400, 'client_id must be a valid URL');
  }

  // Only allow https:// or http://localhost for development
  if (clientUrl.protocol !== 'https:') {
    const isLocalhost =
      clientUrl.hostname === 'localhost' ||
      clientUrl.hostname === '127.0.0.1' ||
      clientUrl.hostname === '[::1]';

    if (!isLocalhost || clientUrl.protocol !== 'http:') {
      error(400, 'client_id must use https (except localhost for development)');
    }
  }

  // Validate redirect_uri is under client_id origin (security best practice)
  // This prevents authorization code from being sent to a different domain
  // Exception: Allow localhost redirect_uri with localhost client_id on any port
  const isClientLocalhost =
    clientUrl.hostname === 'localhost' ||
    clientUrl.hostname === '127.0.0.1' ||
    clientUrl.hostname === '[::1]';
  const isRedirectLocalhost =
    redirectUrl.hostname === 'localhost' ||
    redirectUrl.hostname === '127.0.0.1' ||
    redirectUrl.hostname === '[::1]';

  if (isClientLocalhost && isRedirectLocalhost) {
    // Both localhost - allow any port for development
  } else if (redirectUrl.origin !== clientUrl.origin) {
    // For non-localhost, redirect_uri must exactly match client_id origin
    error(
      400,
      `redirect_uri origin (${redirectUrl.origin}) must match client_id origin (${clientUrl.origin})`
    );
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
