import { getRecentPosts, getRawPostBySlug, type Post } from '$lib/utils/posts';
import { renderFeedItem } from '$lib/utils/feed';
import { PUBLIC_APP_URL } from '$env/static/public';

const siteUrl = PUBLIC_APP_URL;
const siteTitle = 'Martin Emde';
const siteDescription = 'Blog posts by Martin Emde';

export async function GET() {
  const posts = await getRecentPosts(20);
  const buildDate = new Date();
  const latestPostDate = posts.length > 0 ? posts[0].date : buildDate;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:source="https://source.scripting.com/">
	<channel>
		<title>${siteTitle}</title>
		<description>${siteDescription}</description>
		<link>${siteUrl}</link>
		<atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
		<source:self>${siteUrl}/rss.xml</source:self>
		<pubDate>${latestPostDate.toUTCString()}</pubDate>
		<lastBuildDate>${buildDate.toUTCString()}</lastBuildDate>
    ${await feedItems(posts)}
	</channel>
</rss>`.trim();

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'max-age=0, s-maxage=3600'
    }
  });
}

async function feedItems(posts: Post[]): Promise<string> {
  const items = await Promise.all(posts.map(createFeedItem));
  return items.join('');
}

async function createFeedItem(post: Post): Promise<string> {
  return renderFeedItem(post, getRawPostBySlug(post.slug) ?? '', siteUrl);
}
