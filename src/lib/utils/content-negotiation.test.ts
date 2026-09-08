import { describe, it, expect } from 'vitest';
import { VARY_ACCEPT, negotiateContentType } from './content-negotiation';

const OFFERS = ['text/plain', 'text/markdown'] as const;

describe('negotiateContentType', () => {
  it('falls back to the first offer when no Accept header is sent', () => {
    expect(negotiateContentType(null, OFFERS)).toBe('text/plain');
    expect(negotiateContentType(undefined, OFFERS)).toBe('text/plain');
    expect(negotiateContentType('', OFFERS)).toBe('text/plain');
  });

  it('falls back to the first offer for */*', () => {
    expect(negotiateContentType('*/*', OFFERS)).toBe('text/plain');
  });

  it('serves markdown to an agent that asks for it', () => {
    expect(negotiateContentType('text/markdown', OFFERS)).toBe('text/markdown');
  });

  it('serves plain text to a browser navigating to the URL', () => {
    const browser = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8';

    expect(negotiateContentType(browser, OFFERS)).toBe('text/plain');
  });

  it('honours q values over offer order', () => {
    expect(negotiateContentType('text/plain;q=0.5, text/markdown;q=0.9', OFFERS)).toBe(
      'text/markdown'
    );
    expect(negotiateContentType('text/plain;q=0.9, text/markdown;q=0.5', OFFERS)).toBe(
      'text/plain'
    );
  });

  it('breaks ties in server-preference order', () => {
    expect(negotiateContentType('text/markdown, text/plain', OFFERS)).toBe('text/plain');
    expect(negotiateContentType('text/markdown, text/plain', ['text/markdown', 'text/plain'])).toBe(
      'text/markdown'
    );
  });

  it('prefers the most specific matching range', () => {
    // text/markdown matches exactly at q=0.2; text/plain only matches text/* at q=0.9
    expect(negotiateContentType('text/*;q=0.9, text/markdown;q=0.2', OFFERS)).toBe('text/plain');
  });

  it('treats a subtype wildcard as matching every offer', () => {
    expect(negotiateContentType('text/*', OFFERS)).toBe('text/plain');
  });

  it('never selects an offer the client rejected with q=0', () => {
    expect(negotiateContentType('text/plain;q=0, text/markdown', OFFERS)).toBe('text/markdown');
    expect(negotiateContentType('*/*;q=0', OFFERS)).toBeNull();
  });

  it('returns null when the client accepts none of the offers', () => {
    expect(negotiateContentType('application/json', OFFERS)).toBeNull();
    expect(negotiateContentType('text/html', OFFERS)).toBeNull();
  });

  it('ignores unparseable entries rather than the whole header', () => {
    expect(negotiateContentType('garbage, text/markdown', OFFERS)).toBe('text/markdown');
  });

  it('is case insensitive', () => {
    expect(negotiateContentType('TEXT/MARKDOWN', OFFERS)).toBe('text/markdown');
  });

  it('clamps out-of-range and malformed q values', () => {
    expect(negotiateContentType('text/markdown;q=bogus', OFFERS)).toBe('text/markdown');
    expect(negotiateContentType('text/plain;q=-1, text/markdown;q=0.1', OFFERS)).toBe(
      'text/markdown'
    );
  });
});

describe('VARY_ACCEPT', () => {
  it('names both headers a CDN must key negotiated responses on', () => {
    expect(VARY_ACCEPT).toBe('Accept, Accept-Encoding');
  });
});
