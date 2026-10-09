import type { PageLoad } from './$types';
import { loadPostContent } from '#lib/utils/post-content.ts';

export const load: PageLoad = async ({ data }) => ({
  metadata: data.metadata,
  content: await loadPostContent(data.path)
});
