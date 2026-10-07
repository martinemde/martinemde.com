import { describe, expect, it } from 'vitest';
import { escapeXml, renderSocialCard, socialCardSubtitle, wrapText } from './social-card.ts';

describe('wrapText', () => {
  it('collapses whitespace and returns no lines for empty text', () => {
    expect(wrapText('  one\t two\nthree  ', 9, 4)).toEqual(['one two', 'three']);
    expect(wrapText(' \n\t ', 35, 4)).toEqual([]);
  });

  it('splits long words and URLs without exceeding the width', () => {
    expect(wrapText('abcdefghijklmnop', 5, 4)).toEqual(['abcde', 'fghij', 'klmno', 'p']);
    expect(wrapText('https://example.com/long-path', 10, 4)).toEqual([
      'https://ex',
      'ample.com/',
      'long-path'
    ]);
  });

  it('packs whole words, including an exact-width line', () => {
    expect(wrapText('one two abcd ef', 7, 4)).toEqual(['one two', 'abcd ef']);
    expect(wrapText('a abcdefgh', 5, 4)).toEqual(['a', 'abcde', 'fgh']);
  });

  it('only adds an ellipsis when lines exceed the maximum', () => {
    expect(wrapText('abcde fghij klmno', 5, 2)).toEqual(['abcde', 'fghi…']);
    expect(wrapText('abcde x klmno', 5, 2)).toEqual(['abcde', 'x…']);
    expect(wrapText('abcde fghij', 5, 2)).toEqual(['abcde', 'fghij']);
  });
});

describe('socialCardSubtitle', () => {
  it.each([
    ['article', 'Writing'],
    ['note', 'note'],
    ['bookmark', 'bookmark'],
    ['photo', 'photo']
  ] as const)('selects the %s subtitle', (type, subtitle) => {
    expect(socialCardSubtitle({ type })).toBe(subtitle);
  });

  it('uses the bookmark hostname before the entry type', () => {
    for (const type of ['article', 'note', 'bookmark', 'photo'] as const) {
      expect(
        socialCardSubtitle({ type, bookmarkOf: 'https://www.example.com:8443/path?q=1' })
      ).toBe('www.example.com');
    }
  });
});

describe('escapeXml', () => {
  it('escapes all five XML characters without changing other text', () => {
    expect(escapeXml(`A&B <tag> "quoted" 'text' café…`)).toBe(
      'A&amp;B &lt;tag&gt; &quot;quoted&quot; &apos;text&apos; café…'
    );
    expect(escapeXml('&amp;')).toBe('&amp;amp;');
  });
});

describe('renderSocialCard', () => {
  it('keeps the card design and escapes the title', () => {
    const svg = renderSocialCard(`A&B <tag> "x" 'y'`, { type: 'article' });
    expect(svg).toBe(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#171c22"/>
    <rect x="64" y="64" width="7" height="480" rx="3" fill="#74c7bc"/>
    <g font-family="sans-serif" fill="#edf0f4">
      <text x="105" y="103" font-size="25" fill="#74c7bc">Writing</text>
      <text x="100" y="188" font-size="54" font-weight="600">A&amp;B &lt;tag&gt; &quot;x&quot; &apos;y&apos;</text>
      <text x="105" y="550" font-size="28">Martin Emde</text>
      <text x="1090" y="550" text-anchor="end" font-size="23" fill="#b2bbc5">martinemde.com</text>
    </g>
  </svg>`);
  });

  it('renders at most four title lines with the existing spacing and truncation', () => {
    const svg = renderSocialCard('a'.repeat(175), { type: 'note' });
    const titles = [...svg.matchAll(/<text x="100" y="(\d+)"[^>]*>(.*?)<\/text>/g)];
    expect(titles.map((match) => match[1])).toEqual(['188', '260', '332', '404']);
    expect(titles.map((match) => match[2])).toEqual([
      'a'.repeat(35),
      'a'.repeat(35),
      'a'.repeat(35),
      'a'.repeat(34) + '…'
    ]);
  });

  it('renders the bookmark hostname and handles an empty title', () => {
    const svg = renderSocialCard('', { type: 'bookmark', bookmarkOf: 'https://example.com/path' });
    expect(svg).toContain('fill="#74c7bc">example.com</text>');
    expect(svg).not.toContain('<text x="100"');
  });
});
