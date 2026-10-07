<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PostMetadata } from '#lib/utils/post-model.ts';
  import { postRouteParams } from '#lib/utils/post-routing.ts';

  let {
    post,
    depth = 'post'
  }: {
    post: Pick<PostMetadata, 'permalink'>;
    depth?: 'year' | 'month' | 'day' | 'post';
  } = $props();
  const routeParams = $derived(postRouteParams(post));
</script>

<nav class="post-breadcrumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href={resolve('/')}>~</a></li>
    <li>
      {#if depth === 'year'}<span aria-current="page">{routeParams.year}</span>
      {:else}<a href={resolve('/[year=year]', routeParams)}>{routeParams.year}</a>{/if}
    </li>
    {#if depth !== 'year'}
      <li>
        {#if depth === 'month'}<span aria-current="page">{routeParams.month}</span>
        {:else}<a href={resolve('/[year=year]/[month=month]', routeParams)}>{routeParams.month}</a
          >{/if}
      </li>
    {/if}
    {#if depth === 'day' || depth === 'post'}
      <li>
        {#if depth === 'day'}<span aria-current="page">{routeParams.day}</span>
        {:else}<a href={resolve('/[year=year]/[month=month]/[day=day]', routeParams)}
            >{routeParams.day}</a
          >{/if}
      </li>
    {/if}
    {#if depth === 'post'}<li><span aria-current="page">{routeParams.slug}</span></li>{/if}
  </ol>
</nav>

<style>
  .post-breadcrumbs {
    margin-bottom: 36px;
    font-family: var(--font-mono);
    font-weight: 460;
    font-size: 12px;
    color: var(--muted);
  }
  .post-breadcrumbs ol {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .post-breadcrumbs li {
    display: flex;
    gap: 8px;
    overflow-wrap: anywhere;
    min-width: 0;
  }
  .post-breadcrumbs li + li::before {
    content: '/';
    color: var(--faint);
  }
  .post-breadcrumbs a {
    color: var(--faint);
    text-decoration: none;
  }
  .post-breadcrumbs a:hover {
    color: var(--accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
