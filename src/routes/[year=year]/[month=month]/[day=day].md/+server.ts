import type { RequestHandler } from './$types';
import { dayMarkdown } from '#lib/server/markdown-pages.ts';

// Prerendered so the CDN serves a static file instead of running the Worker.
export const prerender = true;
// The same entries as the HTML page.
export { entries } from '../[day=day]/+page.server.ts';

/** One day's entries as plain Markdown. */
export const GET: RequestHandler = ({ params }) =>
  dayMarkdown(params.year, params.month, params.day);
