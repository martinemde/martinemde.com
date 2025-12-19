/**
 * Utility functions for loading blog posts
 * Uses Vite's import.meta.glob for build-time processing
 */

import type { Component } from 'svelte';

export interface PostMetadata {
  title: string;
  date: string | Date; // YAML parsers may convert YYYY-MM-DD to Date objects
  author?: string;
  description?: string;
  published?: boolean;
  slug: string;
}

export interface Post extends PostMetadata {
  path: string;
}

/**
 * Error thrown when duplicate slugs are detected
 */
export class DuplicateSlugError extends Error {
  constructor(
    slug: string,
    path1: string,
    path2: string
  ) {
    super(
      `Duplicate slug "${slug}" found in:\n  - ${path1}\n  - ${path2}\n\nEach blog post must have a unique slug.`
    );
    this.name = 'DuplicateSlugError';
  }
}

/**
 * Eagerly load all post metadata and build slug-to-path index
 * This runs once at module initialization time
 */
const allPostFiles = import.meta.glob('../../content/blog/*.{md,svx}', {
  eager: true
});

interface SlugIndexEntry {
  path: string;
  metadata: PostMetadata;
  component: Component;
}

/**
 * Build and validate the slug-to-path mapping
 * Throws DuplicateSlugError if duplicate slugs are found
 */
function buildSlugIndex(): Map<string, SlugIndexEntry> {
  const slugIndex = new Map<string, SlugIndexEntry>();

  for (const [path, module] of Object.entries(allPostFiles)) {
    const typedModule = module as { default: Component; metadata: PostMetadata };
    const { metadata, default: component } = typedModule;

    // Check for duplicate slugs
    const existing = slugIndex.get(metadata.slug);
    if (existing) {
      throw new DuplicateSlugError(metadata.slug, existing.path, path);
    }

    // Store the path, metadata, and component (already loaded eagerly)
    slugIndex.set(metadata.slug, {
      path,
      metadata,
      component
    });
  }

  return slugIndex;
}

// Build the index once at module initialization
const slugIndex = buildSlugIndex();

/**
 * Load all published blog posts, sorted by date (newest first)
 */
export async function getAllPosts(): Promise<Post[]> {
  // Convert the slug index to an array of posts
  const allPosts = Array.from(slugIndex.values()).map((entry) => ({
    ...entry.metadata,
    path: entry.path
  }));

  // Filter published posts and sort by date (newest first)
  return allPosts
    .filter((post) => post.published !== false)
    .sort((a, b) => {
      const aTime = typeof a.date === 'string' ? new Date(a.date).getTime() : a.date.getTime();
      const bTime = typeof b.date === 'string' ? new Date(b.date).getTime() : b.date.getTime();
      return bTime - aTime;
    });
}

/**
 * Get the most recent N posts
 */
export async function getRecentPosts(limit: number): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.slice(0, limit);
}

/**
 * Load a single post by slug
 * Uses the slug index to find the correct file regardless of filename
 */
export async function getPostBySlug(
  slug: string
): Promise<{ content: Component; metadata: PostMetadata } | null> {
  const entry = slugIndex.get(slug);

  if (!entry) {
    return null;
  }

  return {
    content: entry.component,
    metadata: entry.metadata
  };
}

/**
 * Validate that a post matches the expected date components
 */
export function validatePostDate(
  metadata: PostMetadata,
  year: string,
  month: string,
  day: string
): boolean {
  // Normalize to YYYY-MM-DD string, handling both string and Date inputs
  let dateStr: string;
  if (typeof metadata.date === 'string') {
    dateStr = metadata.date.split('T')[0];
  } else {
    dateStr = metadata.date.toISOString().split('T')[0];
  }

  const [postYear, postMonth, postDay] = dateStr.split('-');

  return postYear === year && postMonth === month && postDay === day;
}

/**
 * Get raw content of a post by slug (for text/plain endpoints)
 * Uses Vite's glob import with ?raw query
 */
const rawPosts = import.meta.glob('../../content/blog/*.{md,svx}', {
  query: '?raw',
  import: 'default',
  eager: true
});

/**
 * Build a mapping from slug to raw content
 */
function buildRawContentIndex(): Map<string, string> {
  const rawIndex = new Map<string, string>();

  // Map each slug to its raw content using the path from the slug index
  for (const [slug, entry] of slugIndex.entries()) {
    const rawContent = rawPosts[entry.path] as string | undefined;
    if (rawContent) {
      rawIndex.set(slug, rawContent);
    }
  }

  return rawIndex;
}

// Build the raw content index once at module initialization
const rawContentIndex = buildRawContentIndex();

export function getRawPostBySlug(slug: string): string | null {
  return rawContentIndex.get(slug) ?? null;
}

/**
 * Format a date string from post frontmatter consistently
 * Avoids timezone issues by extracting date components directly
 * and creating a date in the local timezone
 */
export function formatPostDate(dateInput: string | Date): string {
  // Normalize to YYYY-MM-DD string, handling both string and Date inputs
  let dateStr: string;
  if (typeof dateInput === 'string') {
    // If it's a string, take just the date part (before any T or time component)
    dateStr = dateInput.split('T')[0];
  } else {
    // If it's a Date object (YAML auto-parses dates), convert to ISO and take date part
    dateStr = dateInput.toISOString().split('T')[0];
  }

  // Extract year, month, day components
  const [year, month, day] = dateStr.split('-').map(Number);

  // Create date using local timezone at noon to avoid any DST edge cases
  // This ensures the date components stay exactly as specified in frontmatter
  const date = new Date(year, month - 1, day, 12, 0, 0);

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
