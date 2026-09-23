import type { RequestHandler } from './$types';
import { getAllPosts, postDisplayTitle } from '$lib/utils/posts';
import { PUBLIC_APP_URL } from '$env/static/public';

/**
 * GET /llms.txt
 * Returns a plain text markdown list of all blog posts in most recent first order
 */
export const GET: RequestHandler = async () => {
  const posts = await getAllPosts();
  const baseUrl = PUBLIC_APP_URL;

  // Generate markdown content
  let content = '# Martin Emde\n\n';

  for (const post of posts) {
    const url = `${baseUrl}${post.permalink}.txt`;
    content += `- [${postDisplayTitle(post)}](${url})\n`;
  }

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
};
