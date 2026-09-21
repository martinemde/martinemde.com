import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';
import { markdownBody, type PostMetadata } from './post-model';

export const escapeXml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;'
      })[char]!
  );
const cdata = (value: string) => value.replace(/\]\]>/g, ']]]]><![CDATA[>');

export async function renderFeedItem(
  post: PostMetadata,
  source: string,
  siteUrl: string
): Promise<string> {
  const url = new URL(`/blog/${post.slug}`, siteUrl).href;
  const body = markdownBody(source);
  const markdown = post.image ? `![](${new URL(post.image, siteUrl).href})\n\n${body}` : body;
  // These are repository-authored Markdown/HTML files already compiled by MDsveX on
  // the site. Retain their HTML (including publisher photos and attributed quotes).
  const result = await unified()
    .use(remarkParse)
    .use(remarkHtml, { sanitize: false })
    .process(markdown);
  const html = String(result).replace(
    /(src|href)="([^"]*)"/g,
    (match, attribute: string, value: string) => {
      if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return match;
      return `${attribute}="${escapeXml(new URL(value.replace(/&amp;/g, '&'), url).href)}"`;
    }
  );
  return `<item>
    ${post.title ? `<title>${escapeXml(post.title)}</title>` : ''}
    <description>${escapeXml(html)}</description>
    <link>${escapeXml(url)}</link>
    <guid isPermaLink="true">${escapeXml(url)}</guid>
    <pubDate>${post.date.toUTCString()}</pubDate>
    ${post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join('')}
    <content:encoded><![CDATA[${cdata(html)}]]></content:encoded>
    <source:markdown><![CDATA[${cdata(markdown)}]]></source:markdown>
  </item>`;
}
