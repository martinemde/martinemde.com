import type { RequestHandler } from './$types';
import { monthMarkdown } from '#lib/server/markdown-pages.ts';

// Prerendered so the CDN serves a static file instead of running the Worker.
export const prerender = true;
// The same entries as the HTML page.
export { entries } from '../[month=month]/+page.server.ts';

/** A month's entries as plain Markdown, grouped by day. */
export const GET: RequestHandler = ({ params }) => monthMarkdown(params.year, params.month);
