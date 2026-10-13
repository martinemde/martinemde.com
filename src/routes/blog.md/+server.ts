import type { RequestHandler } from './$types';
import { blogMarkdown } from '#lib/server/markdown-pages.ts';

/** The article list as plain Markdown. */
export const GET: RequestHandler = () => blogMarkdown();
