import type { RequestHandler } from './$types';
import { yearMarkdown } from '#lib/server/markdown-pages.ts';

/** A year's entries as plain Markdown, grouped by month and day. */
export const GET: RequestHandler = ({ params }) => yearMarkdown(params.year);
