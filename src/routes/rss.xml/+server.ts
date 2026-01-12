import { getRecentPosts, getRawPostBySlug, type Post } from '$lib/utils/posts';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';
import { PUBLIC_APP_URL } from '$env/static/public';

const siteUrl = PUBLIC_APP_URL;
const siteTitle = 'Martin Emde';
const siteDescription = 'Blog posts by Martin Emde';

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
  const items = await Promise.all(posts.map(createFeedItem));
  return items.join('');
}

async function createFeedItem(post: Post): Promise<string> {
  const htmlContent = await convertMarkdownToHtml(post.slug);
  const pubDate = convertToUtcDate(post.date);

  // Prepend header image if exists
  const imageHtml = post.image
    ? `<img src="${escapeXml(post.image)}" alt="${escapeXml(post.title)}" style="max-width: 100%; height: auto; margin-bottom: 1em;" />`
    : '';
  const fullContent = imageHtml + htmlContent;

  return `
		<item>
			<title>${escapeXml(post.title)}</title>
			<description>${escapeXml(post.description || '')}</description>
			<link>${siteUrl}/blog/${post.slug}</link>
			<guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
			<pubDate>${pubDate.toUTCString()}</pubDate>
			${post.image ? `<enclosure url="${escapeXml(post.image)}" type="image/jpeg" length="0"/>` : ''}
			<content:encoded><![CDATA[${fullContent}]]></content:encoded>
		</item>`;
}

async function convertMarkdownToHtml(slug: string): Promise<string> {
  const rawContent = getRawPostBySlug(slug);
  if (!rawContent) return '';

  const contentWithoutFrontmatter = rawContent.replace(/^---[\s\S]*?---\n/, '');

  const result = await unified()
    .use(remarkParse)
    .use(remarkHtml)
    .process(contentWithoutFrontmatter);

  const html = String(result);

  // Escape ]]> within CDATA by replacing it with ]]]]><![CDATA[>
  return html.replace(/\]\]>/g, ']]]]><![CDATA[>');
}

function convertToUtcDate(localDate: Date): Date {
  const year = localDate.getFullYear();
  const month = localDate.getMonth();
  const day = localDate.getDate();

  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
