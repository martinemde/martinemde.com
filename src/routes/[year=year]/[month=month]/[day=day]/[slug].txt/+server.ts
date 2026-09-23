import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRawPost } from '$lib/utils/posts';

/**
 * Serves a post's raw markdown as text/plain.
 * Uses +server.ts (not +page.ts) because this returns raw text with a custom
 * Content-Type header, not an HTML page.
 */
export const GET: RequestHandler = async ({ params }) => {
  const { year, month, day, slug } = params;
  const content = getRawPost(`/${year}/${month}/${day}/${slug}`);

  if (!content) {
    throw error(404, `Post not found: ${slug}`);
  }

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
};
