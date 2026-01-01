#!/usr/bin/env bun

/**
 * Create a new blog post with frontmatter and default content.
 *
 * Usage:
 *   bun run blog:new "My Post Title"
 *   bun run blog:new "My Post Title" "custom-slug"
 */

import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const BLOG_DIR = join(import.meta.dir, '..', 'src', 'content', 'blog');

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

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

function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function createBlogPost(title: string, slug?: string) {
  const now = new Date();
  const postSlug = slug || slugify(title);
  const datePrefix = formatDateForFilename(now);
  const filename = `${datePrefix}-${postSlug}.md`;
  const filepath = join(BLOG_DIR, filename);

  if (existsSync(filepath)) {
    console.error(`Error: File already exists: ${filename}`);
    process.exit(1);
  }

  const frontmatter = `---
title: '${title.replace(/'/g, "''")}'
date: ${formatDate(now)}
author: Martin Emde
description: ''
published: false
slug: ${postSlug}
---

Write your post content here...
`;

  writeFileSync(filepath, frontmatter, 'utf-8');
  console.log(`✓ Created new blog post: ${filename}`);
  console.log(`  Path: ${filepath}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Edit the post: ${filepath}`);
  console.log(`  2. Add a description in the frontmatter`);
  console.log(`  3. When ready: bun run blog:publish "${postSlug}"`);
}

// Parse command line args
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: bun run blog:new "Post Title" [slug]');
  console.error('\nExamples:');
  console.error('  bun run blog:new "My New Post"');
  console.error('  bun run blog:new "My New Post" "custom-slug"');
  process.exit(1);
}

const title = args[0];
const slug = args[1];

createBlogPost(title, slug);
