# GitHub OAuth + Micropub Blog Editor Setup

This document explains how to set up and use the GitHub OAuth authentication and Micropub blog editor for your SvelteKit blog.

## Overview

This implementation allows you to:

- **Authenticate** via GitHub OAuth to access the blog editor
- **Create blog posts** through a web-based editor with live markdown preview
- **Upload images** directly to your repository
- **Publish via Micropub protocol** (compatible with Micropub clients)

## Architecture

### Components

1. **Authentication Layer** (`/auth/github/*`)
   - GitHub OAuth login/callback/logout
   - Encrypted session cookies using iron-session
   - Repository ownership verification

2. **Micropub API** (`/micropub`)
   - POST endpoint for creating blog posts
   - GET endpoint for configuration queries
   - Media endpoint for image uploads

3. **Blog Editor** (`/editor`)
   - Web-based markdown editor
   - Live preview with tabs
   - Image upload support
   - Auto-generates slugs from titles

4. **Server Utilities** (`src/lib/server/`)
   - `auth.ts`: Session management and OAuth flow
   - `micropub.ts`: Micropub request transformation

5. **Storage Backends** (`src/lib/server/storage/`)
   - Abstraction layer for content storage
   - GitHub backend (production)
   - File backend (local development)
   - Test backend (unit tests)

## Storage Backends

The Micropub implementation uses a pluggable storage backend system that separates the content storage logic from the API logic. This allows for different storage mechanisms depending on the environment.

### Available Backends

#### 1. GitHub Backend (Production)

- **When**: Production environment or when `MICROPUB_BACKEND=github`
- **Requires**: GitHub OAuth token, `GITHUB_OWNER` and `GITHUB_REPO` env vars
- **Storage**: Commits directly to GitHub repository via API
- **Posts**: `src/content/blog/YYYY-MM-DD-slug.md`
- **Images**: `static/images/blog/filename.ext`

#### 2. File Backend (Local Development)

- **When**: Development mode or when `MICROPUB_BACKEND=file`
- **Requires**: No authentication needed
- **Storage**: Writes directly to local filesystem
- **Posts**: `src/content/blog/YYYY-MM-DD-slug.md`
- **Images**: `static/images/blog/filename.ext`
- **Use case**: Local development without GitHub API calls

#### 3. Test Backend (Testing)

- **When**: `MICROPUB_BACKEND=test` or injected in tests
- **Requires**: Nothing
- **Storage**: In-memory only (data lost when process ends)
- **Use case**: Unit tests without filesystem or network I/O

### Backend Selection

The backend is automatically selected based on environment:

1. **Environment variable override**: Set `MICROPUB_BACKEND` to `github`, `file`, or `test`
2. **Auto-detection** (if no env var set):
   - **Dev mode** (`bun run dev`): File backend
   - **Production**: GitHub backend

Examples:

```bash
# Use file backend explicitly
MICROPUB_BACKEND=file bun run dev

# Use GitHub backend in development (requires authentication)
MICROPUB_BACKEND=github bun run dev

# Default: auto-detects (file in dev, GitHub in production)
bun run dev
```

### Testing with Different Backends

```typescript
// Unit test example
import { TestStorageBackend } from '$lib/server/storage/test';

const backend = new TestStorageBackend();
await backend.createOrUpdateFile('test.md', 'content', 'message');

// Assert stored content
expect(backend.getFile('test.md')).toBe('content');
```

### Environment Configuration

Add to your `.env` file:

```bash
# Optional: Override backend selection
# Options: github, file, test
# Default: auto-detects (file in dev, github in production)
MICROPUB_BACKEND=file

# GitHub backend configuration (required for production)
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repository_name  # Optional, defaults to OWNER.github.io
```

## Using Micropub Clients

Any Micropub-compatible client can publish to your blog:

1. **Endpoint**: `https://yourdomain.com/micropub`
2. **Authentication**: Include GitHub token in Authorization header or use session
3. **Supported properties**:
   - `name`: Post title
   - `content`: Post body (markdown)
   - `slug`: URL slug
   - `description`: Post description
   - `category`: Tags/categories
   - `published`: Publication date

Example Micropub request:

```bash
curl -X POST https://yourdomain.com/micropub \
  -H "Content-Type: application/json" \
  -d '{
    "type": ["h-entry"],
    "properties": {
      "name": ["My New Post"],
      "content": ["# Hello\n\nThis is my post content."],
      "slug": ["my-new-post"],
      "category": ["tech", "blog"]
    }
  }'
```

### Image Upload

Images uploaded through the editor or media endpoint are stored in:

- Path: `static/images/blog/YYYY-MM-DD-filename.ext`
- Public URL: `/images/blog/YYYY-MM-DD-filename.ext`

## Security Considerations

1. **Public vs Protected Endpoints**:
   - **Public**: `/editor` page (anyone can draft posts)
   - **Protected**: `/micropub` and `/micropub/media` (require authentication)
   - Authentication checked server-side when attempting to publish or upload

2. **OAuth Scope**: Requests `repo` scope for full repository access
   - Required to create/update files
   - Only grants access to users who own the repository

3. **Repository Ownership Verification**:
   - Checks that authenticated user owns the configured repository
   - Prevents unauthorized users from publishing

4. **Session Security**:
   - Encrypted cookies using iron-session
   - HttpOnly, Secure (HTTPS), SameSite=Lax
   - 7-day expiration

5. **CSRF Protection**:
   - State parameter in OAuth flow
   - Validated on callback

## Future Enhancements

Possible improvements:

- **IndieAuth**: Add IndieAuth support for broader compatibility
- **Publishing support**: Allow publishing drafts
- **Post editing**: Load and edit existing posts
- **Post deletion**: Delete posts through the editor
- **Rich media**: Support for videos, embeds
- **Syndication**: Cross-post to other platforms
- **Markdown editor**: Syntax highlighting, live preview side-by-side

## References

- [Micropub Specification](https://micropub.spec.indieweb.org/)
- [GitHub OAuth Apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps)
- [Octokit REST API](https://octokit.github.io/rest.js/)
- [iron-session](https://github.com/vvo/iron-session)
