#!/usr/bin/env bun

/**
 * Publish a blog post by updating the date to now and setting published: true.
 *
 * Usage:
 *   bun run blog:publish "post-slug"
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const BLOG_DIR = join(import.meta.dir, '..', 'src', 'content', 'blog');

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // Get timezone offset in format +HH:MM or -HH:MM
  const offset = -date.getTimezoneOffset();
  const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, '0');
  const offsetSign = offset >= 0 ? '+' : '-';

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
}

function findPostBySlug(slug: string): string | null {
  const files = readdirSync(BLOG_DIR);

  // Look for files ending with -slug.md
  const match = files.find((file) => {
    return file.endsWith(`-${slug}.md`);
  });

  return match ? join(BLOG_DIR, match) : null;
}

function publishPost(slug: string) {
  const filepath = findPostBySlug(slug);

  if (!filepath || !existsSync(filepath)) {
    console.error(`Error: Post not found with slug: ${slug}`);
    console.error(`\nSearched in: ${BLOG_DIR}`);
    process.exit(1);
  }

  const content = readFileSync(filepath, 'utf-8');
  const now = new Date();
  const newDate = formatDate(now);

  // Update frontmatter
  let updated = content;

  // Update date field
  updated = updated.replace(/^date:\s*.+$/m, `date: ${newDate}`);

  // Update published field
  updated = updated.replace(/^published:\s*(false|true)$/m, 'published: true');

  // Write back to file
  writeFileSync(filepath, updated, 'utf-8');

  console.log(`✓ Published: ${filepath.split('/').pop()}`);
  console.log(`  Date updated to: ${newDate}`);
  console.log(`  Published: true`);
}

// Parse command line args
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: bun run blog:publish "post-slug"');
  console.error('\nExample:');
  console.error('  bun run blog:publish "my-new-post"');
  process.exit(1);
}

const slug = args[0];

publishPost(slug);
