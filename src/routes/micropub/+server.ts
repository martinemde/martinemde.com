import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import {
  parseMicropubRequest,
  generateMarkdownFile,
  generateFilePath,
  generateCommitMessage
} from '$lib/server/micropub';
import { createStorageBackend } from '$lib/server/storage/factory';
import { getAccessToken } from '$lib/server/token-store';
import type { RequestHandler } from './$types';

/**
 * Extract GitHub token from request
 * Supports:
 * - Session-based auth (locals.githubToken) for editor
 * - Bearer token in Authorization header (Micropub spec requirement)
 * - access_token in request body/query (Micropub spec requirement)
 */
async function getGithubToken(
  request: Request,
  locals: App.Locals,
  url?: URL
): Promise<string | null> {
  // Check session-based auth first (for editor)
  if (locals.githubToken) {
    return locals.githubToken;
  }

  // Check for Bearer token in Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const tokenId = authHeader.substring(7);
    const token = getAccessToken(tokenId);

    if (token) {
      return token.githubToken;
    }
  }

  // Check for access_token in query parameters (GET requests)
  if (url) {
    const queryToken = url.searchParams.get('access_token');
    if (queryToken) {
      const token = getAccessToken(queryToken);
      if (token) {
        return token.githubToken;
      }
    }
  }

  // Check for access_token in request body (POST requests)
  // Note: We'll extract this in the handler since we need to read the body
  return null;
}

/**
 * GET /micropub?q=config
 * Return Micropub configuration
 */
export const GET: RequestHandler = async ({ url, request, locals }) => {
  const query = url.searchParams.get('q');

  // Require authentication for all queries (check Authorization header and query params)
  const githubToken = await getGithubToken(request, locals, url);
  if (!githubToken) {
    error(401, 'Unauthorized');
  }

  if (query === 'config') {
    return json({
      'media-endpoint': `${env.PUBLIC_APP_URL}/micropub/media`,
      'syndicate-to': []
    });
  }

  error(400, 'Invalid query parameter');
};

/**
 * POST /micropub
 * Create a new blog post
 */
export const POST: RequestHandler = async ({ request, locals, url }) => {
  try {
    // Parse request body first to check for access_token
    const contentType = request.headers.get('content-type') || '';
    let micropubRequest: Record<string, unknown>;
    let bodyToken: string | null = null;

    if (contentType.includes('application/json')) {
      micropubRequest = await request.json();
      const jsonToken = micropubRequest.access_token;
      bodyToken = typeof jsonToken === 'string' ? jsonToken : null;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      micropubRequest = Object.fromEntries(formData);
      const formToken = formData.get('access_token');
      bodyToken = typeof formToken === 'string' ? formToken : null;
    } else {
      error(
        415,
        'Unsupported content type. Use application/json or application/x-www-form-urlencoded'
      );
    }

    // Check authentication (session, Authorization header, query param, or body param)
    let githubToken = await getGithubToken(request, locals, url);

    // If not authenticated via header/session/query, check body access_token
    if (!githubToken && bodyToken) {
      const token = getAccessToken(bodyToken);
      if (token) {
        githubToken = token.githubToken;
      }
    }

    if (!githubToken) {
      error(401, 'Unauthorized');
    }

    // Create storage backend
    const backend = createStorageBackend(githubToken);

    // Parse Micropub request to blog post data
    const post = parseMicropubRequest(micropubRequest);

    // Generate file path and content
    const filePath = generateFilePath(post);
    const content = generateMarkdownFile(post);

    // Check if file already exists
    const exists = await backend.fileExists(filePath);

    // Create or update file via storage backend
    const commitMessage = generateCommitMessage(post, exists);
    await backend.createOrUpdateFile(filePath, content, commitMessage);

    // Return 201 Created with Location header
    const postUrl = `${env.PUBLIC_APP_URL}/blog/${post.slug}`;
    return new Response(null, {
      status: 201,
      headers: {
        Location: postUrl,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    // Re-throw SvelteKit HttpErrors (auth failures, content type errors, etc.)
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Micropub POST error:', err);
    error(500, 'Failed to create post');
  }
};
