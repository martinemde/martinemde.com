import type { PageLoad } from './$types';
import { getRecentPosts } from '$lib/utils/posts';

// Prerender the page at build time with the latest posts
export const prerender = true;

export const load: PageLoad = async () => {
  // Load the 3 most recent blog posts for the homepage "Writing" section
  const recentPosts = await getRecentPosts(3);

  return {
    recentPosts
  };
};
