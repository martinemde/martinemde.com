import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPostBySlug } from '$lib/utils/posts';

/** Legacy /blog/slug URL; the post now lives at its dated permalink. */
export const GET: RequestHandler = async ({ params }) => {
  const post = getPostBySlug(params.slug);
  if (!post) throw error(404, `Post not found: ${params.slug}`);
  throw redirect(301, post.permalink);
};
