import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import type { Component } from 'svelte';
import YAML from 'yaml';
import Stream from './Stream.svelte';
import { normalizePostMetadata } from '../utils/post-model';
import { renderFeedItem } from '../utils/feed';
import { socialMetadata } from '../utils/social';
import publishing from '../../../publishing.json';

const modules = import.meta.glob('../fixtures/publisher/*.md', { eager: true }) as Record<
  string,
  { default: Component }
>;
const sources = import.meta.glob('../fixtures/publisher/*.md', {
  eager: true,
  query: '?raw',
  import: 'default'
}) as Record<string, string>;
const entries = Object.entries(sources).map(([path, source]) => ({
  metadata: normalizePostMetadata(
    YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)![1]),
    path,
    source
  ),
  content: modules[path].default,
  source
}));
const published = entries.filter((entry) => entry.metadata.published);
afterEach(cleanup);

describe('publisher files through the stream and feed', () => {
  it('recognizes every advertised type without inventing a title', () => {
    expect(new Set(published.map((entry) => entry.metadata.type))).toEqual(
      new Set(publishing['post-types'].map((post) => post.type))
    );
    expect(entries.find((entry) => entry.metadata.slug === 'note')?.metadata.title).toBe('');
    expect(entries.find((entry) => entry.metadata.slug === 'draft')?.metadata.published).toBe(
      false
    );
  });

  it('renders linked thoughts, attributed quotes, and photos once with alt text', () => {
    const { container } = render(Stream, { entries: published });
    expect(screen.getByText('A quoted passage.')).toBeTruthy();
    expect(container.querySelector('blockquote')?.getAttribute('cite')).toBe(
      'https://example.org/reference'
    );
    expect(screen.getByRole('link', { name: 'a related thought' }).getAttribute('href')).toBe(
      '/blog/note'
    );
    expect(screen.getAllByAltText('Morning light')).toHaveLength(1);
    expect(screen.getAllByAltText('Evening light')).toHaveLength(1);
    expect(screen.queryByText('Untitled Post')).toBeNull();
    expect(screen.queryByText('Not ready to share')).toBeNull();
    expect(container.querySelector('details')?.open).toBe(false);
    expect(screen.getByRole('link', { name: 'Giving a thought a home' }).getAttribute('href')).toBe(
      '/blog/article'
    );
  });

  it('always offers Vim navigation inside the stream and restores focus after reading', async () => {
    const { container } = render(Stream, { entries: published });
    expect(screen.queryByRole('checkbox')).toBeNull();
    const articles = [...container.querySelectorAll<HTMLElement>('article')];
    // Tab naturally reaches links; no separate mode or starting control is needed.
    const title = screen.getByRole('link', { name: 'Giving a thought a home' });
    title.focus();
    const entry = title.closest('article')!;
    const index = articles.indexOf(entry);
    await fireEvent.keyDown(title, { key: 'j' });
    expect(document.activeElement).toBe(articles[index + 1]);
    await fireEvent.keyDown(document.activeElement!, { key: 'k' });
    expect(document.activeElement).toBe(entry);
    const details = entry.querySelector('details')!;
    for (const [open, close] of [
      ['l', 'h'],
      ['Enter', 'Escape']
    ]) {
      await fireEvent.keyDown(entry, { key: open });
      expect(details.open).toBe(true);
      expect(document.activeElement).toBe(details.querySelector('.entry-body'));
      await fireEvent.keyDown(document.activeElement!, { key: close });
      expect(details.open).toBe(false);
      expect(document.activeElement).toBe(entry);
    }
  });

  it('preserves native controls, typing, arrows, and shortcuts outside the stream', () => {
    const { container } = render(Stream, { entries: published });
    const entry = container.querySelector<HTMLElement>('article')!;
    const link = screen.getByRole('link', { name: 'Giving a thought a home' });
    const untouched = (target: HTMLElement, key: string, options = {}) => {
      target.focus();
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...options
      });
      target.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(target);
    };
    untouched(entry, 'ArrowDown');
    untouched(entry, 'ArrowUp');
    untouched(entry, 'j', { ctrlKey: true });
    untouched(link, 'Enter');
    untouched(entry.querySelector('summary')!, 'Enter');
    const input = document.createElement('input');
    entry.append(input);
    for (const key of ['j', 'k', 'h', 'l', 'Enter', 'Escape']) untouched(input, key);
    const outside = document.createElement('button');
    document.body.append(outside);
    untouched(outside, 'j');
    outside.remove();
  });

  it('publishes full readable RSS with stable permalinks, untitled notes, and intact media', async () => {
    const items = await Promise.all(
      published.map((entry) =>
        renderFeedItem(entry.metadata, entry.source, 'https://martinemde.com')
      )
    );
    const doc = new DOMParser().parseFromString(
      `<rss xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:source="https://source.scripting.com/"><channel>${items.join('')}</channel></rss>`,
      'application/xml'
    );
    expect(doc.querySelector('parsererror')).toBeNull();
    for (const item of doc.querySelectorAll('item')) {
      expect(item.querySelector('guid')?.textContent).toBe(item.querySelector('link')?.textContent);
      expect(item.querySelector('pubDate')?.textContent).toBe('Sun, 20 Sep 2026 17:15:00 GMT');
      const html = new DOMParser().parseFromString(
        item.querySelector('description')!.textContent!,
        'text/html'
      );
      if (item.querySelector('link')!.textContent!.endsWith('/photos')) {
        expect([...html.querySelectorAll('img')].map((img) => img.alt)).toEqual([
          'Morning light',
          'Evening light'
        ]);
      }
      if (item.querySelector('link')!.textContent!.endsWith('/note')) {
        expect(item.querySelector('title')).toBeNull();
        expect(html.querySelector('a')?.href).toBe('https://martinemde.com/blog/article');
      }
      if (item.querySelector('link')!.textContent!.endsWith('/bookmark')) {
        expect(html.querySelector('blockquote')?.getAttribute('cite')).toBe(
          'https://example.org/reference'
        );
      }
    }
  });

  it('omits component scripts from feed content and share previews', async () => {
    const entry = entries.find((entry) => entry.metadata.slug === 'note')!;
    const source =
      '<script lang="ts">const secretWidgetImplementation = 123;</script>\n\nA readable thought.';
    const props = YAML.parse(entry.source.match(/^---\n([\s\S]*?)\n---/)![1]);
    const post = normalizePostMetadata(props, 'note.md', source);
    expect(post.excerpt).toBe('A readable thought.');
    const xml = new DOMParser().parseFromString(
      `<rss xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:source="https://source.scripting.com/">${await renderFeedItem(post, source, 'https://martinemde.com')}</rss>`,
      'application/xml'
    );
    const body = new DOMParser().parseFromString(
      xml.querySelector('description')!.textContent!,
      'text/html'
    );
    expect(body.querySelector('script')).toBeNull();
    expect(body.body.textContent?.trim()).toBe('A readable thought.');
  });

  it('uses the published body for previews when editing source is older', () => {
    const entry = entries.find((entry) => entry.metadata.slug === 'note')!;
    const metadata = YAML.parse(entry.source.match(/^---\n([\s\S]*?)\n---/)![1]);
    const post = normalizePostMetadata(
      metadata,
      'note.md',
      'The revised thought I actually published.'
    );
    expect(socialMetadata(post, 'https://martinemde.com').description).toBe(
      'The revised thought I actually published.'
    );
  });

  it('produces share metadata for untitled and media entries', () => {
    const note = entries.find((entry) => entry.metadata.slug === 'note')!.metadata;
    const card = socialMetadata(note, 'https://martinemde.com');
    expect(card.url).toBe('https://martinemde.com/blog/note');
    expect(card.title).toBe('Small thoughts deserve their own address. See my longer explanation.');
    expect(card.image).toBe('https://martinemde.com/social/note.png');
    const photo = socialMetadata(
      entries.find((entry) => entry.metadata.slug === 'photos')!.metadata,
      'https://martinemde.com'
    );
    expect(photo.image).toBe('https://example.org/one.png');
    expect(photo.imageAlt).toBe('Morning light');
  });
});
