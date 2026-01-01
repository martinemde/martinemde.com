import type { PageLoad } from './$types';

// Disable prerendering for editor - needs runtime session management
export const prerender = false;

// Enable CSR for client-side features (preview, etc.)
export const csr = true;

export const load: PageLoad = async () => {
  // Page data can be loaded here if needed
  return {};
};
