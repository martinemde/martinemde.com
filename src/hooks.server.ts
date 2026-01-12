import { getSession } from '$lib/server/auth';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

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
export const handle = sequence(handleSession);
