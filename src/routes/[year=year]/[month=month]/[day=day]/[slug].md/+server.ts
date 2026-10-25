import type { RequestHandler } from './$types';
import { postMarkdown } from '#lib/server/markdown-pages.ts';

// Published entries are prerendered as static files; 'auto' keeps drafts served on demand.
export const prerender = 'auto';
// The same entries as the HTML page.
export { entries } from '../[slug]/+page.server.ts';

/** The post's markdown source with a navigation footer, as text/plain. */
export const GET: RequestHandler = async ({ params }) => postMarkdown(params);
