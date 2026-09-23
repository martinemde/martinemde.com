/**
 * Utility functions for loading blog posts
 * Uses Vite's import.meta.glob for build-time processing
 */

import type { Component } from 'svelte';

import { dayPath, normalizePostMetadata } from './post-model';
import type { PostMetadata } from './post-model';
export type { PostMetadata } from './post-model';
export { dayPath, postDisplayTitle } from './post-model';

export interface Post extends PostMetadata {
  path: string;
}

/**
 * Error thrown when two posts would share a permalink
 */
export class DuplicatePermalinkError extends Error {
  constructor(permalink: string, path1: string, path2: string) {
    super(
      `Duplicate permalink "${permalink}" found in:\n  - ${path1}\n  - ${path2}\n\nSlugs must be unique within a day.`
    );
    this.name = 'DuplicatePermalinkError';
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
 * Build and validate the permalink-to-path mapping
 * Throws DuplicatePermalinkError if two posts share a permalink
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
    const existing = postIndex.get(metadata.permalink);
    if (existing) {
      throw new DuplicatePermalinkError(metadata.permalink, existing.path, path);
    }

    postIndex.set(metadata.permalink, {
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
  // Convert the permalink index to an array of posts
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
 * Load a single post by its permalink, e.g. /2026/07/21/134309
 */
export async function getPost(
  permalink: string
): Promise<{ content: Component; metadata: PostMetadata } | null> {
  const entry = postIndex.get(permalink);
  return entry ? { content: entry.component, metadata: entry.metadata } : null;
}

/**
 * Find a post from a legacy /blog/slug URL. Slugs only need to be unique
 * within a day, so an ambiguous slug finds nothing.
 */
export function getPostBySlug(slug: string): PostMetadata | null {
  const matches = [...postIndex.values()].filter((entry) => entry.metadata.slug === slug);
  return matches.length === 1 ? matches[0].metadata : null;
}

/**
 * Raw source of a post (for text/plain endpoints)
 */
export function getRawPost(permalink: string): string | null {
  const entry = postIndex.get(permalink);
  return (entry && (rawPosts[entry.path] as string | undefined)) ?? null;
}

/**
 * Format a date from post frontmatter consistently
 * Full timestamps retain their instant; date-only legacy values use a stable UTC anchor.
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
 * Get reading time for a post by permalink
 */
export function getReadingTime(permalink: string): string {
  const rawContent = getRawPost(permalink);
  if (!rawContent) {
    return '1 min read';
  }
  return calculateReadingTime(rawContent);
}

const streamEntry = (post: Post) => ({
  metadata: post,
  content: postIndex.get(post.permalink)!.component
});

/** Renderable public entries shared by the stream and homepage. */
export async function getStreamEntries(limit?: number) {
  return (await getAllPosts()).slice(0, limit).map(streamEntry);
}

/** Published entries for one day page, e.g. /2026/07/21 */
export async function getDayEntries(day: string) {
  return (await getAllPosts()).filter((post) => dayPath(post) === day).map(streamEntry);
}

export async function getArticles() {
  return (await getAllPosts()).filter((post) => post.type === 'article');
}

export function getPublishedPermalinks(): string[] {
  return [...postIndex.values()]
    .filter((entry) => entry.metadata.published)
    .map((entry) => entry.metadata.permalink);
}
