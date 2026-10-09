/**
 * Compiled post components, loaded on demand.
 *
 * Kept apart from posts.ts so universal loaders don't pull every post (and its
 * raw Markdown) into the client bundle: each post becomes its own chunk, and a
 * page fetches only the posts it renders. Keys match posts.ts's `path`.
 */

import type { Component } from 'svelte';

const components = import.meta.glob<Component>('../../content/blog/*.{md,svx}', {
  import: 'default'
});

export async function loadPostContent(path: string): Promise<Component> {
  const load = components[path];
  if (!load) throw new Error(`No post component for ${path}`);
  return load();
}

/** Pair each post's metadata with its compiled body, in parallel. */
export function withContent<T extends { path: string }>(
  posts: T[]
): Promise<{ metadata: T; content: Component }[]> {
  return Promise.all(
    posts.map(async (metadata) => ({ metadata, content: await loadPostContent(metadata.path) }))
  );
}
