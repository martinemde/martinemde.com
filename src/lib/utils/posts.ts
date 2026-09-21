/**
 * Utility functions for loading blog posts
 * Uses Vite's import.meta.glob for build-time processing
 */

import type { Component } from 'svelte';

import { normalizePostMetadata } from './post-model';
import type { PostMetadata } from './post-model';
export type { PostMetadata } from './post-model';
export { postDisplayTitle } from './post-model';

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

const rawPosts = import.meta.glob('../../content/blog/*.{md,svx}', {
  query: '?raw',
  import: 'default',
  eager: true
});

interface PostIndexEntry {
  path: string;
  metadata: PostMetadata;
  component: Component;
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

    const metadata = normalizePostMetadata(
      rawMetadata,
      path,
      (rawPosts[path] as string | undefined) ?? ''
    );
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
  const allPosts = Array.from(postIndex.values()).map((entry): Post => ({
    ...entry.metadata,
    path: entry.path
  }));

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
  metadata: Pick<PostMetadata, 'date'>,
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

/**
 * Format a post date compactly, e.g. "Jan 22, 2026" (for list/meta rows).
 */
export function formatPostDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Calculate estimated reading time for a blog post
 * Uses 200 words per minute as the baseline reading speed
 * Strips frontmatter and counts remaining words
 */
export function calculateReadingTime(rawContent: string): string {
  // Remove frontmatter (everything between --- delimiters)
  const contentWithoutFrontmatter = rawContent.replace(/^---[\s\S]*?---/, '');

  // Count words (split by whitespace and filter empty strings)
  const words = contentWithoutFrontmatter.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Calculate reading time (200 words per minute)
  const minutes = Math.ceil(wordCount / 200);

  return `${minutes} min read`;
}

/**
 * Get reading time for a post by slug
 */
export function getReadingTime(slug: string): string {
  const rawContent = getRawPostBySlug(slug);
  if (!rawContent) {
    return '1 min read';
  }
  return calculateReadingTime(rawContent);
}

/** Renderable public entries shared by the stream and homepage. */
export async function getStreamEntries(limit?: number) {
  const posts = await getAllPosts();
  return posts.slice(0, limit).map((post) => ({
    metadata: post,
    content: postIndex.get(post.slug)!.component
  }));
}

export async function getArticles() {
  return (await getAllPosts()).filter((post) => post.type === 'article');
}

export function getPublishedSlugs(): string[] {
  return [...postIndex.values()]
    .filter((entry) => entry.metadata.published)
    .map((entry) => entry.metadata.slug);
}
