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
   - `github.ts`: GitHub API interactions via Octokit
   - `micropub.ts`: Micropub request transformation

## Setup Instructions

**Important:**

- `.env` (committed) contains placeholder values for build-time type generation
- `.env.local` (gitignored) should contain your real secrets for local development
- For production, set real values in Cloudflare Pages dashboard
- Environment variables are loaded at **runtime** but must be declared at **build time**
- Use different OAuth apps for development and production
- Generate a strong random secret for `SESSION_SECRET` using `openssl rand -base64 32`

### 3. Verify Dependencies

The following dependencies are required and should already be installed:

```bash
bun add @octokit/rest iron-session
```

Existing dependencies used:

- `unified`, `remark-parse`, `remark-html` (for markdown rendering)
- `lucide-svelte` (for icons)

### 4. Development

Start the development server:

```bash
bun run dev
```

Navigate to:

- `http://localhost:5173/auth/login` - Start OAuth flow
- `http://localhost:5173/editor` - Blog editor (publicly accessible, authentication required to publish)

### 5. Production Deployment

#### Cloudflare Pages

1. Set environment variables in Cloudflare Pages dashboard:
   - Go to your Pages project → Settings → Environment variables
   - Add all variables from `.env` (use production values)

2. Update OAuth callback URL:
   - Update your GitHub OAuth app's callback URL to `https://yourdomain.com/auth/callback`
   - Update `PUBLIC_APP_URL` to `https://yourdomain.com`

3. Deploy:

   ```bash
   bun run build
   ```

## Usage

### Using the Web Editor

1. **Navigate to `/editor`**: The editor is publicly accessible for drafting
2. **Login** (required to publish): Click "Login" in the header and authorize the GitHub OAuth app
3. **Create a post**:
   - Enter title (slug auto-generates, or customize)
   - Add description (optional)
   - Add categories (comma-separated, optional)
   - Write content in markdown
   - Switch to Preview tab to see rendered output (rendered client-side in your browser)
   - Upload images using the "Upload Image" button (requires authentication)
4. **Publish**: Click "Create Post" (requires authentication)
5. **View post**: Click the link in the success message

### Using Micropub Clients

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

6. **Client-Side Rendering**:
   - Markdown preview rendered in browser (no server interaction)
   - No sensitive data exposed in preview rendering

### Images not uploading

- Check repository permissions
- Verify `static/images/blog/` directory exists (will be created automatically)
- Check file size limits

## Future Enhancements

Possible improvements:

- **IndieAuth**: Add IndieAuth support for broader compatibility
- **Draft support**: Save drafts without publishing
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
