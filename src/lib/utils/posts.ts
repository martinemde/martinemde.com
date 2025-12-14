/**
 * Utility functions for loading blog posts
 * Uses Vite's import.meta.glob for build-time processing
 */

export interface PostMetadata {
  title: string;
  date: string;
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
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
  // Parse the date string directly to avoid timezone issues
  // Dates in frontmatter are in YYYY-MM-DD format
  const dateStr = metadata.date.toString().split('T')[0]; // Get just the date part
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
 * Avoids timezone issues by treating dates as local dates
 */
export function formatPostDate(dateString: string): string {
  // Add time component to ensure date is parsed as local date
  const date = new Date(dateString + 'T00:00:00');
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
