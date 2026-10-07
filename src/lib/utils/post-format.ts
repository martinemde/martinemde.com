/** Lightweight display helpers. This module must not import the post loader. */

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
