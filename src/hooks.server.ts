import { getSession } from '$lib/server/auth';
import { sequence } from '@sveltejs/kit/hooks';
import { json, text, type Handle, type RequestEvent } from '@sveltejs/kit';

/**
 * API endpoints that accept cross-site form submissions.
 *
 * IndieAuth and Micropub clients are third-party applications: they POST
 * form-encoded (or multipart) bodies from their own origin, or with no Origin
 * header at all, and authenticate with a bearer token rather than the session
 * cookie. Applying CSRF protection here rejects every conforming client.
 *
 * The exemption is safe because `handleSession` withholds the session from
 * cross-site submissions to these paths, so an exempt endpoint can never act
 * on ambient browser credentials.
 */
const CSRF_EXEMPT_PATHS = ['/auth/indieauth/token', '/micropub', '/micropub/media'];

/**
 * Helper to check content type
 */
function isContentType(request: Request, ...types: string[]) {
  const type = request.headers.get('content-type')?.split(';', 1)[0].trim() ?? '';
  return types.includes(type.toLowerCase());
}

/**
 * Helper to check if request is form content
 */
function isFormContentType(request: Request) {
  return isContentType(
    request,
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain'
  );
}

/**
 * A form submission from another origin: the shape of request that CSRF
 * protection exists to block.
 */
function isCrossSiteFormSubmission({ request, url }: Pick<RequestEvent, 'request' | 'url'>) {
  return (
    isFormContentType(request) &&
    (request.method === 'POST' ||
      request.method === 'PUT' ||
      request.method === 'PATCH' ||
      request.method === 'DELETE') &&
    request.headers.get('origin') !== url.origin
  );
}

/**
 * CSRF protection copied from SvelteKit but with the ability to turn it off for specific routes.
 * Logic duplicated from `src/runtime/respond#respond` as of commit
 * `008056b6ef33b554f8b03131c2635cc14b677ff1`
 */
function csrf(allowedPaths: string[]): Handle {
  return async ({ event, resolve }) => {
    const { request, url } = event;
    const forbidden = isCrossSiteFormSubmission(event) && !allowedPaths.includes(url.pathname);

    if (forbidden) {
      const message = `Cross-site ${request.method} form submissions are forbidden`;
      if (request.headers.get('accept') === 'application/json') {
        return json({ message }, { status: 403 });
      }
      return text(message, { status: 403 });
    }

    return resolve(event);
  };
}

/** CSRF protection with the Micropub/IndieAuth endpoints exempted. Exported for tests. */
export const handleCsrf = csrf(CSRF_EXEMPT_PATHS);

/**
 * CORS handler for IndieAuth token endpoint
 * Allows cross-origin requests as required by the IndieAuth spec
 */
const handleCors: Handle = async ({ event, resolve }) => {
  // Allow CORS for IndieAuth token endpoint
  if (event.url.pathname === '/auth/indieauth/token') {
    // Handle preflight requests
    if (event.request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
  }

  const response = await resolve(event);

  // Add CORS headers to IndieAuth token endpoint responses
  if (event.url.pathname === '/auth/indieauth/token') {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return response;
};

/**
 * Session handler
 * Loads session data and exposes to event.locals. Exported for tests.
 */
export const handleSession: Handle = async ({ event, resolve }) => {
  // A cross-site submission that CSRF protection waved through must not pick
  // up the session cookie: those endpoints authenticate with a bearer token,
  // and honouring ambient credentials here would reopen the CSRF hole.
  if (CSRF_EXEMPT_PATHS.includes(event.url.pathname) && isCrossSiteFormSubmission(event)) {
    return resolve(event);
  }

  // Load session data and expose to event.locals
  const session = await getSession(event);

  event.locals.user = session.user;
  event.locals.githubToken = session.githubToken;

  return resolve(event);
};

// Combine handlers in sequence: CSRF with allowlist, CORS, then session
export const handle = sequence(handleCsrf, handleCors, handleSession);
