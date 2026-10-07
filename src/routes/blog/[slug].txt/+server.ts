import type { RequestHandler } from './$types';
import { redirectLegacyPost } from '#lib/server/post-endpoints.ts';

/** Legacy URL; the post now lives at its dated permalink. */
export const GET: RequestHandler = async ({ params }) => redirectLegacyPost(params.slug, '.txt');
