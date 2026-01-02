import { error, json } from '@sveltejs/kit';
import { PUBLIC_APP_URL } from '$env/static/public';
import {
  parseMicropubRequest,
  generateMarkdownFile,
  generateFilePath,
  generateCommitMessage
} from '$lib/server/micropub';
import { createOrUpdateFile, fileExists } from '$lib/server/github';
import type { RequestHandler } from './$types';

/**
 * GET /micropub?q=config
 * Return Micropub configuration
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  const query = url.searchParams.get('q');

  // Require authentication for all queries
  if (!locals.githubToken) {
    error(401, 'Unauthorized');
  }

  if (query === 'config') {
    return json({
      'media-endpoint': `${PUBLIC_APP_URL}/micropub/media`,
      'syndicate-to': []
    });
  }

  error(400, 'Invalid query parameter');
};

/**
 * POST /micropub
 * Create a new blog post
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  // Require authentication
  if (!locals.githubToken) {
    error(401, 'Unauthorized');
  }

  const token = locals.githubToken;

  try {
    // Parse request body
    const contentType = request.headers.get('content-type') || '';
    let micropubRequest;

    if (contentType.includes('application/json')) {
      micropubRequest = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      micropubRequest = Object.fromEntries(formData);
    } else {
      error(
        415,
        'Unsupported content type. Use application/json or application/x-www-form-urlencoded'
      );
    }

    // Parse Micropub request to blog post data
    const post = parseMicropubRequest(micropubRequest);

    // Generate file path and content
    const filePath = generateFilePath(post);
    const content = generateMarkdownFile(post);

    // Check if file already exists
    const exists = await fileExists(filePath, token);

    // Create or update file in GitHub
    const commitMessage = generateCommitMessage(post, exists);
    await createOrUpdateFile({
      path: filePath,
      content,
      message: commitMessage,
      token
    });

    // Return 201 Created with Location header
    const postUrl = `${PUBLIC_APP_URL}/blog/${post.slug}`;
    return new Response(null, {
      status: 201,
      headers: {
        Location: postUrl,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('Micropub POST error:', err);
    error(500, 'Failed to create post');
  }
};
