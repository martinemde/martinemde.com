<script lang="ts">
  import Stream from '#lib/components/Stream.svelte';
  import type { PageProps } from './$types';
  import { projects } from '#lib/data/projects.ts';
  import { resolve } from '$app/paths';

  let { data }: PageProps = $props();

  const featured = projects.slice(0, 4);
</script>

<svelte:head>
  <title>Martin Emde</title>
  <meta name="description" content="Software Engineer" />
</svelte:head>

<section class="hero">
  <h1 class="hero-name">Martin Emde</h1>
  <p class="hero-lede">
    AI Developer Tools Engineer at
    <a href="https://gusto.com" rel="external">Gusto</a>.
  </p>
</section>

{#if data.recentEntries.length}
  <section class="block" aria-labelledby="recently">
    <h2 class="sec-title" id="recently">Recently</h2>
    <Stream entries={data.recentEntries} level={3} />
    <a class="more" href={resolve('/stream')}>Full stream <span aria-hidden="true">→</span></a>
  </section>
{/if}

<section class="block" aria-labelledby="projects">
  <h2 class="sec-title" id="projects">Selected projects</h2>
  <ul class="proj-list">
    <!-- project.url values are pre-resolved in projects.ts; the rule is a false positive here -->
    <!-- eslint-disable svelte/no-navigation-without-resolve -->
    {#each featured as project (project.name)}
      {@const Icon = project.icon}
      {@const external = !project.url.startsWith('/')}
      <li>
        <a class="proj-name" href={project.url} rel={external ? 'external' : undefined}>
          <Icon size={16} aria-hidden="true" />{project.name}{#if external}<span
              class="ext"
              aria-hidden="true">↗</span
            >{/if}
        </a>
        <p class="proj-desc">{project.description}</p>
      </li>
    {/each}
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
  </ul>
  <a class="more" href={resolve('/projects')}>All projects <span aria-hidden="true">→</span></a>
</section>

<section class="elsewhere block" aria-labelledby="elsewhere">
  <h2 class="sec-title" id="elsewhere">Elsewhere</h2>
  <ul>
    <li><a href="https://github.com/martinemde" rel="external">GitHub: @martinemde</a></li>
    <li>
      <a href="https://bsky.app/profile/martinemde.com" rel="external">Bluesky: @martinemde.com</a>
    </li>
    <li><a href={resolve('/deadhtml')}>Dead HTML webring</a></li>
  </ul>
</section>

<style>
  a {
    color: inherit;
  }

  .hero {
    max-width: 680px;
    padding: 72px 0 8px;
  }
  .hero-name {
    margin: 0 0 10px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 2rem;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: var(--text);
  }
  .hero-lede {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.7;
    color: var(--muted);
  }
  .hero-lede a,
  .elsewhere a,
  .more {
    color: var(--accent);
    text-decoration: underline;
    text-decoration-color: color-mix(in oklch, var(--accent) 40%, transparent);
    text-decoration-thickness: 1px;
    text-underline-offset: 4px;
  }
  .hero-lede a:hover,
  .elsewhere a:hover,
  .more:hover {
    text-decoration-color: currentColor;
  }

  .block {
    max-width: 680px;
    padding: 56px 0 0;
  }
  .sec-title {
    margin: 0 0 20px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 1.3rem;
    line-height: 1.3;
    letter-spacing: -0.01em;
    color: var(--text);
  }
  .more {
    display: inline-block;
    margin-top: 4px;
  }

  .proj-list,
  .elsewhere ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .proj-list li {
    margin-bottom: 20px;
  }
  .proj-name {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 560;
    font-size: 1.05rem;
    color: var(--text);
    text-decoration: underline;
    text-decoration-color: color-mix(in oklch, var(--text) 25%, transparent);
    text-decoration-thickness: 1px;
    text-underline-offset: 4px;
  }
  .proj-name:hover,
  .proj-name:focus-visible {
    color: var(--accent);
    text-decoration-color: currentColor;
  }
  .proj-name :global(svg) {
    flex: none;
    color: var(--accent);
  }
  .ext {
    display: inline-block;
    font-size: 0.8em;
    color: var(--faint);
  }
  .proj-desc {
    margin: 4px 0 0;
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--muted);
    text-wrap: pretty;
  }

  .elsewhere {
    padding-bottom: 88px;
  }
  .elsewhere li {
    margin-bottom: 6px;
  }

  @media (max-width: 640px) {
    .hero {
      padding-top: 48px;
    }
    .hero-name {
      font-size: 1.75rem;
    }
    .block {
      padding-top: 44px;
    }
  }
</style>
