/**
 * Utility functions for loading blog posts
 * Uses Vite's import.meta.glob for build-time processing
 */

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
 * Load all published blog posts, sorted by date (newest first)
 */
export async function getAllPosts(): Promise<Post[]> {
  const allPostFiles = import.meta.glob('../../content/blog/*.{md,svx}');
  const iterablePostFiles = Object.entries(allPostFiles);

  const allPosts = await Promise.all(
    iterablePostFiles.map(async ([path, resolver]) => {
      const resolved = (await resolver()) as {
        metadata: PostMetadata;
      };
      const { metadata } = resolved;

      return {
        ...metadata,
        path
      };
    })
  );

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
 * Tries both .md and .svx extensions
 */
export async function getPostBySlug(slug: string) {
  try {
    // Try .md extension first
    const post = await import(`../../content/blog/${slug}.md`);
    return {
      content: post.default,
      metadata: post.metadata as PostMetadata
    };
  } catch {
    try {
      // Try .svx extension
      const post = await import(`../../content/blog/${slug}.svx`);
      return {
        content: post.default,
        metadata: post.metadata as PostMetadata
      };
    } catch {
      return null;
    }
  }
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

export function getRawPostBySlug(slug: string): string | null {
  // Keys are relative to this file: ../../content/blog/slug.{md,svx}
  const mdKey = `../../content/blog/${slug}.md`;
  const svxKey = `../../content/blog/${slug}.svx`;

  return (rawPosts[mdKey] || rawPosts[svxKey]) as string | null;
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
