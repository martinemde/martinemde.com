import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRawPostBySlug } from '$lib/utils/posts';

/**
 * API endpoint for serving raw markdown content as text/plain
 * Uses +server.ts (not +page.ts) because this returns raw text with custom
 * Content-Type headers, not an HTML page
 */
export const GET: RequestHandler = async ({ params }) => {
  const { slug } = params;

  const content = getRawPostBySlug(slug);

  if (!content) {
    throw error(404, `Post not found: ${slug}`);
  }

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
};
