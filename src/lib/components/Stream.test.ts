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

  it('keeps shortcuts opt-in, preserves arrows and interactive focus, and returns focus on collapse', async () => {
    const { container } = render(Stream, { entries: published, keyboard: true });
    const articles = [...container.querySelectorAll<HTMLElement>('article')];
    document.body.focus();
    const disabled = new KeyboardEvent('keydown', { key: 'j', bubbles: true, cancelable: true });
    window.dispatchEvent(disabled);
    expect(disabled.defaultPrevented).toBe(false);
    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(screen.getByRole('button', { name: 'Start keyboard navigation' }));
    expect(document.activeElement).toBe(articles[0]);
    await fireEvent.keyDown(articles[0], { key: 'j' });
    expect(document.activeElement).toBe(articles[1]);
    const arrow = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true
    });
    articles[1].dispatchEvent(arrow);
    expect(arrow.defaultPrevented).toBe(false);
    const link = screen.getByRole('link', { name: 'a related thought' });
    link.focus();
    await fireEvent.keyDown(link, { key: 'j' });
    expect(document.activeElement).toBe(link);
    const details = container.querySelector('details')!;
    details.open = true;
    const summary = details.querySelector('summary')!;
    summary.focus();
    await fireEvent.keyDown(summary, { key: 'Escape' });
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(summary);
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
