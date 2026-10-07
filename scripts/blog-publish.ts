#!/usr/bin/env bun
import { fileURLToPath } from 'node:url';
import { publishPost } from './blog-publishing.ts';

const [identity] = process.argv.slice(2);
if (!identity) {
  console.error('Usage: bun run blog:publish "post-slug"');
  console.error('For ambiguous slugs, use "YYYY-MM-DD-post-slug.md".');
  process.exit(1);
}
try {
  const post = publishPost(identity, {
    directory: fileURLToPath(new URL('../src/content/blog/', import.meta.url))
  });
  console.log(`✓ Published: ${post.filename}`);
  console.log(`  Date updated to: ${post.date}`);
  console.log('  Published: true');
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
