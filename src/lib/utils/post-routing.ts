import type { PostMetadata } from './post-model.ts';

/** Use the canonical permalink, not the publication instant, for dated route parameters. */
export function postRouteParams(post: Pick<PostMetadata, 'permalink'>) {
  const match = /^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)$/.exec(post.permalink);
  if (!match) throw new Error(`Invalid post permalink: ${post.permalink}`);
  const [, year, month, day, slug] = match;
  return { year, month, day, slug };
}
