import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import YAML from 'yaml';
import { renderSocialCard } from '../src/lib/utils/social-card.ts';
import { normalizePostMetadata, postDisplayTitle } from '../src/lib/utils/post-model';

const output = resolve('static/social');
// This directory contains only generated cards, never hand-authored assets.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of await readdir('src/content/blog')) {
  if (!/\.(md|svx)$/.test(file)) continue;
  const source = await readFile(`src/content/blog/${file}`, 'utf8');
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const post = normalizePostMetadata(YAML.parse(frontmatter), file, source);
  if (!post.published) continue;
  if (!/^[a-zA-Z0-9_-]+$/.test(post.slug))
    throw new Error(`Unsafe social image slug: ${post.slug}`);
  const svg = renderSocialCard(postDisplayTitle(post), post);
  const image = `${output}${post.permalink}.png`;
  await mkdir(dirname(image), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(image);
}
