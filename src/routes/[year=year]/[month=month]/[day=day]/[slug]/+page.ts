import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { getPost, getPublishedPermalinks } from '$lib/utils/posts';

// 'auto' keeps a server fallback for legacy .html URLs that aren't prerendered.
export const prerender = 'auto';

export const entries = () =>
  getPublishedPermalinks().map((permalink) => {
    const [, year, month, day, slug] = permalink.split('/');
    return { year, month, day, slug };
  });

export const load: PageLoad = async ({ params }) => {
  const { year, month, day, slug } = params;
  const permalink = `/${year}/${month}/${day}/${slug}`;

  if (slug.endsWith('.html')) throw redirect(301, permalink.slice(0, -'.html'.length));

  const post = await getPost(permalink);
  if (!post) throw error(404, `Post not found: ${permalink}`);

  return post;
};
