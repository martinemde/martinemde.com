import type { PageServerLoad } from './$types';
import { getAllPosts } from '#lib/utils/posts.ts';

export const load: PageServerLoad = async () => ({ posts: await getAllPosts() });
