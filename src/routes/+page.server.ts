import type { PageServerLoad } from './$types';
import { getRecentPosts } from '#lib/utils/posts.ts';

export const prerender = true;

export const load: PageServerLoad = async () => ({
  recentPosts: await getRecentPosts(20)
});
