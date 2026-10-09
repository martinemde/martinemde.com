/** Lightweight display helpers. This module must not import the post loader. */
import { SITE_TIME_ZONE, markdownBody } from './post-model.ts';

// Date-only entries have a stable UTC anchor, not a known publication instant.
const dateTimeZone = (dateOnly: boolean) => (dateOnly ? 'UTC' : SITE_TIME_ZONE);

/** Format a publication date in the author's calendar (or its legacy calendar date). */
export function formatPostDate(date: Date, dateOnly = false): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: dateTimeZone(dateOnly)
  });
}

/** Format a compact publication date, e.g. "Jan 22, 2026". */
export function formatPostDateShort(date: Date, dateOnly = false): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: dateTimeZone(dateOnly)
  });
}

/** Format stream/day headings using the same calendar as publication dates. */
export function formatPostDay(date: Date, dateOnly = false): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: dateTimeZone(dateOnly)
  });
}

/** Show precise Pacific time, or a calendar date when the time is unknown. */
export function formatPostTime(date: Date, dateOnly = false): string {
  return dateOnly
    ? formatPostDateShort(date, true)
    : date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: SITE_TIME_ZONE
      });
}

/** HTML datetime: preserve known instants without inventing a legacy publication time. */
export function postDateTime(date: Date, dateOnly = false): string {
  return dateOnly ? date.toISOString().slice(0, 10) : date.toISOString();
}

/**
 * Calculate estimated reading time for a blog post
 * Uses 200 words per minute as the baseline reading speed
 * Strips frontmatter and counts remaining words
 */
export function calculateReadingTime(rawContent: string): string {
  // Share the line-aware body parser used by metadata and the feed.
  const contentWithoutFrontmatter = markdownBody(rawContent);

  // Count words (split by whitespace and filter empty strings)
  const words = contentWithoutFrontmatter.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Calculate reading time (200 words per minute)
  const minutes = Math.ceil(wordCount / 200);

  return `${minutes} min read`;
}
