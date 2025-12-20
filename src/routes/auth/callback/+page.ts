import type { PageLoad } from './$types';

// Disable prerendering for this route (needs to read URL params)
export const prerender = false;

// Enable client-side rendering (requires browser APIs)
export const csr = true;

/**
 * OAuth callback page loader
 * Extracts authorization code and error from URL parameters
 */
export const load: PageLoad = async ({ url }) => {
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  return {
    code,
    error
  };
};
