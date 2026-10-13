import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import type { Component } from 'svelte';
import PostPage from './[year=year]/[month=month]/[day=day]/[slug]/+page.svelte';
import PostBreadcrumbs from '#lib/components/PostBreadcrumbs.svelte';
import { normalizePostMetadata } from '#lib/utils/post-model.ts';
import { postRouteParams } from '#lib/utils/post-routing.ts';

const modules = import.meta.glob('../lib/fixtures/publisher/note.md', { eager: true }) as Record<
  string,
  { default: Component }
>;
const content = modules['../lib/fixtures/publisher/note.md'].default;
afterEach(cleanup);

describe('post breadcrumbs', () => {
  it.each([
    { depth: 'year' as const, labels: ['~', '2026'], current: '2026' },
    { depth: 'month' as const, labels: ['~', '2026', '01'], current: '01' },
    { depth: 'day' as const, labels: ['~', '2026', '01', '31'], current: '31' }
  ])(
    'ends the $depth hierarchy at the current page without archive labels',
    ({ depth, labels, current }) => {
      render(PostBreadcrumbs, { post: { permalink: '/2026/01/31/canonical-slug' }, depth });
      const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect([...nav.querySelectorAll('li')].map((li) => li.textContent?.trim())).toEqual(labels);
      expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe(current);
      expect(nav.textContent).not.toMatch(/archive/i);
    }
  );

  it('links each canonical date segment to its archive and marks the slug as current', () => {
    const metadata = {
      ...normalizePostMetadata({}, 'test.md', ''),
      permalink: '/2026/01/31/canonical-slug' as const,
      slug: 'other-slug',
      date: new Date('2026-02-01T07:00:00Z'),
      readingTime: '1 min read'
    };
    render(PostPage, {
      params: postRouteParams(metadata),
      data: { metadata, content, newer: undefined, older: undefined },
      form: undefined
    });
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const links = [...nav.querySelectorAll('a')];
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['~', '/'],
      ['2026', '/2026'],
      ['01', '/2026/01'],
      ['31', '/2026/01/31']
    ]);
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe('canonical-slug');
    expect(nav.querySelectorAll('li')).toHaveLength(5);
  });
});

describe('post navigation', () => {
  const metadata = {
    ...normalizePostMetadata({}, 'test.md', ''),
    permalink: '/2026/01/31/canonical-slug' as const,
    slug: 'canonical-slug',
    date: new Date('2026-02-01T07:00:00Z'),
    readingTime: '1 min read'
  };

  it('links newer and older entries, the day, and the site sections at the end of a post', () => {
    render(PostPage, {
      params: postRouteParams(metadata),
      data: {
        metadata,
        content,
        newer: { permalink: '/2026/02/02/newer', label: 'A newer post' },
        older: { permalink: '/2026/01/30/older', label: 'Jan 30, 2026, 9:15 AM' }
      },
      form: undefined
    });
    const nav = screen.getByRole('navigation', { name: 'More posts' });
    const links = [...nav.querySelectorAll('a')];
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['A newer post', '/2026/02/02/newer'],
      ['Jan 30, 2026, 9:15 AM', '/2026/01/30/older'],
      ['Saturday, January 31, 2026', '/2026/01/31'],
      ['Stream', '/stream'],
      ['Blog', '/blog'],
      ['RSS', '/rss.xml']
    ]);
    expect(nav.querySelector('a[rel="next"]')?.textContent).toBe('A newer post');
    expect(nav.querySelector('a[rel="prev"]')?.textContent).toBe('Jan 30, 2026, 9:15 AM');
  });

  it('leaves out newer/older when the post has no neighbors', () => {
    render(PostPage, {
      params: postRouteParams(metadata),
      data: { metadata, content, newer: undefined, older: undefined },
      form: undefined
    });
    const nav = screen.getByRole('navigation', { name: 'More posts' });
    expect(nav.querySelector('ul')).toBeNull();
    expect(nav.querySelectorAll('a')).toHaveLength(4);
  });
});
