import type { RequestHandler } from './$types';
import { blogMarkdown } from '#lib/server/markdown-pages.ts';

// Prerendered so the CDN serves a static file instead of running the Worker.
export const prerender = true;

/** The article list as plain Markdown. */
export const GET: RequestHandler = () => blogMarkdown();
