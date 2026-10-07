import {
  constants,
  lstatSync,
  openSync,
  closeSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import { isMap, parseDocument, stringify } from 'yaml';

export const SITE_TIME_ZONE = 'America/Los_Angeles';
export type PublishingOptions = { directory: string; now?: () => Date };

export function formatPublishDate(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid publication date');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SITE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  const local = `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}`;
  const offset = (Date.parse(`${local}Z`) - Math.floor(date.getTime() / 1000) * 1000) / 60000;
  const sign = offset < 0 ? '-' : '+';
  return `${local}${sign}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')}:${String(Math.abs(offset) % 60).padStart(2, '0')}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function validateSlug(slug: unknown): asserts slug is string {
  if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Slug must contain lowercase letters, numbers, and single hyphens only');
  }
}

function readPost(directory: string, filename: string) {
  const path = join(directory, filename);
  if (!lstatSync(path).isFile()) throw new Error(`Not a regular post file: ${filename}`);
  const content = readFileSync(path, 'utf8');
  const match = /^(---\r?\n)([\s\S]*?)(^---[ \t]*\r?\n|^---[ \t]*$)/m.exec(content);
  if (!match || match.index !== 0) throw new Error(`Missing YAML frontmatter: ${filename}`);
  const doc = parseDocument(match[2]);
  if (doc.errors.length || !isMap(doc.contents))
    throw new Error(`Invalid YAML frontmatter: ${filename}`);
  return {
    path,
    filename,
    doc,
    body: content.slice(match[0].length),
    opening: match[1],
    closing: match[3]
  };
}

export function createBlogPost(
  title: string,
  slug: string | undefined,
  options: PublishingOptions
) {
  const postSlug = slug ?? slugify(title);
  validateSlug(postSlug);
  const date = formatPublishDate((options.now ?? (() => new Date()))());
  const filename = `${date.slice(0, 10)}-${postSlug}.md`;
  const path = join(options.directory, filename);
  const frontmatter = stringify({
    title,
    date,
    author: 'Martin Emde',
    description: '',
    published: false,
    slug: postSlug
  });
  writeFileSync(path, `---\n${frontmatter}---\n\nWrite your post content here...\n`, {
    flag: 'wx'
  });
  return { path, filename, slug: postSlug, date };
}

export function publishPost(identity: string, options: PublishingOptions) {
  // A dated filename disambiguates a slug reused on multiple days.
  const exactFilename = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(identity);
  if (!exactFilename) validateSlug(identity);
  const files = readdirSync(options.directory).filter((file) =>
    /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(file)
  );
  let candidates: string[];
  if (exactFilename) {
    candidates = files.filter((file) => file === identity);
  } else {
    const suffixMatches = files.filter((file) => file.endsWith(`-${identity}.md`));
    const canonicalMatches = suffixMatches.filter(
      (file) => readPost(options.directory, file).doc.get('slug') === identity
    );
    candidates = canonicalMatches.length ? canonicalMatches : suffixMatches;
  }
  if (!candidates.length) throw new Error(`Post not found: ${identity}`);
  if (candidates.length > 1)
    throw new Error(`Ambiguous slug: ${identity}. Use a dated filename: ${candidates.join(', ')}`);
  const post = readPost(options.directory, candidates[0]);
  if (post.doc.get('published') !== false) {
    throw new Error(
      `Already published (or not explicitly a draft): ${post.filename}. Edit it directly; publication dates and permalinks will not be reset.`
    );
  }
  const slug = post.doc.get('slug');
  validateSlug(slug);
  const date = formatPublishDate((options.now ?? (() => new Date()))());
  const filename = `${date.slice(0, 10)}-${slug}.md`;
  const path = join(options.directory, filename);
  post.doc.set('date', date);
  post.doc.set('published', true);
  const yaml = post.doc.toString().replace(/\n/g, post.opening.includes('\r') ? '\r\n' : '\n');
  const content = `${post.opening}${yaml}${post.closing}${post.body}`;
  if (path !== post.path) {
    // Exclusive creation refuses existing files, including symlinks.
    writeFileSync(path, content, { flag: 'wx' });
    try {
      unlinkSync(post.path);
    } catch (error) {
      unlinkSync(path);
      throw error;
    }
  } else {
    const fd = openSync(path, constants.O_WRONLY | constants.O_TRUNC | constants.O_NOFOLLOW);
    try {
      writeFileSync(fd, content);
    } finally {
      closeSync(fd);
    }
  }
  return { path, filename, slug, date };
}
