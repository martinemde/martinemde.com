<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<svelte:head>
  <title>The &lt;font&gt; Tag Lives! - Martin Emde</title>
  <meta
    name="description"
    content="Martin Emde's corner of the Dead HTML Tag Society, in loving memory of the font tag."
  />
</svelte:head>

<div class="deadhtml-page">
  <div class="stars" aria-hidden="true"></div>

  <header class="masthead">
    <p class="kicker">~*~ MARTIN'S HOME ON THE INFORMATION SUPERHIGHWAY ~*~</p>
    <h1>
      <font face="Comic Sans MS, Comic Sans, cursive" color="#ffff00" size="7">
        The &lt;font&gt; Tag Lives!
      </font>
    </h1>
    <p class="welcome blink">WELCOME, WEB TRAVELER!</p>
    <div class="rainbow-rule" aria-hidden="true"></div>
  </header>

  <div class="content">
    <section class="panel intro" aria-labelledby="about-this-page">
      <h2 id="about-this-page">
        <font face="Times New Roman, serif" color="#00ffff" size="5">About this page</font>
      </h2>
      <p>
        You have discovered Martin's small, hand-coded outpost on the World Wide Web. This page is a
        proud member of the
        <a href="https://deadhtml.pickles.dev/">Dead HTML Tag Society</a>, a webring for personal
        sites that remember when HTML was allowed to be a little weird.
      </p>
      <p>
        My patron tag is <code>&lt;font&gt;</code>: deprecated in HTML 4.01, banished from HTML5,
        and still perfectly capable of turning a sentence
        <font face="Georgia, serif" color="#ff66ff" size="5">magenta</font>
        for no good reason.
      </p>
      <p class="manifesto">
        <font face="Courier New, monospace" color="#ffffff" size="3">
          This site believes in hyperlinks, view source, personal domains, and making the web feel
          like people live here.
        </font>
      </p>
    </section>

    <div class="construction" role="note">
      <span aria-hidden="true">[!]</span>
      <strong>PERMANENTLY UNDER CONSTRUCTION</strong>
      <span aria-hidden="true">[!]</span>
    </div>

    <section class="specimen" aria-labelledby="font-specimen">
      <h2 id="font-specimen">A living <code>&lt;font&gt;</code> specimen</h2>
      <p>
        <font face="Arial, sans-serif" color="#ff6666" size="2">SMALL RED ARIAL!</font><br />
        <font face="Times New Roman, serif" color="#66ff66" size="4">Medium green Times!</font><br
        />
        <font face="Comic Sans MS, Comic Sans, cursive" color="#66ccff" size="6">
          Big blue Comic Sans!
        </font>
      </p>
      <p class="fine-print">
        Yes, those are real <code>&lt;font&gt;</code> elements. Your browser remembers.
      </p>
    </section>

    <p class="back-home">
      <a href={resolve('/')}>&lt;&lt; return to martin's modern homepage</a>
    </p>

    <section class="webring" aria-labelledby="ring-title">
      <p class="ring-top">THIS SITE IS A PROUD MEMBER OF</p>
      <h2 id="ring-title">THE DEAD HTML TAG SOCIETY</h2>
      <p class="ring-copy">Choose a direction and surf onward:</p>

      <nav class="ring-nav" aria-label="Dead HTML Tag Society webring navigation">
        <a
          class="ring-button"
          href="https://deadhtml.pickles.dev/martinemde/prev/"
          aria-label="Previous site in the Dead HTML Tag Society"
        >
          <span aria-hidden="true">&lt;&lt;</span> PREV
        </a>

        <a
          class="badge"
          href="https://deadhtml.pickles.dev/"
          aria-label="Dead HTML Tag Society hub"
        >
          <span>DHTS</span>
          <small>martinemde.com</small>
        </a>

        <a
          class="ring-button"
          href="https://deadhtml.pickles.dev/random/?from=martinemde"
          aria-label="Random site in the Dead HTML Tag Society"
        >
          RANDOM
        </a>

        <a
          class="ring-button"
          href="https://deadhtml.pickles.dev/martinemde/next/"
          aria-label="Next site in the Dead HTML Tag Society"
        >
          NEXT <span aria-hidden="true">&gt;&gt;</span>
        </a>
      </nav>
    </section>
  </div>

  <footer class="retro-footer">
    <p>Last updated: August 30, 2026</p>
    <p>Best viewed with any browser that still has a soul.</p>
    <p class="no-cookies">NO COOKIES &bull; NO TRACKERS &bull; NO JAVASCRIPT &bull; 100% HTML</p>
  </footer>
</div>

<style>
  :global(.site-main:has(.deadhtml-page)) {
    max-width: none;
    padding: 0;
  }

  .deadhtml-page {
    --retro-blue: #000066;
    --retro-link: #00ffff;
    position: relative;
    isolation: isolate;
    overflow: hidden;
    min-height: 100%;
    border-right: 5px ridge #c0c0c0;
    border-left: 5px ridge #c0c0c0;
    background-color: var(--retro-blue);
    background-image:
      radial-gradient(circle at 24px 18px, #ffffff 0 1px, transparent 1.5px),
      radial-gradient(circle at 83px 65px, #6699ff 0 1px, transparent 1.5px),
      radial-gradient(circle at 142px 29px, #ffff00 0 1px, transparent 1.5px);
    background-size: 170px 95px;
    color: #ffffff;
    font-family: 'Times New Roman', Times, serif;
    font-weight: normal;
    line-height: 1.35;
    text-align: center;
  }

  .stars {
    position: absolute;
    z-index: -1;
    inset: 0;
    background: repeating-linear-gradient(
      135deg,
      transparent 0 80px,
      rgb(0 255 255 / 4%) 80px 82px
    );
    pointer-events: none;
  }

  .deadhtml-page a {
    color: var(--retro-link);
    text-decoration: underline;
  }

  .deadhtml-page a:visited {
    color: #ff66ff;
  }

  .deadhtml-page a:focus-visible {
    outline: 2px dashed #ffff00;
    outline-offset: 4px;
  }

  .masthead,
  .content,
  .retro-footer {
    width: min(100% - 32px, 720px);
    margin-inline: auto;
  }

  .masthead {
    padding-top: 40px;
  }

  .kicker {
    margin: 0 0 16px;
    color: #00ff66;
    font:
      bold 13px/1.3 'Courier New',
      Courier,
      monospace;
    letter-spacing: 0.08em;
  }

  h1 {
    margin: 0;
    filter: drop-shadow(3px 3px 0 #ff00ff);
    line-height: 1.05;
  }

  h1 font {
    font-size: clamp(2.2rem, 8vw, 4.5rem);
  }

  .welcome {
    margin: 20px 0 14px;
    color: #ff66ff;
    font:
      bold 17px/1.2 'Courier New',
      Courier,
      monospace;
  }

  .blink {
    animation: blink 1s steps(1, end) infinite;
  }

  .rainbow-rule {
    height: 9px;
    margin: 18px 0 30px;
    border: 2px outset #c0c0c0;
    background: linear-gradient(
      90deg,
      #ff0000 0 16.66%,
      #ff9900 16.66% 33.33%,
      #ffff00 33.33% 50%,
      #00cc33 50% 66.66%,
      #0099ff 66.66% 83.33%,
      #cc33ff 83.33%
    );
  }

  .content {
    padding-bottom: 24px;
  }

  .panel {
    border: 5px ridge #c0c0c0;
    background: #000033;
    padding: 22px clamp(18px, 5vw, 36px);
    box-shadow: 9px 9px 0 rgb(0 0 0 / 45%);
  }

  .panel h2 {
    margin: 0 0 18px;
    line-height: 1;
  }

  .panel p {
    margin: 16px auto;
    max-width: 590px;
    font-size: 18px;
  }

  .panel code,
  .specimen code {
    border: 1px solid #666666;
    background: #000000;
    color: #ffff00;
    font-family: 'Courier New', Courier, monospace;
  }

  .manifesto {
    border-top: 1px dashed #00ffff;
    padding-top: 18px;
  }

  .construction {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin: 34px 0;
    color: #000000;
    font:
      bold clamp(13px, 3.6vw, 17px)/1.2 Arial,
      sans-serif;
    letter-spacing: 0.04em;
  }

  .construction strong {
    border: 4px double #000000;
    background: repeating-linear-gradient(135deg, #ffff00 0 12px, #ff9900 12px 24px);
    padding: 8px 14px;
  }

  .construction span {
    color: #ffff00;
  }

  .specimen {
    margin: 0 auto 32px;
    border: 2px dashed #ff66ff;
    background: rgb(0 0 0 / 45%);
    padding: 22px;
  }

  .specimen h2 {
    margin: 0 0 18px;
    color: #ff66ff;
    font:
      bold 22px/1.2 'Courier New',
      Courier,
      monospace;
  }

  .specimen p {
    margin: 12px 0;
  }

  .specimen .fine-print {
    color: #c0c0c0;
    font:
      12px/1.4 Arial,
      sans-serif;
  }

  .back-home {
    margin: 30px 0;
    font-family: 'Courier New', Courier, monospace;
  }

  .webring {
    margin: 44px auto 22px;
    border: 5px outset #c0c0c0;
    background: #1a1a1a;
    padding: 18px;
    color: #d8d8d8;
    font-family: 'Courier New', Courier, monospace;
  }

  .ring-top {
    margin: 0 0 6px;
    color: #8a8a8a;
    font-size: 11px;
    letter-spacing: 0.12em;
  }

  .webring h2 {
    margin: 0;
    color: #7fffd4;
    font:
      bold clamp(18px, 5vw, 25px)/1.2 Georgia,
      'Times New Roman',
      serif;
  }

  .ring-copy {
    margin: 8px 0 18px;
    color: #bcbcbc;
    font-size: 13px;
  }

  .ring-nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .ring-nav .ring-button {
    border: 3px outset #c0c0c0;
    background: #c0c0c0;
    padding: 6px 9px;
    color: #000000;
    font:
      bold 12px/1 Arial,
      sans-serif;
    text-decoration: none;
  }

  .ring-nav .ring-button:active {
    border-style: inset;
  }

  .ring-nav .ring-button:visited {
    color: #000000;
  }

  .badge {
    display: flex;
    width: 88px;
    height: 31px;
    flex-direction: column;
    justify-content: center;
    border: 1px solid #3a3a3a;
    background: #6b6b6b;
    color: #d8d8d8 !important;
    font:
      9px/1 Georgia,
      serif;
    text-decoration: none !important;
  }

  .badge small {
    margin-top: 4px;
    color: #7fffd4;
    font:
      8px/1 'Courier New',
      Courier,
      monospace;
  }

  .retro-footer {
    border-top: 2px groove #c0c0c0;
    padding: 18px 0 48px;
    color: #b7b7b7;
    font:
      12px/1.4 'Courier New',
      Courier,
      monospace;
  }

  .retro-footer p {
    margin: 5px 0;
  }

  .no-cookies {
    color: #00ff66;
  }

  @keyframes blink {
    0%,
    49% {
      visibility: visible;
    }
    50%,
    100% {
      visibility: hidden;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .blink {
      animation: none;
    }
  }

  @media (max-width: 560px) {
    .deadhtml-page {
      border-right-width: 3px;
      border-left-width: 3px;
    }

    .masthead {
      padding-top: 28px;
    }

    .panel p {
      font-size: 16px;
    }

    .ring-nav {
      gap: 8px;
    }
  }
</style>
