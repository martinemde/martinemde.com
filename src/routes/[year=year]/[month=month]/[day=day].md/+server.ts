import type { RequestHandler } from './$types';
import { dayMarkdown } from '#lib/server/markdown-pages.ts';

/** One day's entries as plain Markdown. */
export const GET: RequestHandler = ({ params }) =>
  dayMarkdown(params.year, params.month, params.day);
