import { GITHUB_OWNER } from '$env/static/private';

export interface MicropubProperties {
  name?: string | string[];
  content?: string | string[] | { html?: string; text?: string }[];
  category?: string | string[];
  published?: string | string[];
  slug?: string | string[];
  description?: string | string[];
}

export interface MicropubRequest {
  type?: string[];
  properties?: MicropubProperties;
  h?: string;
  // Form-encoded properties
  name?: string;
  content?: string;
  category?: string;
  published?: string;
  slug?: string;
  description?: string;
}

export interface BlogPost {
  title: string;
  content: string;
  slug: string;
  date: string;
  published: boolean;
  description?: string;
  author: string;
  categories?: string[];
}

/**
 * Normalize a property value to a single string
 */
function normalizeProperty(value: string | string[] | undefined, defaultValue = ''): string {
  if (!value) return defaultValue;
  if (Array.isArray(value)) return value[0] || defaultValue;
  return value;
}

/**
 * Normalize content property which can be string, array, or object
 */
function normalizeContent(
  content: string | string[] | { html?: string; text?: string }[] | undefined
): string {
  if (!content) return '';

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    // Handle array of content objects
    if (typeof content[0] === 'string') {
      return content[0];
    }
    // Handle { html, text } format
    if (typeof content[0] === 'object') {
      return content[0].text || content[0].html || '';
    }
  }

  return '';
}

/**
 * Normalize categories which can be string or array
 */
function normalizeCategories(category: string | string[] | undefined): string[] | undefined {
  if (!category) return undefined;
  if (Array.isArray(category)) return category;
  return category.split(',').map((c) => c.trim());
}

/**
 * Generate a slug from a title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse Micropub request to blog post data
 */
export function parseMicropubRequest(request: MicropubRequest): BlogPost {
  // Support both JSON format (properties) and form-encoded format (direct fields)
  const props = request.properties || {};

  const title =
    normalizeProperty(props.name || request.name) || 'Untitled Post';
  const content = normalizeContent(props.content || request.content);
  const rawSlug = normalizeProperty(props.slug || request.slug);
  const slug = rawSlug || generateSlug(title);
  const rawPublished = normalizeProperty(props.published || request.published);
  const date = rawPublished || new Date().toISOString();
  const description = normalizeProperty(props.description || request.description);
  const categories = normalizeCategories(props.category || request.category);

  return {
    title,
    content,
    slug,
    date,
    published: true, // Micropub posts are published by default
    description: description || undefined,
    author: GITHUB_OWNER,
    categories
  };
}

/**
 * Convert blog post data to markdown file content with frontmatter
 */
export function generateMarkdownFile(post: BlogPost): string {
  const frontmatter: string[] = ['---'];

  // Add required fields
  frontmatter.push(`title: '${post.title.replace(/'/g, "''")}'`);
  frontmatter.push(`date: ${post.date}`);
  frontmatter.push(`author: ${post.author}`);

  // Add optional description
  if (post.description) {
    frontmatter.push(`description: '${post.description.replace(/'/g, "''")}'`);
  }

  // Add published status
  frontmatter.push(`published: ${post.published}`);

  // Add slug
  frontmatter.push(`slug: ${post.slug}`);

  // Add categories if present
  if (post.categories && post.categories.length > 0) {
    frontmatter.push('categories:');
    post.categories.forEach((cat) => {
      frontmatter.push(`  - ${cat}`);
    });
  }

  frontmatter.push('---');
  frontmatter.push('');

  // Add content
  return frontmatter.join('\n') + post.content + '\n';
}

/**
 * Generate file path for a blog post
 */
export function generateFilePath(post: BlogPost): string {
  // Parse the date to get year, month, day
  const date = new Date(post.date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // Format: src/content/blog/YYYY-MM-DD-slug.md
  return `src/content/blog/${year}-${month}-${day}-${post.slug}.md`;
}

/**
 * Generate commit message for a blog post
 */
export function generateCommitMessage(post: BlogPost, isUpdate = false): string {
  const action = isUpdate ? 'Update' : 'Add';
  return `${action} post: ${post.title}`;
}
