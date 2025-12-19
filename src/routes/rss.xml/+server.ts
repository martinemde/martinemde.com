import { getRecentPosts, getRawPostBySlug, type Post } from '$lib/utils/posts';
import { marked } from 'marked';

const siteUrl = 'https://martinemde.com';
const siteTitle = 'Martin Emde';
const siteDescription = 'Blog posts by Martin Emde';
const siteEmail = 'me@martinemde.com';

export async function GET() {
  const posts = await getRecentPosts(20);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
	<channel>
		<title>${siteTitle}</title>
		<description>${siteDescription}</description>
		<link>${siteUrl}</link>
		<atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
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
  const items = await Promise.all(
    posts.map(async (post) => {
      // Get the raw markdown content
      const rawContent = getRawPostBySlug(post.slug);

      // Convert markdown to HTML
      let htmlContent = '';
      if (rawContent) {
        // Remove frontmatter from the raw content
        const contentWithoutFrontmatter = rawContent.replace(/^---[\s\S]*?---\n/, '');
        htmlContent = await marked(contentWithoutFrontmatter);
        // Escape ]]> within CDATA by replacing it with ]]]]><![CDATA[>
        htmlContent = htmlContent.replace(/\]\]>/g, ']]]]><![CDATA[>');
      }

      // Normalize date to avoid timezone issues
      let dateStr: string;
      if (typeof post.date === 'string') {
        dateStr = post.date.split('T')[0];
      } else {
        dateStr = post.date.toISOString().split('T')[0];
      }
      const [year, month, day] = dateStr.split('-').map(Number);
      const pubDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

      return `
		<item>
			<title>${escapeXml(post.title)}</title>
			<description>${escapeXml(post.description || '')}</description>
			<link>${siteUrl}/blog/${post.slug}</link>
			<guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
			<pubDate>${pubDate.toUTCString()}</pubDate>
			<content:encoded><![CDATA[${htmlContent}]]></content:encoded>
		</item>`;
    })
  );

  return items.join('');
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
