import type { RequestHandler } from './$types';
import { streamMarkdown } from '#lib/server/markdown-pages.ts';

// Prerendered so the CDN serves a static file instead of running the Worker.
export const prerender = true;

/** Every published entry as plain Markdown, grouped by day. */
export const GET: RequestHandler = () => streamMarkdown();
