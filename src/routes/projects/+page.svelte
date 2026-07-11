<script lang="ts">
  import { projects } from '$lib/data/projects';

  const linkLabel = (p: (typeof projects)[number]) => p.linktext ?? p.name;
</script>

<svelte:head>
  <title>Projects - Martin Emde</title>
  <meta name="description" content="Open source projects and other things made by Martin Emde" />
</svelte:head>

<section class="head">
  <div class="eyebrow">// open source &amp; experiments</div>
  <h1 class="page-title">Projects</h1>
  <p class="page-lede">A selection of open source projects and other things I've built.</p>
</section>

<section class="list-wrap">
  <div class="proj-list">
    <!-- project.url values are pre-resolved in projects.ts; the rule is a false positive here -->
    <!-- eslint-disable svelte/no-navigation-without-resolve -->
    {#each projects as project (project.name)}
      {@const Icon = project.icon}
      <a
        class="proj-row"
        href={project.url}
        rel={project.url.startsWith('/') ? undefined : 'external'}
      >
        <div class="proj-name">
          <Icon size={17} />
          <span>{project.name}</span>
        </div>
        <div class="proj-desc">{project.description}</div>
        <div class="proj-link">{linkLabel(project)} ↗</div>
      </a>
    {/each}
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
  </div>
</section>

<style>
  a {
    color: inherit;
    text-decoration: none;
  }

  .head {
    padding: 80px 0 40px;
  }
  .eyebrow {
    margin-bottom: 18px;
    font-size: 12px;
  }
  .page-title {
    margin: 0 0 16px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 46px;
    line-height: 1.05;
    letter-spacing: -0.025em;
  }
  .page-lede {
    margin: 0;
    max-width: 560px;
    font-size: 17px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }

  .list-wrap {
    padding-bottom: 88px;
  }
  .proj-list {
    border-top: 1px solid var(--border);
  }
  .proj-row {
    display: grid;
    grid-template-columns: 200px 1fr 150px;
    gap: 24px;
    align-items: center;
    border-bottom: 1px solid var(--border);
    padding: 22px 8px;
    color: var(--text);
  }
  .proj-row:hover {
    background: color-mix(in oklch, var(--surface) 55%, transparent);
  }
  .proj-name {
    display: flex;
    align-items: center;
    gap: 11px;
    font-family: var(--font-body);
    font-weight: 580;
    font-size: 17px;
    letter-spacing: -0.01em;
  }
  .proj-name :global(svg) {
    flex: none;
    color: var(--accent);
  }
  .proj-desc {
    font-size: 14.5px;
    line-height: 1.6;
    color: var(--muted);
    text-wrap: pretty;
  }
  .proj-link {
    justify-self: end;
    font-family: var(--font-mono);
    font-weight: 440;
    font-size: 11.5px;
    color: var(--faint);
  }

  @media (max-width: 720px) {
    .head {
      padding-top: 56px;
    }
    .page-title {
      font-size: 38px;
    }
    .proj-row {
      grid-template-columns: 1fr;
      gap: 6px;
    }
    .proj-link {
      justify-self: start;
    }
  }
</style>
