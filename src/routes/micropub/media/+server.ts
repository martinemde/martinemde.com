import { error } from '@sveltejs/kit';
import { createStorageBackend } from '$lib/server/storage/factory';
import { getAccessToken } from '$lib/server/token-store';
import type { RequestHandler } from './$types';

/**
 * Extract GitHub token from request
 * Supports both session-based auth (locals.githubToken) and Bearer token auth
 */
function getGithubToken(request: Request, locals: App.Locals): string | null {
  // Check session-based auth first (for editor)
  if (locals.githubToken) {
    return locals.githubToken;
  }

  // Check for Bearer token (for IndieAuth clients)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const tokenId = authHeader.substring(7);
    const token = getAccessToken(tokenId);

    if (token) {
      return token.githubToken;
    }
  }

  return null;
}

/**
 * POST /micropub/media
 * Upload an image file to the blog
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  // Require authentication (session or Bearer token)
  const githubToken = getGithubToken(request, locals);
  if (!githubToken) {
    error(401, 'Unauthorized');
  }

  try {
    // Create storage backend
    const backend = createStorageBackend(githubToken);

    // Parse multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      error(400, 'No file provided');
    }

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      error(415, 'File must be an image');
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload via storage backend
    const imageUrl = await backend.uploadImage(file.name, buffer, file.type);

    // Return 201 Created with Location header
    return new Response(null, {
      status: 201,
      headers: {
        Location: imageUrl,
        'Content-Type': 'text/plain'
      }
    });
  } catch (err) {
    console.error('Media upload error:', err);
    error(500, 'Failed to upload image');
  }
};
