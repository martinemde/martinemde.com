import type { PageServerLoad } from './$types';
import { getArticles } from '#lib/utils/posts.ts';

export const load = (async () => ({ posts: await getArticles() })) satisfies PageServerLoad;
