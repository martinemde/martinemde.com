import { error, redirect } from '@sveltejs/kit';
import { getPostBySlug, getRawPost } from '#lib/utils/posts.ts';

/** Both dated raw endpoints serve the unchanged source, including drafts. */
export function rawPostResponse(params: {
  year: string;
  month: string;
  day: string;
  slug: string;
}) {
  const { year, month, day, slug } = params;
  const content = getRawPost(`/${year}/${month}/${day}/${slug}`);
  if (!content) throw error(404, `Post not found: ${slug}`);

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

/** A missing or ambiguous legacy slug retains the same 404 behavior. */
export function redirectLegacyPost(slug: string, suffix: '' | '.txt' | '.md' = ''): never {
  const post = getPostBySlug(slug);
  if (!post) throw error(404, `Post not found: ${slug}`);
  throw redirect(301, `${post.permalink}${suffix}`);
}
