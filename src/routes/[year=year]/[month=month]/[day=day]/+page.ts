import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from './$types';
import { dayPath, getAllPosts, getDayEntries } from '$lib/utils/posts';

export const entries: EntryGenerator = async () =>
  [...new Set((await getAllPosts()).map(dayPath))].map((path) => {
    const [, year, month, day] = path.split('/');
    return { year, month, day };
  });

export const load: PageLoad = async ({ params }) => {
  const { year, month, day } = params;
  const entries = await getDayEntries(`/${year}/${month}/${day}`);
  if (!entries.length) throw error(404, 'Nothing posted that day');
  return { entries };
};
