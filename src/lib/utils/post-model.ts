/** The stored Markdown body is the published content; Micropub supplies its semantics. */
export type PostType = 'article' | 'note' | 'bookmark' | 'photo';

/** Permalinks and day pages follow the author's Pacific calendar. */
export const SITE_TIME_ZONE = 'America/Los_Angeles';

export interface PostMetadata {
  title: string;
  date: Date;
  dateOnly?: boolean;
  updated?: Date;
  author?: string;
  description?: string;
  published: boolean;
  slug: string;
  /** /YYYY/MM/DD/slug, dated by the filename prefix the publisher writes. */
  permalink: `/${string}/${string}/${string}/${string}`;
  image?: string;
  tags: string[];
  type: PostType;
  photo: { value: string; alt: string }[];
  bookmarkOf?: string;
  /** Photos the body doesn't already show, rendered above it. */
  leadPhotos: { value: string; alt: string }[];
  /** The bookmark-of URL when the body doesn't already link it, rendered below it. */
  bookmarkLink?: string;
  excerpt: string;
}

/** Metadata enriched once by the post loader, not by display components. */
export interface LoadedPostMetadata extends PostMetadata {
  readingTime: string;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function values(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined ? [] : [value];
}

function text(value: unknown): string | undefined {
  return values(value)
    .find((item): item is string => typeof item === 'string' && !!item.trim())
    ?.trim();
}

function date(value: unknown): Date | undefined {
  const input = values(value)[0];
  if (input instanceof Date) return Number.isFinite(input.getTime()) ? input : undefined;
  if (typeof input !== 'string') return undefined;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(input)
    ? // Date-only legacy entries have no known time. Use a stable anchor for sorting.
      new Date(`${input}T12:00:00Z`)
    : new Date(input);
  return Number.isFinite(parsed.getTime()) ? parsed : undefined;
}

export function markdownBody(source: string): string {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').trim();
}

function plainText(source: string): string {
  return source
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function httpUrl(value: unknown): string | undefined {
  const url = text(value);
  if (!url) return undefined;
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}

/** Whether a body already links (or shows) a URL, in Markdown or HTML. */
function referencesUrl(body: string, url: string, attribute: 'href' | 'src'): boolean {
  const escaped = url.replace(/&/g, '&amp;');
  return [`](${url})`, `<${url}>`, `${attribute}="${url}"`, `${attribute}="${escaped}"`].some(
    (form) => body.includes(form)
  );
}

function siteDay(date: Date): string[] {
  return date.toLocaleDateString('en-CA', { timeZone: SITE_TIME_ZONE }).split('-');
}

export function normalizePostMetadata(
  metadata: unknown,
  path: string,
  source: string
): PostMetadata {
  // Front matter keys are Micropub property names (name, published, summary, …).
  const props = record(metadata);
  const title = text(props.name) ?? '';
  const publicationValue = props.published;
  const publishedAt = date(publicationValue);
  const status = text(props['post-status']);
  const photo = values(props.photo).flatMap((item) => {
    const object = record(item);
    const value = httpUrl(typeof item === 'string' ? item : object.value);
    return value ? [{ value, alt: text(object.alt) ?? '' }] : [];
  });
  const bookmarkOf = httpUrl(props['bookmark-of']);
  const filename = path.split('/').pop()!;
  const slug = text(props.slug) ?? filename.replace(/\.(md|svx)$/, '');
  const day =
    filename.match(/^(\d{4})-(\d{2})-(\d{2})-/)?.slice(1) ?? siteDay(publishedAt ?? new Date(0));
  const body = markdownBody(source);
  const content = plainText(body);
  const normalizedName = plainText(title);
  const type: PostType = bookmarkOf
    ? 'bookmark'
    : photo.length
      ? 'photo'
      : normalizedName && content && !content.startsWith(normalizedName)
        ? 'article'
        : 'note';
  const tags = [
    ...new Set(
      values(props.category)
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ];
  return {
    title,
    date: publishedAt ?? new Date(0),
    dateOnly: /^\d{4}-\d{2}-\d{2}$/.test(String(values(publicationValue)[0])),
    updated: date(props.updated),
    slug,
    permalink: `/${day[0]}/${day[1]}/${day[2]}/${slug}`,
    author: text(props.author) ?? 'Martin Emde',
    description: text(props.summary),
    published:
      !!publishedAt &&
      (status ?? 'published') === 'published' &&
      text(props.visibility) !== 'private' &&
      text(props.visibility) !== 'unlisted',
    image: text(props.featured),
    tags,
    type,
    photo,
    bookmarkOf,
    leadPhotos: photo.filter((item) => !referencesUrl(body, item.value, 'src')),
    bookmarkLink: bookmarkOf && !referencesUrl(body, bookmarkOf, 'href') ? bookmarkOf : undefined,
    excerpt: content.length > 240 ? `${content.slice(0, 240)}…` : content
  };
}

const markdownText = (value: string) => value.replace(/[\\[\]]/g, '\\$&').replace(/\s+/g, ' ');

/**
 * The published Markdown of a post: its body with the photos and bookmark it
 * keeps as properties written around it, photos first. The HTML pages render
 * the same `leadPhotos` and `bookmarkLink` around the compiled body.
 */
export function publishedMarkdown(
  post: Pick<PostMetadata, 'leadPhotos' | 'bookmarkLink'>,
  body: string
): string {
  const photos = post.leadPhotos.map(
    (photo) =>
      `![${markdownText(photo.alt)}](${photo.value.replaceAll('(', '%28').replaceAll(')', '%29')})`
  );
  const bookmark = post.bookmarkLink && `<${post.bookmarkLink}>`;
  return [...photos, body, bookmark].filter(Boolean).join('\n\n');
}

/** The day page containing a post, e.g. /2026/07/21 */
export function dayPath(post: Pick<PostMetadata, 'permalink'>): `/${string}/${string}/${string}` {
  return post.permalink.slice(
    0,
    post.permalink.lastIndexOf('/')
  ) as `/${string}/${string}/${string}`;
}

export function postDisplayTitle(post: PostMetadata): string {
  return (
    post.title || post.excerpt || post.bookmarkOf || (post.type === 'photo' ? 'Photo' : 'Note')
  );
}
