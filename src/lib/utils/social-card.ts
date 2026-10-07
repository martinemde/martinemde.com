import type { PostMetadata } from './post-model.ts';

export const escapeXml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
      })[char]!
  );

export function wrapText(text: string, width: number, maximum: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const result: string[] = [];
  let line = '';
  for (const word of words) {
    // Split long URLs/words too, so they cannot escape the card.
    for (let part = 0; part < word.length; part += width) {
      const chunk = word.slice(part, part + width);
      if (line && line.length + chunk.length + 1 > width) {
        result.push(line);
        line = '';
      }
      line += (line ? ' ' : '') + chunk;
    }
  }
  if (line) result.push(line);
  if (result.length > maximum) result[maximum - 1] = result[maximum - 1].slice(0, width - 1) + '…';
  return result.slice(0, maximum);
}

export function socialCardSubtitle(post: Pick<PostMetadata, 'type' | 'bookmarkOf'>): string {
  return post.bookmarkOf
    ? new URL(post.bookmarkOf).hostname
    : post.type === 'article'
      ? 'Writing'
      : post.type;
}

/** Render the shared 1200×630 card without filesystem or image dependencies. */
export function renderSocialCard(
  text: string,
  post: Pick<PostMetadata, 'type' | 'bookmarkOf'>
): string {
  const title = wrapText(text, 35, 4);
  const subtitle = socialCardSubtitle(post);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#171c22"/>
    <rect x="64" y="64" width="7" height="480" rx="3" fill="#74c7bc"/>
    <g font-family="sans-serif" fill="#edf0f4">
      <text x="105" y="103" font-size="25" fill="#74c7bc">${escapeXml(subtitle)}</text>
      ${title.map((line, i) => `<text x="100" y="${188 + i * 72}" font-size="54" font-weight="600">${escapeXml(line)}</text>`).join('')}
      <text x="105" y="550" font-size="28">Martin Emde</text>
      <text x="1090" y="550" text-anchor="end" font-size="23" fill="#b2bbc5">martinemde.com</text>
    </g>
  </svg>`;
}
