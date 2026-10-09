import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';
import { getAllPosts, getMonthEntries } from '#lib/utils/posts.ts';
import { dayPath } from '#lib/utils/post-model.ts';

export const entries: EntryGenerator = async () =>
  [
    ...new Set((await getAllPosts()).map((post) => dayPath(post).split('/').slice(0, 3).join('/')))
  ].map((path) => {
    const [, year, month] = path.split('/');
    return { year, month };
  });

export const load: PageServerLoad = async ({ params }) => {
  const { year, month } = params;
  const entries = await getMonthEntries(`/${year}/${month}`);
  if (!entries.length) throw error(404, 'Nothing posted that month');
  return { posts: entries.map((entry) => entry.metadata) };
};
