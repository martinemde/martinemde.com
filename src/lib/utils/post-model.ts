/** The stored Markdown body is the published content; Micropub supplies its semantics. */
export type PostType = 'article' | 'note' | 'bookmark' | 'photo';

export interface PostMetadata {
  title: string;
  date: Date;
  dateOnly?: boolean;
  updated?: Date;
  author?: string;
  description?: string;
  published: boolean;
  slug: string;
  image?: string;
  tags: string[];
  type: PostType;
  photo: { value: string; alt: string }[];
  bookmarkOf?: string;
  excerpt: string;
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

export function normalizePostMetadata(
  metadata: unknown,
  path: string,
  source: string
): PostMetadata {
  const meta = record(metadata);
  const micropub = record(meta.micropub);
  const hasMicropub = !!micropub.properties && typeof micropub.properties === 'object';
  const props = hasMicropub ? record(micropub.properties) : meta;
  // An absent Micropub name means untitled, even if the legacy wrapper says "Untitled Post".
  const title = text(props.name) ?? (hasMicropub ? '' : (text(meta.title) ?? ''));
  const publicationValue = date(props.published) ? props.published : meta.date;
  const publishedAt = date(publicationValue);
  const status = text(props['post-status']);
  const photo = values(props.photo).flatMap((item) => {
    const object = record(item);
    const value = httpUrl(typeof item === 'string' ? item : object.value);
    return value ? [{ value, alt: text(object.alt) ?? '' }] : [];
  });
  const bookmarkOf = httpUrl(props['bookmark-of']);
  const body = markdownBody(source);
  const originalContent = values(props.content)[0];
  const originalText =
    typeof originalContent === 'string'
      ? originalContent
      : (text(record(originalContent).html) ?? text(record(originalContent).text));
  const content = plainText(body);
  const discoveryContent = plainText(originalText ?? body);
  const normalizedName = plainText(title);
  const type: PostType = bookmarkOf
    ? 'bookmark'
    : photo.length
      ? 'photo'
      : normalizedName && discoveryContent && !discoveryContent.startsWith(normalizedName)
        ? 'article'
        : 'note';
  const tags = [
    ...new Set(
      values(props.category ?? meta.tags ?? meta.categories)
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ];
  return {
    title,
    date: publishedAt ?? new Date(0),
    dateOnly: /^\d{4}-\d{2}-\d{2}$/.test(String(values(publicationValue)[0])),
    updated: date(props.updated ?? meta.updated),
    slug:
      text(meta.slug) ??
      path
        .split('/')
        .pop()!
        .replace(/\.(md|svx)$/, ''),
    author: text(meta.author) ?? 'Martin Emde',
    description: text(props.summary) ?? text(meta.description),
    published:
      !!publishedAt &&
      (status ? status === 'published' : meta.published !== false) &&
      text(props.visibility) !== 'private' &&
      text(props.visibility) !== 'unlisted',
    image: text(props.featured) ?? text(meta.image),
    tags,
    type,
    photo,
    bookmarkOf,
    excerpt: content.length > 240 ? `${content.slice(0, 240)}…` : content
  };
}

export function postDisplayTitle(post: PostMetadata): string {
  return (
    post.title || post.excerpt || post.bookmarkOf || (post.type === 'photo' ? 'Photo' : 'Note')
  );
}
