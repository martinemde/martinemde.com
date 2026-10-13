import { describe, expect, it } from 'vitest';
import { getAllPosts } from '#lib/utils/posts.ts';
import { dayPath } from '#lib/utils/post-model.ts';
import { postRouteParams } from '#lib/utils/post-routing.ts';
import {
  blogMarkdown,
  dayMarkdown,
  demoteHeadings,
  homeMarkdown,
  monthMarkdown,
  simpleHtmlToMarkdown,
  streamMarkdown,
  yearMarkdown
} from './markdown-pages.ts';

const origin = 'https://example.com';

async function pages() {
  const [latest] = await getAllPosts();
  const { year, month, day } = postRouteParams(latest);
  return {
    '/index.md': await homeMarkdown(),
    '/stream.md': await streamMarkdown(),
    '/blog.md': await blogMarkdown(),
    [`/${year}.md`]: await yearMarkdown(year),
    [`/${year}/${month}.md`]: await monthMarkdown(year, month),
    [`/${year}/${month}/${day}.md`]: await dayMarkdown(year, month, day)
  };
}

describe('Markdown index views', () => {
  it('serve plain text like the post .md endpoints', async () => {
    for (const [path, response] of Object.entries(await pages())) {
      expect(response.headers.get('Content-Type'), path).toBe('text/plain; charset=utf-8');
      expect(await response.text(), path).toMatch(/^(\[~\]\(.*\n\n)?# .+\n/);
    }
  });

  it('link only to .md views that exist, so the site can be walked in plain text', async () => {
    const posts = await getAllPosts();
    const targets = new Set<string>(['/index.md', '/stream.md', '/blog.md']);
    for (const post of posts) {
      const day = dayPath(post);
      targets.add(`${post.permalink}.md`);
      targets.add(`${day}.md`);
      targets.add(`${day.slice(0, 8)}.md`);
      targets.add(`${day.slice(0, 5)}.md`);
    }
    for (const [path, response] of Object.entries(await pages())) {
      const text = await response.text();
      const links = [...text.matchAll(/\]\((https:\/\/example\.com[^)\s]*\.md)\)/g)].map((m) =>
        m[1].slice(origin.length)
      );
      expect(links.length, path).toBeGreaterThan(0);
      for (const link of links) expect(targets, `${path} -> ${link}`).toContain(link);
    }
  });

  it('nest headings one level at a time', async () => {
    for (const [path, response] of Object.entries(await pages())) {
      let depth = 0;
      let fence = false;
      for (const line of (await response.text()).split('\n')) {
        if (/^(```|~~~)/.test(line)) fence = !fence;
        const level = !fence && /^(#{1,6}) /.exec(line)?.[1].length;
        if (!level) continue;
        expect(level, `${path}: ${line}`).toBeLessThanOrEqual(depth + 1);
        depth = level;
      }
    }
  });

  it('leave no publisher link or photo HTML in the text', async () => {
    const text = await (await streamMarkdown()).text();
    expect(text).not.toMatch(/<a\s|<img\s/i);
  });

  it('retain the archive 404s for periods with nothing published', async () => {
    await expect(yearMarkdown('1999')).rejects.toMatchObject({ status: 404 });
    await expect(monthMarkdown('1999', '01')).rejects.toMatchObject({ status: 404 });
    await expect(dayMarkdown('1999', '01', '01')).rejects.toMatchObject({ status: 404 });
  });
});

describe('demoteHeadings', () => {
  it('moves headings below the entry heading but leaves code alone', () => {
    expect(demoteHeadings('# One\n\n```sh\n# comment\n```\n\n###### Six', 3)).toBe(
      '#### One\n\n```sh\n# comment\n```\n\n###### Six'
    );
  });
});

describe('simpleHtmlToMarkdown', () => {
  it('rewrites the publisher bookmark link and photo as Markdown', () => {
    expect(
      simpleHtmlToMarkdown(
        '<a class="u-bookmark-of" href="https://example.org/a?b=1&amp;c=2">A &amp; B</a> — note\n' +
          '<img src="https://example.com/p.png" alt="A &quot;quoted&quot; [thing]" />'
      )
    ).toBe(
      '[A & B](https://example.org/a?b=1&c=2) — note\n' +
        '![A "quoted" \\[thing\\]](https://example.com/p.png)'
    );
  });

  it('uses an autolink when the link text is the URL', () => {
    expect(simpleHtmlToMarkdown('<a href="https://example.org">https://example.org</a>')).toBe(
      '<https://example.org>'
    );
  });

  it('leaves other HTML and code untouched', () => {
    const source =
      '<figure><a href="/x"><img src="/x.png"></a></figure>\n```\n<a href="y">y</a>\n```';
    expect(simpleHtmlToMarkdown(source)).toBe(
      '<figure><a href="/x">![](/x.png)</a></figure>\n```\n<a href="y">y</a>\n```'
    );
  });
});
