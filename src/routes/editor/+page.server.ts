import { getSession } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

// Disable prerendering for editor - needs runtime session management
export const prerender = false;

export const load: PageServerLoad = async (event) => {
  const session = await getSession(event);

  return {
    user: session.user || null,
    isAuthenticated: !!session.user
  };
};
