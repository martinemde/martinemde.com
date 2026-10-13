import type { RequestHandler } from './$types';
import { streamMarkdown } from '#lib/server/markdown-pages.ts';

/** Every published entry as plain Markdown, grouped by day. */
export const GET: RequestHandler = () => streamMarkdown();
