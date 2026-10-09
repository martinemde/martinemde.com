import type { PageLoad } from './$types';
import { withContent } from '#lib/utils/post-content.ts';

export const load: PageLoad = async ({ data }) => ({ entries: await withContent(data.posts) });
