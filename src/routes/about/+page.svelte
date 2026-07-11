<svelte:head>
  <title>About - Martin Emde</title>
  <meta name="description" content="About Martin Emde" />
</svelte:head>

<section class="about">
  <div class="eyebrow">// who</div>
  <h1 class="page-title">About</h1>

  <div class="body">
    <p>
      AI Developer Tools Engineer at
      <a href="https://gusto.com" rel="external">Gusto</a>. Founding member of
      <a href="https://gem.coop" rel="external">gem.coop</a>.
    </p>
  </div>

  <div class="find">
    <div class="find-label">find me</div>
    <a href="https://github.com/martinemde" rel="external">
      <span class="find-net">github</span> @martinemde ↗
    </a>
    <a href="https://bsky.app/profile/martinemde.com" rel="external">
      <span class="find-net">bluesky</span> @martinemde.com ↗
    </a>
  </div>
</section>

<style>
  a {
    color: inherit;
    text-decoration: none;
  }

  .about {
    max-width: 680px;
    padding: 80px 0 88px;
  }
  .eyebrow {
    margin-bottom: 18px;
    font-size: 12px;
  }
  .page-title {
    margin: 0 0 32px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 46px;
    line-height: 1.05;
    letter-spacing: -0.025em;
  }
  .body {
    font-size: 17.5px;
    line-height: 1.8;
    color: var(--text);
  }
  .body p {
    margin: 0 0 22px;
  }
  .body a {
    color: var(--accent);
    border-bottom: 1px solid color-mix(in oklch, var(--accent) 40%, transparent);
  }
  .find {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 40px;
    padding-top: 26px;
    border-top: 1px solid var(--border);
    font-family: var(--font-mono);
    font-weight: 480;
    font-size: 13.5px;
    color: var(--muted);
  }
  .find-label {
    font-size: 11.5px;
    letter-spacing: 0.04em;
    color: var(--faint);
  }
  .find a:hover {
    color: var(--accent);
  }
  .find-net {
    color: var(--faint);
  }

  @media (max-width: 640px) {
    .about {
      padding-top: 56px;
    }
    .page-title {
      font-size: 38px;
    }
  }
</style>
