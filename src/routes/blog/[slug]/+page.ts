import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { getPostBySlug, getPublishedSlugs } from '$lib/utils/posts';

export const entries = () => getPublishedSlugs().map((slug) => ({ slug }));

export const load: PageLoad = async ({ params }) => {
  const { slug } = params;

  const post = await getPostBySlug(slug);

  if (!post) {
    throw error(404, `Post not found: ${slug}`);
  }

  return post;
};
