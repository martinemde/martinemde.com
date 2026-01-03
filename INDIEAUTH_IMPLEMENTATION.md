# IndieAuth Implementation Summary

## What We Built

A complete IndieAuth wrapper around GitHub OAuth that keeps your GitHub tokens secure and server-side.

## Architecture

### Flow Overview

1. **Micropub client discovers endpoints** from `<link>` tags in your HTML
2. **Client initiates authorization** at `/auth/indieauth/authorize`
3. **You authenticate with GitHub** (existing OAuth flow)
4. **Authorization code is issued** to the client
5. **Client exchanges code for access token** at `/auth/indieauth/token`
6. **Client uses access token** to publish via `/micropub`

### Key Components

#### 1. Authorization Endpoint (`/auth/indieauth/authorize`)

- Receives IndieAuth request with `me`, `client_id`, `redirect_uri`, `state`, PKCE parameters
- Validates parameters and domain ownership
- Stores request in session
- Redirects to GitHub OAuth

#### 2. GitHub Callback Enhancement (`/auth/github/callback`)

- Detects if this is an IndieAuth flow
- Creates sealed authorization code
- Redirects back to client with code

#### 3. Token Endpoint (`/auth/indieauth/token`)

- Exchanges authorization code for access token
- Verifies PKCE challenge if provided
- Issues token ID (stored server-side, maps to GitHub token)
- Returns IndieAuth-compliant response with `me` field

#### 4. Token Storage (`/lib/server/token-store.ts`)

- In-memory token storage (Map)
- Tokens expire after 30 days
- Auto-cleanup of expired tokens
- **GitHub tokens never exposed to clients**

#### 5. Micropub Endpoints (`/micropub`, `/micropub/media`)

- Accept both session auth (for editor) and Bearer token auth (for clients)
- Extract GitHub token from token store
- Use existing GitHub-backed storage

## Security Features

✅ **PKCE support** - Prevents authorization code interception  
✅ **State parameter** - CSRF protection  
✅ **Domain validation** - Ensures `me` parameter matches your site  
✅ **Token isolation** - GitHub tokens never leave the server  
✅ **Sealed auth codes** - Short-lived, encrypted with iron-session  
✅ **Repository ownership check** - Only repo owner can authenticate

## Files Modified/Created

### Created

- `src/routes/auth/indieauth/authorize/+server.ts`
- `src/routes/auth/indieauth/token/+server.ts`
- `src/lib/server/token-store.ts`

### Modified

- `src/app.html` - Added endpoint discovery links
- `src/lib/server/auth.ts` - Added IndieAuth types and helpers
- `src/routes/auth/github/callback/+server.ts` - Handle IndieAuth flow
- `src/routes/micropub/+server.ts` - Accept Bearer tokens
- `src/routes/micropub/media/+server.ts` - Accept Bearer tokens

## Testing

Try with a micropub client like:

- [Quill](https://quill.p3k.io/)
- [Indigenous](https://indigenous.realize.be/)
- [Micropublish](https://micropublish.net/)

The client should:

1. Discover your endpoints at `https://martinemde.com/`
2. Redirect you to GitHub for auth
3. Receive an access token
4. Successfully publish posts to your blog

## Token Lifecycle

```
Client Request → IndieAuth Authorize → GitHub OAuth → GitHub Callback
  ↓
Authorization Code (sealed, expires in 10 min)
  ↓
Client exchanges code → IndieAuth Token Endpoint
  ↓
Access Token ID (maps to GitHub token, expires in 30 days)
  ↓
Client sends to Micropub → Server looks up GitHub token → Creates post
```

## Production Considerations

- **Token storage is in-memory** - Tokens lost on server restart (acceptable for personal blog)
- **Add Redis/database** if you need persistent tokens
- **Monitor token store size** - Currently auto-cleans every hour
- **HTTPS required** - Cookies use `secure` flag in production

## Endpoint URLs

- Authorization: `https://martinemde.com/auth/indieauth/authorize`
- Token: `https://martinemde.com/auth/indieauth/token`
- Micropub: `https://martinemde.com/micropub`
- Media: `https://martinemde.com/micropub/media`
