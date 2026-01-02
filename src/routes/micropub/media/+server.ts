import { error } from '@sveltejs/kit';
import { createStorageBackend } from '$lib/server/storage/factory';
import type { RequestHandler } from './$types';

/**
 * POST /micropub/media
 * Upload an image file to the blog
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  // Require authentication
  if (!locals.githubToken) {
    error(401, 'Unauthorized');
  }

  try {
    // Create storage backend
    const backend = createStorageBackend(locals.githubToken);

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
