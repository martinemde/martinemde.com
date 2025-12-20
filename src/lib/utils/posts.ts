/**
 * Utility functions for loading blog posts
 * Uses Vite's import.meta.glob for build-time processing
 */

import type { Component } from 'svelte';

export interface PostMetadata {
  title: string;
  date: Date; // Normalized to Date object at load time
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
  constructor(slug: string, path1: string, path2: string) {
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

interface PostIndexEntry {
  path: string;
  metadata: PostMetadata;
  component: Component;
}

/**
 * Extract basename from file path (without extension)
 */
function getBasename(path: string): string {
  const filename = path.split('/').pop() || 'untitled';
  return filename.replace(/\.(md|svx)$/, '');
}

/**
 * Check if metadata has all required fields
 */
function hasRequiredFields(meta: Record<string, unknown>): boolean {
  return Boolean(meta.title && meta.slug && meta.date);
}

/**
 * Check if a value is a valid date (string or Date object)
 */
function isValidDate(value: unknown): value is string | Date {
  return typeof value === 'string' || value instanceof Date;
}

/**
 * Parse a date string or Date object to a Date, using local timezone at noon
 * This avoids timezone issues by ensuring the date components match the input
 */
function parseToDate(value: string | Date): Date {
  if (value instanceof Date) {
    // If YAML already parsed it to a Date, extract components and recreate
    // at noon local time to avoid timezone drift
    const dateStr = value.toISOString().split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  // Parse YYYY-MM-DD string to Date at noon local time
  const dateStr = value.split('T')[0];
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Get today's date as a Date object
 */
function getTodayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
}

/**
 * Fill in missing frontmatter with sensible defaults
 * Posts with any missing required fields become drafts
 * Normalizes dates to Date objects at load time
 */
function normalizeMetadata(metadata: unknown, path: string): PostMetadata {
  const meta =
    metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {};

  // Warn about posts that had missing frontmatter
  if (!hasRequiredFields(meta)) {
    console.warn(
      `Auto-filled missing frontmatter for ${path} (marked as draft). ` +
        `Add title, date, and slug to publish.`
    );
  }

  const basename = getBasename(path);
  const isComplete = hasRequiredFields(meta);

  return {
    title: typeof meta.title === 'string' ? meta.title : `Draft: ${basename}`,
    date: isValidDate(meta.date) ? parseToDate(meta.date) : getTodayDate(),
    slug: typeof meta.slug === 'string' ? meta.slug : basename,
    author: typeof meta.author === 'string' ? meta.author : 'Martin Emde',
    description: typeof meta.description === 'string' ? meta.description : `Draft: ${basename}`,
    published: isComplete ? meta.published !== false : false
  };
}

/**
 * Build and validate the slug-to-path mapping
 * Throws DuplicateSlugError if duplicate slugs are found
 * Auto-fills missing frontmatter with defaults (marking as drafts)
 */
function buildPostIndex(): Map<string, PostIndexEntry> {
  const postIndex = new Map<string, PostIndexEntry>();

  for (const [path, module] of Object.entries(allPostFiles)) {
    const typedModule = module as { default: Component; metadata?: unknown };
    const { metadata: rawMetadata, default: component } = typedModule;

    const metadata = normalizeMetadata(rawMetadata, path);
    const slug = metadata.slug;

    // Check for duplicate slugs
    const existing = postIndex.get(slug);
    if (existing) {
      throw new DuplicateSlugError(slug, existing.path, path);
    }

    // Store the path, metadata, and component
    postIndex.set(slug, {
      path,
      metadata,
      component
    });
  }

  return postIndex;
}

// Build the index once at module initialization
const postIndex = buildPostIndex();

/**
 * Load all published blog posts, sorted by date (newest first)
 */
export async function getAllPosts(): Promise<Post[]> {
  // Convert the slug index to an array of posts
  const allPosts = Array.from(postIndex.values()).map(
    (entry): Post => ({
      ...entry.metadata,
      path: entry.path
    })
  );

  // Filter published posts and sort by date (newest first)
  return allPosts
    .filter((post) => post.published === true)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
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
  const entry = postIndex.get(slug);

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
  const postYear = metadata.date.getFullYear().toString();
  const postMonth = (metadata.date.getMonth() + 1).toString().padStart(2, '0');
  const postDay = metadata.date.getDate().toString().padStart(2, '0');

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
  for (const [slug, entry] of postIndex.entries()) {
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
 * Format a date from post frontmatter consistently
 * The date is already normalized to local timezone at noon,
 * so we can format it directly
 */
export function formatPostDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
