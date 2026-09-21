import type { PageLoad } from './$types';
import { getStreamEntries } from '$lib/utils/posts';

export const prerender = true;

export const load: PageLoad = async () => ({
  recentEntries: await getStreamEntries(20)
});
