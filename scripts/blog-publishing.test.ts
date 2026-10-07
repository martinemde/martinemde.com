import { afterEach, beforeEach, expect, test } from 'bun:test';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { createBlogPost, formatPublishDate, publishPost } from './blog-publishing.ts';

let directory: string;
const now = () => new Date('2026-07-02T02:03:04Z');
const options = () => ({ directory, now });
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'blog-publishing-'));
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));
function draft(filename = '2026-06-01-my-post.md', extra = '', body = '\nBody\n') {
  const content = `---\ntitle: My post\nslug: my-post\ndate: 2026-06-01\npublished: false\n${extra}---\n${body}`;
  writeFileSync(join(directory, filename), content);
  return content;
}
function metadata(content: string) {
  return parse(content.split('---')[1]);
}

test('Pacific timestamp and filename agree across UTC midnight and DST', () => {
  expect(formatPublishDate(now())).toBe('2026-07-01T19:03:04-07:00');
  expect(formatPublishDate(new Date('2026-01-02T02:03:04Z'))).toBe('2026-01-01T18:03:04-08:00');
  expect(formatPublishDate(new Date('2026-03-08T09:59:59Z'))).toBe('2026-03-08T01:59:59-08:00');
  expect(formatPublishDate(new Date('2026-03-08T10:00:00Z'))).toBe('2026-03-08T03:00:00-07:00');
  const post = createBlogPost("A title: 'quoted'\nnext line", 'my-post', options());
  expect(post.filename).toBe('2026-07-01-my-post.md');
  expect(metadata(readFileSync(post.path, 'utf8')).title).toBe("A title: 'quoted'\nnext line");
  expect(() => createBlogPost('Duplicate', 'my-post', options())).toThrow();
});

test('publishing renames drafts, preserves nested metadata and body, and never republishes', () => {
  const body = '\n```yaml\ndate: do not edit\npublished: false\n```\n<aside>HTML</aside>\n';
  const original = draft(
    undefined,
    'custom:\n  nested: [one, two]\n  photo: [{value: "https://example.com/photo", alt: "An image"}]\n',
    body
  );
  const post = publishPost('my-post', options());
  const updated = readFileSync(post.path, 'utf8');
  expect(readdirSync(directory)).toEqual(['2026-07-01-my-post.md']);
  expect(updated.endsWith(body)).toBe(true);
  expect(metadata(updated).custom).toEqual(metadata(original).custom);
  expect(metadata(updated)).toMatchObject({ slug: 'my-post', published: true, date: post.date });
  expect(() =>
    publishPost('my-post', { directory, now: () => new Date('2026-08-02T00:00:00Z') })
  ).toThrow('Already published');
  expect(readFileSync(post.path, 'utf8')).toBe(updated);
});

test('same-day publication works with CRLF, YAML comments, and no final newline', () => {
  const source = draft('2026-07-01-my-post.md', '', 'Body with no newline')
    .replace('published: false', 'published: false # draft')
    .replaceAll('\n', '\r\n');
  writeFileSync(join(directory, '2026-07-01-my-post.md'), source);
  const post = publishPost('my-post', options());
  const content = readFileSync(post.path, 'utf8');
  expect(content.endsWith('Body with no newline')).toBe(true);
  expect(content).toContain('published: true # draft\r\n');
});

test('exact canonical slug beats suffix matches; duplicate canonical slugs require filename', () => {
  const other = draft('2026-06-01-long-my-post.md').replace('slug: my-post', 'slug: long-my-post');
  writeFileSync(join(directory, '2026-06-01-long-my-post.md'), other);
  draft();
  draft('2026-06-02-my-post.md');
  expect(() => publishPost('my-post', options())).toThrow('Ambiguous slug');
  publishPost('2026-06-02-my-post.md', options());
  expect(readFileSync(join(directory, '2026-06-01-long-my-post.md'), 'utf8')).toBe(other);
});

test('suffix fallback preserves the stored canonical slug', () => {
  const content = draft('2026-06-01-long-my-post.md').replace(
    'slug: my-post',
    'slug: long-my-post'
  );
  writeFileSync(join(directory, '2026-06-01-long-my-post.md'), content);
  expect(publishPost('my-post', options()).filename).toBe('2026-07-01-long-my-post.md');
});

test('refuses traversal, empty slugs, collisions, symlinks, and invalid frontmatter', () => {
  for (const slug of ['../escape', '/absolute', '', 'a/b', 'A', 'a..b']) {
    expect(() => createBlogPost('Title', slug, options())).toThrow('Slug');
    expect(() => publishPost(slug, options())).toThrow('Slug');
  }
  expect(() => createBlogPost('!!!', undefined, options())).toThrow('Slug');
  const original = draft();
  writeFileSync(join(directory, '2026-07-01-my-post.md'), 'existing');
  expect(() => publishPost('2026-06-01-my-post.md', options())).toThrow();
  expect(readFileSync(join(directory, '2026-06-01-my-post.md'), 'utf8')).toBe(original);
  expect(readFileSync(join(directory, '2026-07-01-my-post.md'), 'utf8')).toBe('existing');
  rmSync(join(directory, '2026-07-01-my-post.md'));
  symlinkSync(join(directory, '2026-06-01-my-post.md'), join(directory, '2026-07-01-my-post.md'));
  expect(() => publishPost('2026-07-01-my-post.md', options())).toThrow('regular post');
  expect(() => publishPost('2026-06-01-my-post.md', options())).toThrow();
  writeFileSync(join(directory, '2026-06-01-my-post.md'), 'date: outside frontmatter');
  expect(() => publishPost('2026-06-01-my-post.md', options())).toThrow('frontmatter');
});

test('omitted published defaults to published and does not reset a permalink', () => {
  const original = draft().replace('published: false\n', '');
  writeFileSync(join(directory, '2026-06-01-my-post.md'), original);
  expect(() => publishPost('my-post', options())).toThrow('not explicitly a draft');
  expect(readFileSync(join(directory, '2026-06-01-my-post.md'), 'utf8')).toBe(original);
});

test('a unique canonical slug takes priority over a longer suffix match', () => {
  draft();
  const other = draft('2026-06-01-long-my-post.md').replace('slug: my-post', 'slug: long-my-post');
  writeFileSync(join(directory, '2026-06-01-long-my-post.md'), other);
  expect(publishPost('my-post', options()).slug).toBe('my-post');
  expect(readFileSync(join(directory, '2026-06-01-long-my-post.md'), 'utf8')).toBe(other);
});

test('Micropub entries stay unchanged for the authoritative publisher', () => {
  const original = draft(
    undefined,
    'micropub:\n  type: [h-entry]\n  properties:\n    published: [2026-06-01T12:00:00-07:00]\n    post-status: [draft]\n    visibility: [private]\n'
  );
  expect(() => publishPost('my-post', options())).toThrow('Use the Micropub publisher');
  expect(readFileSync(join(directory, '2026-06-01-my-post.md'), 'utf8')).toBe(original);
  expect(readdirSync(directory)).toEqual(['2026-06-01-my-post.md']);
});
