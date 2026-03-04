/** Narrow an unknown error to one with an HTTP status (e.g. Octokit RequestError) */
export function hasHttpStatus(error: unknown): error is { status: number } {
  return typeof error === 'object' && error !== null && 'status' in error && typeof (error as { status: unknown }).status === 'number';
}

/** Narrow an unknown error to a Node filesystem error with a code string */
export function hasErrorCode(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && typeof (error as { code: unknown }).code === 'string';
}

/**
 * Metadata about a blog post file
 */
export interface BlogPostFileInfo {
  /** Base filename (e.g., "2025-01-01-my-post.md") */
  filename: string;
  /** Full path to the file (e.g., "src/content/blog/2025-01-01-my-post.md") */
  path: string;
  /** Slug extracted from filename */
  slug: string;
  /** Date extracted from filename (ISO string) */
  date: string;
}

/**
 * Storage backend interface for micropub content storage
 *
 * Implementations can use different backends (GitHub, filesystem, in-memory, etc.)
 * to store blog posts and images.
 */
export interface StorageBackend {
  /**
   * Create or update a file at the given path
   *
   * @param path - Relative path to the file (e.g., "src/content/blog/2025-01-01-post.md")
   * @param content - File content to write
   * @param message - Commit message or change description
   */
  createOrUpdateFile(path: string, content: string, message: string): Promise<void>;

  /**
   * Check if a file exists at the given path
   *
   * @param path - Relative path to the file
   * @returns true if file exists, false otherwise
   */
  fileExists(path: string): Promise<boolean>;

  /**
   * Read the contents of a file
   *
   * @param path - Relative path to the file
   * @returns File contents as a string
   */
  readFile(path: string): Promise<string>;

  /**
   * List all blog post files
   *
   * @returns Array of blog post file info, sorted by date (newest first)
   */
  listBlogPosts(): Promise<BlogPostFileInfo[]>;

  /**
   * Upload an image file
   *
   * @param filename - Name for the image file
   * @param buffer - Image file data
   * @param mimeType - MIME type of the image (e.g., "image/jpeg")
   * @returns URL where the image can be accessed
   */
  uploadImage(filename: string, buffer: Buffer, mimeType: string): Promise<string>;
}
