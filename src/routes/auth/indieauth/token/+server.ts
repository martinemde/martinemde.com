import { error, json } from '@sveltejs/kit';
import { verifyAuthCode, verifyCodeChallenge } from '$lib/server/auth';
import { storeAccessToken } from '$lib/server/token-store';
import type { RequestHandler } from './$types';

/**
 * IndieAuth Token Endpoint
 *
 * Exchanges an authorization code for an access token.
 * Supports both form-encoded and JSON requests.
 *
 * CORS is handled by the server hook in hooks.server.ts
 *
 * Parameters:
 * - grant_type: Must be 'authorization_code'
 * - code: Authorization code from the authorize endpoint
 * - client_id: Client application URL (must match)
 * - redirect_uri: Redirect URI (must match)
 * - code_verifier: PKCE verifier (required if code_challenge was used)
 */
export const POST: RequestHandler = async ({ request }) => {
  // Parse request body (support both JSON and form-encoded)
  const contentType = request.headers.get('content-type') || '';
  let params: Record<string, string>;

  if (contentType.includes('application/json')) {
    params = await request.json();
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    params = Object.fromEntries(formData) as Record<string, string>;
  } else {
    error(415, 'Content-Type must be application/json or application/x-www-form-urlencoded');
  }

  const { grant_type, code, client_id, redirect_uri, code_verifier } = params;

  // Validate required parameters
  if (!grant_type || !code || !client_id || !redirect_uri) {
    error(400, 'Missing required parameters: grant_type, code, client_id, redirect_uri');
  }

  // Verify grant type
  if (grant_type !== 'authorization_code') {
    error(400, 'grant_type must be authorization_code');
  }

  // Verify authorization code
  const authCode = await verifyAuthCode(code);
  if (!authCode) {
    error(400, 'Invalid or expired authorization code');
  }

  // Verify client_id matches
  if (authCode.clientId !== client_id) {
    error(400, 'client_id does not match');
  }

  // Verify redirect_uri matches
  if (authCode.redirectUri !== redirect_uri) {
    error(400, 'redirect_uri does not match');
  }

  // Verify PKCE if code_challenge was used
  if (authCode.codeChallenge) {
    if (!code_verifier) {
      error(400, 'code_verifier is required');
    }

    const isValid = await verifyCodeChallenge(
      code_verifier,
      authCode.codeChallenge,
      authCode.codeChallengeMethod
    );

    if (!isValid) {
      error(400, 'Invalid code_verifier');
    }
  }

  // Generate and store access token
  // Token ID is returned to client, GitHub token is stored securely server-side
  const accessToken = storeAccessToken(
    authCode.githubToken,
    authCode.me,
    'create update' // Micropub scopes
  );

  // Return IndieAuth token response
  // CORS headers are added by the server hook
  return json({
    access_token: accessToken,
    token_type: 'Bearer',
    scope: 'create update',
    me: authCode.me
  });
};
