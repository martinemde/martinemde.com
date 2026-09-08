import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { getPostBySlug } from '$lib/utils/posts';

export const load: PageLoad = async ({ params }) => {
  const { slug } = params;

  const post = await getPostBySlug(slug);

  if (!post) {
    throw error(404, `Post not found: ${slug}`);
  }

  return post;
};

// Rendered by the Worker rather than prerendered, so that the request's Accept
// header can pick between the HTML page and the raw markdown of the same post.
// See the article negotiation handle in src/hooks.server.ts.
export const prerender = false;
