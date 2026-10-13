import type { RequestHandler } from './$types';
import { homeMarkdown } from '#lib/server/markdown-pages.ts';

/** The homepage as plain Markdown, linking to the other .md views. */
export const GET: RequestHandler = () => homeMarkdown();
