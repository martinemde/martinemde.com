import type { RequestHandler } from './$types';
import { rawPostResponse } from '#lib/server/post-endpoints.ts';

// Published entries are prerendered as static files; 'auto' keeps drafts served on demand.
export const prerender = 'auto';
// The same entries as the HTML page.
export { entries } from '../[slug]/+page.server.ts';

/** Serves the post's raw markdown as text/plain, not an HTML page. */
export const GET: RequestHandler = async ({ params }) => rawPostResponse(params);
