#!/usr/bin/env bun
import { fileURLToPath } from 'node:url';
import { createBlogPost } from './blog-publishing.ts';

const [title, slug] = process.argv.slice(2);
if (!title) {
  console.error('Usage: bun run blog:new "Post Title" [slug]');
  process.exit(1);
}
try {
  const post = createBlogPost(title, slug, {
    directory: fileURLToPath(new URL('../src/content/blog/', import.meta.url))
  });
  console.log(`✓ Created new blog post: ${post.filename}`);
  console.log(`  Path: ${post.path}`);
  console.log(
    `\nNext steps:\n  1. Edit the post: ${post.path}\n  2. Add a description in the frontmatter\n  3. When ready: bun run blog:publish "${post.slug}"`
  );
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
