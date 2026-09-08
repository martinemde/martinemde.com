import { getSession } from '$lib/server/auth';
import { sequence } from '@sveltejs/kit/hooks';
import { json, text, type Handle } from '@sveltejs/kit';
import { getRawPostBySlug } from '$lib/utils/posts';
import { VARY_ACCEPT, negotiateContentType } from '$lib/utils/content-negotiation';

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
 * CSRF protection copied from SvelteKit but with the ability to turn it off for specific routes.
 * Logic duplicated from `src/runtime/respond#respond` as of commit
 * `008056b6ef33b554f8b03131c2635cc14b677ff1`
 */
function csrf(allowedPaths: string[]): Handle {
  return async ({ event, resolve }) => {
    const { request, url } = event;
    const forbidden =
      isFormContentType(request) &&
      (request.method === 'POST' ||
        request.method === 'PUT' ||
        request.method === 'PATCH' ||
        request.method === 'DELETE') &&
      request.headers.get('origin') !== url.origin &&
      !allowedPaths.includes(url.pathname);

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
 * Media types a blog article can be served as, in server-preference order.
 * HTML leads, so browsers and anything sending a bare wildcard keep getting
 * the page.
 */
const ARTICLE_MEDIA_TYPES = ['text/html', 'text/markdown', 'text/plain'] as const;

/**
 * Accept negotiation for blog articles.
 *
 * One article URL has two representations: the rendered page, and the raw
 * markdown an agent is usually after. Both answers carry `Vary: Accept` so a
 * shared cache keys them apart rather than handing whichever variant it stored
 * first to every later client. This is also why the route is not prerendered —
 * a prerendered page is served straight off Cloudflare's asset store and never
 * reaches this hook.
 */
export const handleArticleNegotiation: Handle = async ({ event, resolve }) => {
  const slug = event.params.slug;

  // Data requests belong to client-side navigation and are always JSON.
  if (event.route.id !== '/blog/[slug]' || event.isDataRequest || !slug) {
    return resolve(event);
  }

  // Unlike /blog/[slug].md and .txt, an Accept header matching nothing falls
  // back to HTML instead of 406: HTML is the article's canonical form, and
  // RFC 9110 lets a server answer with it regardless.
  const contentType =
    negotiateContentType(event.request.headers.get('accept'), ARTICLE_MEDIA_TYPES) ?? 'text/html';
  const markdown = contentType === 'text/html' ? null : getRawPostBySlug(slug);

  // An unknown slug falls through so SvelteKit renders its usual 404.
  if (markdown) {
    return new Response(markdown, {
      headers: {
        'Content-Type': `${contentType}; charset=utf-8`,
        Vary: VARY_ACCEPT
      }
    });
  }

  const response = await resolve(event);
  response.headers.set('Vary', VARY_ACCEPT);

  return response;
};

/**
 * Session handler
 * Loads session data and exposes to event.locals
 */
const handleSession: Handle = async ({ event, resolve }) => {
  // Load session data and expose to event.locals
  const session = await getSession(event);

  event.locals.user = session.user;
  event.locals.githubToken = session.githubToken;

  return resolve(event);
};

// Combine handlers in sequence: CSRF with allowlist, CORS, article Accept
// negotiation (which can answer before a session is ever loaded), then session
export const handle = sequence(
  csrf(['/auth/indieauth/token']),
  handleCors,
  handleArticleNegotiation,
  handleSession
);
