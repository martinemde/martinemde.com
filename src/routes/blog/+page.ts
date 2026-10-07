import type { PageLoad } from './$types';
import { getArticles } from '#lib/utils/posts.ts';

export const load: PageLoad = async () => {
  const posts = await getArticles();

  return {
    posts
  };
};
