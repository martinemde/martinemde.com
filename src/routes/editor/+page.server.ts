import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Redirect to login if not authenticated
  if (!locals.user || !locals.githubToken) {
    redirect(302, '/auth/login');
  }

  return {
    user: locals.user
  };
};

// Disable prerendering for this page
export const prerender = false;
