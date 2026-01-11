import { error, redirect } from '@sveltejs/kit';
import { exchangeCodeForToken, getSession, setSession, createAuthCode } from '$lib/server/auth';
import { getGitHubUser, verifyRepoOwnership } from '$lib/server/github-auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
  const code = event.url.searchParams.get('code');
  const state = event.url.searchParams.get('state');

  if (!code || !state) {
    error(400, 'Missing code or state parameter');
  }

  // Verify CSRF state
  const session = await getSession(event);
  if (!session.oauthState || session.oauthState !== state) {
    error(400, 'Invalid state parameter');
  }

  try {
    // Exchange code for access token
    const token = await exchangeCodeForToken(code);

    // Get user information
    const user = await getGitHubUser(token);

    // Verify user owns the repository
    const hasAccess = await verifyRepoOwnership(token, user.login);
    if (!hasAccess) {
      error(
        403,
        'You do not have access to this repository. Please ensure you own the configured repository.'
      );
    }

    // Check if this is part of an IndieAuth flow
    if (session.indieAuthRequest) {
      const indieAuthReq = session.indieAuthRequest;

      // Generate authorization code for IndieAuth client
      const authCode = await createAuthCode({
        githubToken: token,
        me: indieAuthReq.me,
        clientId: indieAuthReq.clientId,
        redirectUri: indieAuthReq.redirectUri,
        codeChallenge: indieAuthReq.codeChallenge,
        codeChallengeMethod: indieAuthReq.codeChallengeMethod
      });

      // Clear IndieAuth request from session
      await setSession(event, {
        user,
        githubToken: token
      });

      // Redirect back to client with authorization code
      const redirectUrl = new URL(indieAuthReq.redirectUri);
      redirectUrl.searchParams.set('code', authCode);
      redirectUrl.searchParams.set('state', indieAuthReq.state);

      redirect(302, redirectUrl.toString());
    }

    // Normal (non-IndieAuth) flow: store user and token in session
    await setSession(event, {
      user,
      githubToken: token
    });
  } catch (err) {
    // SvelteKit's redirect() throws a redirect object with status and location
    // SvelteKit's error() throws an HttpError with status and body
    // We need to rethrow both, only catching unexpected errors
    if (err && typeof err === 'object' && 'status' in err) {
      // Check if it's a redirect (has location) or HttpError (has body)
      if ('location' in err || 'body' in err) {
        throw err;
      }
    }

    console.error('OAuth callback error:', err instanceof Error ? err.message : String(err));
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    console.error('Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    error(500, 'Authentication failed');
  }

  // Redirect to editor (outside try-catch to avoid catching the redirect)
  redirect(302, '/editor');
};
