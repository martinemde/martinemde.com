import type { RequestHandler } from './$types';
import { yearMarkdown } from '#lib/server/markdown-pages.ts';

// Prerendered so the CDN serves a static file instead of running the Worker.
export const prerender = true;
// The same entries as the HTML page.
export { entries } from '../[year=year]/+page.server.ts';

/** A year's entries as plain Markdown, grouped by month and day. */
export const GET: RequestHandler = ({ params }) => yearMarkdown(params.year);
