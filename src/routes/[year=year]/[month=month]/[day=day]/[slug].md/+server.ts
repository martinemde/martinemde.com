import type { RequestHandler } from './$types';
import { postMarkdown } from '#lib/server/markdown-pages.ts';

/** The post's markdown source with a navigation footer, as text/plain. */
export const GET: RequestHandler = async ({ params }) => postMarkdown(params);
