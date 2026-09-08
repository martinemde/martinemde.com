import type { RequestHandler } from './$types';
import { rawPostResponse } from '$lib/utils/raw-post-response';

/**
 * API endpoint for serving raw markdown content.
 * Uses +server.ts (not +page.ts) because this returns raw text with custom
 * Content-Type headers, not an HTML page. The exact type is negotiated from
 * Accept, so the response carries Vary: Accept.
 */
export const GET: RequestHandler = async ({ params, request }) =>
  rawPostResponse(params.slug, request.headers.get('accept'));
