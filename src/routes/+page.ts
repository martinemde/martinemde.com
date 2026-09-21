import type { PageLoad } from './$types';
import { getArticles, getStreamEntries } from '$lib/utils/posts';

// Prerender the page at build time with the latest posts
export const prerender = true;

export const load: PageLoad = async () => {
  // Load the 3 most recent blog posts for the homepage "Writing" section
  const recentPosts = (await getArticles()).slice(0, 3);

  return {
    recentPosts,
    recentEntries: (await getStreamEntries())
      .filter((entry) => entry.metadata.type !== 'article')
      .slice(0, 3)
  };
};
