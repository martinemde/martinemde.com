import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import YAML from 'yaml';
import { normalizePostMetadata, postDisplayTitle } from '../src/lib/utils/post-model';

const output = resolve('static/social');
// This directory contains only generated cards, never hand-authored assets.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const escape = (value: string) =>
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

function lines(text: string, width: number, maximum: number): string[] {
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

for (const file of await readdir('src/content/blog')) {
  if (!/\.(md|svx)$/.test(file)) continue;
  const source = await readFile(`src/content/blog/${file}`, 'utf8');
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const post = normalizePostMetadata(YAML.parse(frontmatter), file, source);
  if (!post.published) continue;
  if (!/^[a-zA-Z0-9_-]+$/.test(post.slug))
    throw new Error(`Unsafe social image slug: ${post.slug}`);
  const title = lines(postDisplayTitle(post), 35, 4);
  const subtitle = post.bookmarkOf
    ? new URL(post.bookmarkOf).hostname
    : post.type === 'article'
      ? 'Writing'
      : post.type;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#171c22"/>
    <rect x="64" y="64" width="7" height="480" rx="3" fill="#74c7bc"/>
    <g font-family="sans-serif" fill="#edf0f4">
      <text x="105" y="103" font-size="25" fill="#74c7bc">${escape(subtitle)}</text>
      ${title.map((line, i) => `<text x="100" y="${188 + i * 72}" font-size="54" font-weight="600">${escape(line)}</text>`).join('')}
      <text x="105" y="550" font-size="28">Martin Emde</text>
      <text x="1090" y="550" text-anchor="end" font-size="23" fill="#b2bbc5">martinemde.com</text>
    </g>
  </svg>`;
  const image = `${output}${post.permalink}.png`;
  await mkdir(dirname(image), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(image);
}
