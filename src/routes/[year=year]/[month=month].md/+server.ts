import type { RequestHandler } from './$types';
import { monthMarkdown } from '#lib/server/markdown-pages.ts';

/** A month's entries as plain Markdown, grouped by day. */
export const GET: RequestHandler = ({ params }) => monthMarkdown(params.year, params.month);
