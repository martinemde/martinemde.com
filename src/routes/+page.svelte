<script lang="ts">
  import type { PageData } from './$types';
  import { formatPostDateShort, getReadingTime } from '$lib/utils/posts';
  import { projects } from '$lib/data/projects';
  import { resolve } from '$app/paths';

  let { data }: { data: PageData } = $props();

  const featured = projects.slice(0, 4);
  const linkLabel = (p: (typeof projects)[number]) => p.linktext ?? p.name;
</script>

<svelte:head>
  <title>Martin Emde</title>
  <meta name="description" content="Software Engineer" />
</svelte:head>

<section class="hero">
  <div class="eyebrow">// software engineer</div>
  <h1 class="hero-name">Martin Emde</h1>
  <p class="hero-lede">
    AI Developer Tools Engineer at
    <a href="https://gusto.com" rel="external">Gusto</a>.
  </p>
  <div class="chips">
    <a href="https://gusto.com" rel="external">
      <span class="chip"><span class="dot dot-a"></span>Gusto</span>
    </a>
    <a href="https://github.com/martinemde" rel="external">
      <span class="chip"><span class="dot dot-a"></span>open source</span>
    </a>
  </div>
</section>

<section class="block">
  <div class="section-head">
    <span class="sec-num">01</span>
    <h2 class="sec-title">Writing</h2>
    <span class="rule"></span>
    <a class="sec-link" href={resolve('/blog')}>all posts →</a>
  </div>
  <div class="post-list">
    {#each data.recentPosts as post (post.slug)}
      <a class="post-row" href={resolve(`/blog/${post.slug}`)}>
        <div class="post-meta">
          <span class="post-date">{formatPostDateShort(post.date)}</span>
          <span class="post-read">{getReadingTime(post.slug)}</span>
        </div>
        <div>
          <div class="post-title">{post.title}</div>
          {#if post.description}
            <div class="post-desc">{post.description}</div>
          {/if}
        </div>
      </a>
    {/each}
  </div>
</section>

<section class="block">
  <div class="section-head">
    <span class="sec-num">02</span>
    <h2 class="sec-title">Selected projects</h2>
    <span class="rule"></span>
    <a class="sec-link" href={resolve('/projects')}>all projects →</a>
  </div>
  <div class="proj-grid">
    <!-- project.url values are pre-resolved in projects.ts; the rule is a false positive here -->
    <!-- eslint-disable svelte/no-navigation-without-resolve -->
    {#each featured as project (project.name)}
      {@const Icon = project.icon}
      <a
        class="proj-card"
        href={project.url}
        rel={project.url.startsWith('/') ? undefined : 'external'}
      >
        <div class="proj-card-head">
          <span class="proj-name">
            <Icon size={17} />
            {project.name}
          </span>
        </div>
        <div class="proj-card-desc">{project.description}</div>
        <div class="proj-card-link">{linkLabel(project)} ↗</div>
      </a>
    {/each}
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
  </div>
</section>

<section class="elsewhere block">
  <span class="else-label">elsewhere:</span>
  <a href="https://github.com/martinemde" rel="external">github/@martinemde ↗</a>
  <a href="https://bsky.app/profile/martinemde.com" rel="external">bsky/@martinemde.com ↗</a>
</section>

<style>
  a {
    color: inherit;
    text-decoration: none;
  }

  .hero {
    max-width: 680px;
    padding: 88px 0 12px;
  }
  .hero .eyebrow {
    margin-bottom: 26px;
    font-size: 12.5px;
  }
  .hero-name {
    margin: 0 0 26px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 58px;
    line-height: 1.02;
    letter-spacing: -0.025em;
  }
  .hero-lede {
    margin: 0 0 34px;
    max-width: 600px;
    font-size: 19px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }
  .hero-lede a {
    color: var(--accent);
    border-bottom: 1px solid color-mix(in oklch, var(--accent) 40%, transparent);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 8px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--surface);
    padding: 6px 11px;
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 12px;
    color: var(--muted);
  }
  .dot {
    height: 6px;
    width: 6px;
    border-radius: 50%;
  }
  .dot-a {
    background: var(--accent);
  }
  .dot-b {
    background: var(--accent2);
  }

  .block {
    padding: 56px 0 8px;
  }
  .section-head {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin-bottom: 30px;
  }
  .sec-num {
    font-family: var(--font-mono);
    font-weight: 520;
    font-size: 12px;
    color: var(--faint);
  }
  .sec-title {
    margin: 0;
    font-family: var(--font-body);
    font-weight: 580;
    font-size: 15px;
    letter-spacing: 0.01em;
    color: var(--text);
  }
  .rule {
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .sec-link {
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 12px;
    color: var(--muted);
  }
  .sec-link:hover {
    color: var(--accent);
  }

  .post-list {
    display: flex;
    flex-direction: column;
  }
  .post-row {
    display: grid;
    grid-template-columns: 118px 1fr;
    gap: 22px;
    align-items: start;
    border-top: 1px solid var(--border);
    padding: 22px 4px;
  }
  .post-row:hover {
    background: color-mix(in oklch, var(--surface) 50%, transparent);
  }
  .post-meta {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding-top: 3px;
    font-family: var(--font-mono);
  }
  .post-date {
    font-weight: 480;
    font-size: 11.5px;
    color: var(--muted);
  }
  .post-read {
    font-weight: 440;
    font-size: 11px;
    color: var(--faint);
  }
  .post-title {
    margin-bottom: 7px;
    font-family: var(--font-body);
    font-weight: 540;
    font-size: 18px;
    line-height: 1.3;
    letter-spacing: -0.01em;
    color: var(--text);
  }
  .post-desc {
    max-width: 560px;
    font-size: 14.5px;
    line-height: 1.6;
    color: var(--muted);
    text-wrap: pretty;
  }

  .proj-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .proj-card {
    display: block;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    padding: 20px 22px;
    color: var(--text);
  }
  .proj-card:hover {
    border-color: var(--accent);
  }
  .proj-card-head {
    margin-bottom: 11px;
  }
  .proj-name {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-family: var(--font-body);
    font-weight: 580;
    font-size: 17px;
    letter-spacing: -0.01em;
  }
  .proj-name :global(svg) {
    color: var(--accent);
  }
  .proj-card-desc {
    margin-bottom: 14px;
    min-height: 44px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--muted);
    text-wrap: pretty;
  }
  .proj-card-link {
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 11.5px;
    color: var(--accent);
  }

  .elsewhere {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 28px;
    margin-top: 8px;
    border-top: 1px solid var(--border);
    padding: 26px 0 88px;
    font-family: var(--font-mono);
    font-weight: 480;
    font-size: 12.5px;
  }
  .else-label {
    font-size: 11.5px;
    letter-spacing: 0.04em;
    color: var(--faint);
  }
  .elsewhere a {
    color: var(--muted);
  }
  .elsewhere a:hover {
    color: var(--accent);
  }

  @media (max-width: 640px) {
    .hero {
      padding-top: 56px;
    }
    .hero-name {
      font-size: 42px;
    }
    .hero-lede {
      font-size: 17px;
    }
    .proj-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
