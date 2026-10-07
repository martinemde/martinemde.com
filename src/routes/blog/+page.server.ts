import type { PageServerLoad } from './$types';
import { getArticles } from '#lib/utils/posts.ts';

export const load = (async () => {
  const posts = await getArticles();

  return {
    posts
  };
}) satisfies PageServerLoad;
