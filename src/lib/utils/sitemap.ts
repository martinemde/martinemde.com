/**
 * Builds the list of indexable URLs for /sitemap.xml
 *
 * Static pages are discovered from the route tree so new pages are listed
 * automatically; anything that should stay out of the index has to be named
 * in EXCLUDED_PREFIXES below.
 */

import { getAllPosts, type PostMetadata } from './posts';

export interface SitemapEntry {
  /** Site-root-relative path, e.g. `/blog` */
  path: string;
  /** Last modification date, omitted when there is no trustworthy value */
  lastmod?: Date;
}

/**
 * Routes that exist but must not be indexed.
 * A prefix matches the path itself and everything below it.
 */
const EXCLUDED_PREFIXES = [
  '/auth' // OAuth callback routes
];

/**
 * Pages built from blog posts, so they change whenever a post does.
 */
const POST_DRIVEN_PATHS = new Set(['/', '/blog']);

/**
 * Route modules are only used for their paths; the thunks are never called.
 */
const pageFiles = import.meta.glob(['/src/routes/**/+page.svelte', '/src/routes/+page.svelte']);

const ROUTES_DIR = '/src/routes';

/**
 * Turn a route file path into the URL path it serves
 * `/src/routes/blog/+page.svelte` -> `/blog`
 * `/src/routes/+page.svelte` -> `/`
 */
function routeFileToPath(file: string): string {
  const route = file.slice(ROUTES_DIR.length).replace(/\/\+page\.svelte$/, '');
  // Layout groups are not part of the URL, e.g. `/(marketing)/about` -> `/about`
  const path = route.replace(/\/\([^/]*\)/g, '');
  return path === '' ? '/' : path;
}

function isExcluded(path: string): boolean {
  return EXCLUDED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * A post's last modification date: the `updated` frontmatter field when the
 * post has been revised, otherwise its publication date.
 */
export function getPostLastModified(post: PostMetadata): Date {
  return post.updated ?? post.date;
}

/**
 * All indexable static page paths, sorted, with dynamic routes excluded.
 * Dynamic routes ([slug], [...segments]) are enumerated from their data source
 * instead, or not indexed at all.
 */
export function getStaticPaths(): string[] {
  return Object.keys(pageFiles)
    .map(routeFileToPath)
    .filter((path) => !path.includes('['))
    .filter((path) => !isExcluded(path))
    .sort();
}

/**
 * Every indexable URL on the site, static pages first, then blog posts.
 *
 * Only pages whose content has a machine-readable date carry a `lastmod`.
 * Hand-written pages omit it rather than report the build time, which would
 * mark every page as modified on every deploy and get the value discounted.
 */
export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const posts = await getAllPosts();

  const latestPostChange = posts.length
    ? new Date(Math.max(...posts.map((post) => getPostLastModified(post).getTime())))
    : undefined;

  const staticEntries: SitemapEntry[] = getStaticPaths().map((path) => ({
    path,
    lastmod: POST_DRIVEN_PATHS.has(path) ? latestPostChange : undefined
  }));

  const postEntries: SitemapEntry[] = posts.map((post) => ({
    path: `/blog/${post.slug}`,
    lastmod: getPostLastModified(post)
  }));

  return [...staticEntries, ...postEntries];
}
