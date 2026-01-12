import { getSession } from '$lib/server/auth';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

/**
 * CORS headers for IndieAuth token endpoint
 * Allows cross-origin requests from Micropub clients
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, POST',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
  'Access-Control-Max-Age': '86400'
};

/**
 * CORS handler for IndieAuth token endpoint
 * Intercepts requests to /auth/indieauth/token and adds CORS headers
 */
const handleCORS: Handle = async ({ event, resolve }) => {
  const url = new URL(event.request.url);

  // Only apply CORS to IndieAuth token endpoint
  if (!url.pathname.startsWith('/auth/indieauth/token')) {
    return await resolve(event);
  }

  // Handle OPTIONS preflight request
  if (event.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Process the request and add CORS headers to response
  const response = await resolve(event);
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }

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

// Combine handlers in sequence: CORS first, then session
export const handle = sequence(handleCORS, handleSession);
