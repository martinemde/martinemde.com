import { redirect } from '@sveltejs/kit';
import { clearSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
  // Clear session cookie
  clearSession(event);

  // Redirect to home
  redirect(302, '/editor');
};
