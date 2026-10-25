import { error } from '@sveltejs/kit';
import { stringify } from 'yaml';
import { PUBLIC_APP_URL } from '$app/env/public';
import { projects } from '#lib/data/projects.ts';
import {
  getAllPosts,
  getAdjacentPosts,
  getArticles,
  getDayEntries,
  getMonthEntries,
  getPost,
  getPublishedPermalinks,
  getRawPost,
  getRecentPosts,
  getYearEntries,
  type Post
} from '#lib/utils/posts.ts';
import {
  dayPath,
  markdownBody,
  publishedMarkdown,
  type PostMetadata
} from '#lib/utils/post-model.ts';
import { formatPostDateShort, formatPostDay, formatPostTime } from '#lib/utils/post-format.ts';

/**
 * Plain Markdown twins of the index pages (/index.md, /stream.md, /blog.md and
 * the /YYYY, /YYYY/MM, /YYYY/MM/DD archives). Headings carry the hierarchy:
 * page, then month, day, entry. Every link points at another .md view, so a
 * reader can navigate the whole site without leaving plain text.
 */

type Entry = PostMetadata & { readingTime?: string };
type Level = 1 | 2 | 3 | 4 | 5 | 6;

const url = (path: string) => `${PUBLIC_APP_URL}${path}`;
const mdUrl = (path: string) => url(path === '/' ? '/index.md' : `${path}.md`);
const heading = (level: number, text: string) => `${'#'.repeat(Math.min(level, 6))} ${text}`;
const link = (text: string, path: string) => `[${escapeText(text)}](${mdUrl(path)})`;

/** Keep titles from turning into accidental Markdown structure inside link text. */
function escapeText(text: string): string {
  return text.replace(/[\\[\]]/g, '\\$&').replace(/\s+/g, ' ');
}

/** Apply a transform to each line outside fenced code blocks. */
function eachProseLine(markdown: string, transform: (line: string) => string): string {
  let fence: string | null = null;
  return markdown
    .split('\n')
    .map((line) => {
      const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (marker && (!fence || marker.startsWith(fence))) {
        fence = fence ? null : marker;
        return line;
      }
      return fence ? line : transform(line);
    })
    .join('\n');
}

/** Push an embedded body's headings below the entry heading. */
export function demoteHeadings(markdown: string, by: number): string {
  return eachProseLine(markdown, (line) =>
    line.replace(
      /^( {0,3})(#{1,6})(?=\s|$)/,
      (_, indent, hashes) => indent + '#'.repeat(Math.min(hashes.length + by, 6))
    )
  );
}

/** A site path for an internal link, whether written relative or with the site's origin. */
function sitePath(href: string): string | undefined {
  for (const origin of new Set([PUBLIC_APP_URL, 'https://martinemde.com'])) {
    if (origin && href.startsWith(`${origin}/`)) return href.slice(origin.length);
  }
  return href.startsWith('/') && !href.startsWith('//') ? href : undefined;
}

/**
 * Point links to other entries at their .md views, so a Markdown reader
 * following them stays on the Markdown web.
 */
export function markdownLinks(markdown: string): string {
  const permalinks = new Set(getPublishedPermalinks());
  return eachProseLine(markdown, (line) =>
    line.replace(/(\]\(|<)([^()<>\s]+)(?=[)>\s])/g, (match, open: string, href: string) => {
      const path = sitePath(href)?.replace(/\/$/, '');
      return path && permalinks.has(path) ? `${open}${mdUrl(path)}` : match;
    })
  );
}

/**
 * A post body as the Markdown web expects it: its photos and bookmark written
 * around it, Markdown links and images rather than HTML.
 */
const bodyMarkdown = (post: PostMetadata, source: string) =>
  markdownLinks(publishedMarkdown(post, markdownBody(source)));

function pageMarkdown(blocks: (string | false | undefined)[]): Response {
  const body = `${blocks.filter(Boolean).join('\n\n').trim()}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

function nav(htmlPath: string): string {
  return [
    `[Stream](${mdUrl('/stream')})`,
    `[Blog](${mdUrl('/blog')})`,
    `[RSS](${url('/rss.xml')})`,
    `[HTML version](${url(htmlPath)})`
  ].join(' · ');
}

/** Archive breadcrumb, mirroring the HTML pages: ~ / 2026 / 10 / 12 */
function breadcrumb(path: string): string {
  const parts = path.split('/').filter(Boolean);
  const crumbs = parts.map((part, index) =>
    index === parts.length - 1 ? part : link(part, `/${parts.slice(0, index + 1).join('/')}`)
  );
  return [link('~', '/'), ...crumbs].join(' / ');
}

function entryMarkdown(post: Entry, level: Level): string {
  const time = formatPostTime(post.date, post.dateOnly);
  if (post.type === 'article') {
    const meta = [time, post.readingTime].filter(Boolean).join(' · ');
    return [
      heading(level, link(post.title, post.permalink)),
      `*${meta}*`,
      post.description || post.excerpt
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  // Untitled entries are named by their time, so every entry has a heading to navigate by.
  const body = demoteHeadings(bodyMarkdown(post, getRawPost(post.permalink) ?? ''), level);
  return [heading(level, link(post.title || time, post.permalink)), post.title && `*${time}*`, body]
    .filter(Boolean)
    .join('\n\n');
}

function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return [...groups];
}

/** Entries grouped under a heading per day, each day linking to its own page. */
function daysMarkdown(posts: Entry[], level: Level): string {
  return groupBy(posts, dayPath)
    .map(([day, entries]) =>
      [
        heading(level, link(formatPostDay(entries[0].date, entries[0].dateOnly), day)),
        ...entries.map((post) => entryMarkdown(post, (level + 1) as Level))
      ].join('\n\n')
    )
    .join('\n\n');
}

function monthName(path: string): string {
  const [, year, month] = path.split('/');
  return new Date(Date.UTC(Number(year), Number(month) - 1, 15)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

const metadata = (entries: { metadata: PostMetadata }[]) => entries.map((entry) => entry.metadata);

export async function homeMarkdown(): Promise<Response> {
  const featured = projects.slice(0, 4);
  return pageMarkdown([
    heading(1, 'Martin Emde'),
    'AI Developer Tools Engineer at [Gusto](https://gusto.com).',
    nav('/'),
    heading(2, 'Recently'),
    daysMarkdown(await getRecentPosts(20), 3),
    `[Full stream](${mdUrl('/stream')})`,
    heading(2, 'Selected projects'),
    featured
      .map((project) => {
        const href = project.url.startsWith('/') ? url(project.url) : project.url;
        return `- [${escapeText(project.name)}](${href}): ${project.description}`;
      })
      .join('\n'),
    `[All projects](${url('/projects')})`,
    heading(2, 'Elsewhere'),
    [
      '- [GitHub: @martinemde](https://github.com/martinemde)',
      '- [Bluesky: @martinemde.com](https://bsky.app/profile/martinemde.com)',
      `- [Dead HTML webring](${url('/deadhtml')})`
    ].join('\n')
  ]);
}

export async function streamMarkdown(): Promise<Response> {
  return pageMarkdown([
    breadcrumb('/stream'),
    heading(1, 'Stream'),
    'Notes, links, and things worth sharing.',
    nav('/stream'),
    daysMarkdown(await getAllPosts(), 2)
  ]);
}

export async function blogMarkdown(): Promise<Response> {
  const posts = await getArticles();
  return pageMarkdown([
    breadcrumb('/blog'),
    heading(1, 'Blog'),
    'Notes on the intersection between developer tooling, AI, and a life spent telling computers what to do.',
    nav('/blog'),
    ...posts.map((post: Post) =>
      [
        heading(2, link(post.title, post.permalink)),
        `*${[formatPostDateShort(post.date, post.dateOnly), post.readingTime].join(' · ')}*`,
        post.description || post.excerpt,
        post.tags.length > 0 && `Tags: ${post.tags.join(', ')}`
      ]
        .filter(Boolean)
        .join('\n\n')
    )
  ]);
}

export async function yearMarkdown(year: string): Promise<Response> {
  const posts = metadata(await getYearEntries(`/${year}`));
  if (!posts.length) error(404, 'Nothing posted that year');
  const months = groupBy(posts, (post) => dayPath(post).slice(0, 8));
  return pageMarkdown([
    breadcrumb(`/${year}`),
    heading(1, year),
    ...months.map(([month, entries]) =>
      [heading(2, link(monthName(month), month)), daysMarkdown(entries, 3)].join('\n\n')
    ),
    nav(`/${year}`)
  ]);
}

export async function monthMarkdown(year: string, month: string): Promise<Response> {
  const path = `/${year}/${month}`;
  const posts = metadata(await getMonthEntries(path));
  if (!posts.length) error(404, 'Nothing posted that month');
  return pageMarkdown([
    breadcrumb(path),
    heading(1, monthName(path)),
    daysMarkdown(posts, 2),
    nav(path)
  ]);
}

export async function dayMarkdown(year: string, month: string, day: string): Promise<Response> {
  const path = `/${year}/${month}/${day}`;
  const posts = metadata(await getDayEntries(path));
  if (!posts.length) error(404, 'Nothing posted that day');
  return pageMarkdown([
    breadcrumb(path),
    heading(1, formatPostDay(posts[0].date, posts[0].dateOnly)),
    ...posts.map((post) => entryMarkdown(post, 2)),
    nav(path)
  ]);
}

/**
 * The stored front matter, then what only the site knows: the feed it belongs
 * to (the Markdown web's `source`) and its neighbors, keyed by IANA link
 * relation as HTML's link rel names them: prev (older), next (newer), up (its
 * day) and home (the home page).
 */
function frontMatter(permalink: string, source: string, newer?: Post, older?: Post): string {
  const stored = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)?.[1];
  const site = stringify({
    source: { url: url('/rss.xml'), title: 'Martin Emde' },
    ...(older && { prev: mdUrl(older.permalink) }),
    ...(newer && { next: mdUrl(newer.permalink) }),
    up: mdUrl(permalink.slice(0, permalink.lastIndexOf('/'))),
    home: mdUrl('/')
  });
  return ['---', stored, site.trimEnd(), '---'].filter(Boolean).join('\n');
}

/**
 * A post as a Markdown web document: the stored file with the site's keys added
 * to its front matter and its photos and bookmark written into the body, then a
 * footer with a breadcrumb up to its day and the site nav. Drafts get no
 * prev/next. The .txt URL serves the stored file.
 */
export async function postMarkdown(params: {
  year: string;
  month: string;
  day: string;
  slug: string;
}): Promise<Response> {
  const { year, month, day, slug } = params;
  const permalink = `/${year}/${month}/${day}/${slug}`;
  const post = await getPost(permalink);
  const source = getRawPost(permalink);
  if (!post || !source) throw error(404, `Post not found: ${slug}`);
  const { newer, older } = await getAdjacentPosts(permalink);
  // Newer and older entries are next and prev in the front matter.
  const footer = ['---', breadcrumb(permalink), nav(permalink)];
  // The blank line keeps the rule from turning the body's last line into a heading.
  const document = [
    frontMatter(permalink, source, newer, older),
    bodyMarkdown(post.metadata, source),
    ...footer
  ];
  return new Response(`${document.filter(Boolean).join('\n\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
