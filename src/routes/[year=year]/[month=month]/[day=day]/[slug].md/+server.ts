import type { RequestHandler } from './$types';
import { rawPostResponse } from '#lib/server/post-endpoints.ts';

/** Serves the post's raw markdown as text/plain, not an HTML page. */
export const GET: RequestHandler = async ({ params }) => rawPostResponse(params);
