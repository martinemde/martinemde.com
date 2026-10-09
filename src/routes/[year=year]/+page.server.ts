import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';
import { getAllPosts, getYearEntries } from '#lib/utils/posts.ts';
import { dayPath } from '#lib/utils/post-model.ts';

export const entries: EntryGenerator = async () =>
  [
    ...new Set((await getAllPosts()).map((post) => dayPath(post).split('/').slice(0, 2).join('/')))
  ].map((path) => {
    const [, year] = path.split('/');
    return { year };
  });

export const load: PageServerLoad = async ({ params }) => {
  const { year } = params;
  const entries = await getYearEntries(`/${year}`);
  if (!entries.length) throw error(404, 'Nothing posted that year');
  return { posts: entries.map((entry) => entry.metadata) };
};
