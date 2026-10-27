import { describe, it, expect } from 'vitest';
import { normalizePostMetadata, portableMarkdown } from './post-model';

const page = 'https://martinemde.com/2026/01/10/shaders';

describe('portableMarkdown', () => {
  it('drops Svelte script and style, and links each demo from its section', () => {
    const body = [
      '<script lang="ts">',
      "  import Canvas from '#lib/components/Canvas.svelte';",
      '</script>',
      '',
      'Intro.',
      '',
      '## Example: Blur',
      '',
      '{#if ready}',
      '  <Canvas',
      '    width={800}',
      '  />',
      '{:else}',
      '  <p>Loading…</p>',
      '{/if}',
      '',
      'After.',
      '',
      '<Canvas width={800} />',
      '',
      '<style>',
      '  p { color: red; }',
      '</style>'
    ].join('\n');
    expect(portableMarkdown(body, page)).toBe(
      [
        'Intro.',
        '',
        '## Example: Blur',
        '',
        `[Interactive demo: Example: Blur](${page})`,
        '',
        'After.',
        '',
        `[Interactive demo: Example: Blur](${page})`
      ].join('\n')
    );
  });

  it('leaves fenced code alone', () => {
    const body = ['```svelte', '<script>', '{#if x}{/if}', '</script>', '```'].join('\n');
    expect(portableMarkdown(body, page)).toBe(body);
  });

  it('makes site-relative links and images absolute', () => {
    const body = [
      'See [shaders](/shaders) and ![a cat](/images/cat.png).',
      '<img src="/images/dog.png" alt="dog"> <a href="/about">about</a>',
      '',
      `[ref]: /shaders "Shaders"`,
      '[ext]: https://example.com/x'
    ].join('\n');
    expect(portableMarkdown(body, page)).toBe(
      [
        'See [shaders](https://martinemde.com/shaders) and ![a cat](https://martinemde.com/images/cat.png).',
        '<img src="https://martinemde.com/images/dog.png" alt="dog"> <a href="https://martinemde.com/about">about</a>',
        '',
        `[ref]: https://martinemde.com/shaders "Shaders"`,
        '[ext]: https://example.com/x'
      ].join('\n')
    );
  });
});

describe('normalizePostMetadata excerpt', () => {
  it('keeps the URL of an autolink', () => {
    const post = normalizePostMetadata(
      { published: '2026-09-22T17:48:33-07:00' },
      '../../content/blog/2026-09-22-174833.md',
      '---\npublished: x\n---\nIf you use <https://rss.chat> for the feed.'
    );
    expect(post.excerpt).toBe('If you use https://rss.chat for the feed.');
  });
});
