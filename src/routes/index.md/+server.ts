import type { RequestHandler } from './$types';
import { homeMarkdown } from '#lib/server/markdown-pages.ts';

// Prerendered so the CDN serves a static file instead of running the Worker.
export const prerender = true;

/** The homepage as plain Markdown, linking to the other .md views. */
export const GET: RequestHandler = () => homeMarkdown();
