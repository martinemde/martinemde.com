import { error } from '@sveltejs/kit';
import { PUBLIC_APP_URL } from '$env/dynamic/public';
import { uploadImage } from '$lib/server/github';
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

  const token = locals.githubToken;

  try {
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

    // Upload to GitHub
    const imageUrl = await uploadImage({
      filename: file.name,
      content: buffer,
      message: `Add image: ${file.name}`,
      token
    });

    // Return 201 Created with Location header
    const fullUrl = `${PUBLIC_APP_URL}${imageUrl}`;
    return new Response(null, {
      status: 201,
      headers: {
        Location: fullUrl,
        'Content-Type': 'text/plain'
      }
    });
  } catch (err) {
    console.error('Media upload error:', err);
    error(500, 'Failed to upload image');
  }
};
