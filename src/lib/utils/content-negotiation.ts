/**
 * Accept negotiation for endpoints that can answer one URL with more than one
 * representation (RFC 9110 §12.5.1).
 *
 * Any response picked this way must also advertise `Vary: Accept`, or a shared
 * cache will hand whichever variant it stored first to every later client —
 * an agent asking for markdown gets the cached HTML, or the reverse.
 */

/** Value for the `Vary` header on every negotiated response. */
export const VARY_ACCEPT = 'Accept, Accept-Encoding';

interface MediaRange {
  type: string;
  subtype: string;
  quality: number;
}

/**
 * Parse one comma-separated entry of an Accept header, e.g. `text/plain;q=0.8`
 */
function parseMediaRange(entry: string): MediaRange | null {
  const [range, ...params] = entry.split(';');
  const [type, subtype] = range.trim().toLowerCase().split('/');

  if (!type || !subtype) {
    return null;
  }

  const q = params
    .map((param) => param.trim().toLowerCase())
    .find((param) => param.startsWith('q='));
  const quality = q === undefined ? 1 : Number.parseFloat(q.slice(2));

  return {
    type,
    subtype,
    quality: Number.isFinite(quality) ? Math.min(Math.max(quality, 0), 1) : 1
  };
}

/**
 * Quality the client assigned to a media type, using the most specific
 * matching range: `text/markdown` beats `text/*` beats the bare wildcard.
 * Returns 0 when no range matches, or when the client explicitly rejected it.
 */
function qualityOf(mediaType: string, ranges: MediaRange[]): number {
  const [type, subtype] = mediaType.toLowerCase().split('/');
  let specificity = 0;
  let quality = 0;

  for (const range of ranges) {
    let match: number;

    if (range.type === type && range.subtype === subtype) {
      match = 3;
    } else if (range.type === type && range.subtype === '*') {
      match = 2;
    } else if (range.type === '*' && range.subtype === '*') {
      match = 1;
    } else {
      continue;
    }

    if (match > specificity) {
      specificity = match;
      quality = range.quality;
    }
  }

  return quality;
}

/**
 * Pick the representation to serve for a client's Accept header.
 *
 * `offers` is in server-preference order: the first entry is served when the
 * client states no preference, and it also wins ties. Returns null when the
 * client accepts none of the offers, which callers should answer with a 406.
 */
export function negotiateContentType(
  accept: string | null | undefined,
  offers: readonly string[]
): string | null {
  const ranges = accept ? accept.split(',').flatMap((entry) => parseMediaRange(entry) ?? []) : [];

  if (ranges.length === 0) {
    return offers[0] ?? null;
  }

  let best: string | null = null;
  let bestQuality = 0;

  for (const offer of offers) {
    const quality = qualityOf(offer, ranges);

    // Strictly greater keeps the earlier (more preferred) offer on a tie, and
    // leaves q=0 offers unselected.
    if (quality > bestQuality) {
      best = offer;
      bestQuality = quality;
    }
  }

  return best;
}
