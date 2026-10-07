import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import type { Component } from 'svelte';
import PostPage from './[year=year]/[month=month]/[day=day]/[slug]/+page.svelte';
import PostBreadcrumbs from '#lib/components/PostBreadcrumbs.svelte';
import { normalizePostMetadata } from '#lib/utils/post-model.ts';

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
    render(PostPage, { data: { metadata, content } });
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
