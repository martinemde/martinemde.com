<script lang="ts">
  import { resolve } from '$app/paths';
  import { PUBLIC_APP_URL } from '$env/static/public';
  import { buyoutThreshold, evaluate } from '$lib/apple-upgrade/advice';
  import { EXAMPLE_QUERY, TRADE_IN_QUOTES_CHECKED } from '$lib/apple-upgrade/calculator';
  import { HORIZON, LEASE_SHARE, money, money0 } from '$lib/apple-upgrade/model';
  import { DEVICES, buildInputs, upgradeTradeIns } from '$lib/apple-upgrade/presets';
  import { PARAMETERS } from '$lib/apple-upgrade/query';

  /**
   * One worked example, so every number on this page comes out of the same
   * model the interactive page runs rather than out of a paragraph someone
   * forgot to update. It is the default iPhone 18 Pro: $1,199, a $375 Apple
   * trade-in, a $1,000 carrier promotion, AppleCare+ monthly, a new phone
   * every two years.
   */
  const EXAMPLE = {
    deviceKey: 'iphone-18-pro',
    listPrice: 1199,
    tradeIn: 375,
    carrierOffer: 1000,
    appleCare: 'monthly' as const,
    upgradeMonths: [24]
  };

  const inputs = buildInputs(EXAMPLE);
  const advice = evaluate(inputs, { ending: 'own', leaseExit: 'best' });
  const care = advice.appleCare;
  const yearly = advice.cadence.find((entry) => entry.years === 1)!;
  const triennial = advice.cadence.find((entry) => entry.years === 3)!;

  const SEVERITY_LABEL = {
    critical: 'changes your answer',
    watch: 'changes the price',
    info: 'worth knowing'
  } as const;

  /**
   * The buyout rule across the lineup. It is a share of the sticker and
   * nothing else, so every phone gets the same two thresholds and only the
   * trade-in quote moves — which is exactly the point worth showing.
   */
  const lineup = DEVICES.filter((device) => device.price > 0).map((device) => {
    const priced = buildInputs({
      deviceKey: device.key,
      listPrice: device.price,
      upgradeTradeIns: upgradeTradeIns(device.price, device.key)
    });
    return {
      label: device.label,
      price: device.price,
      estimated: device.tradeIns === null,
      twelve: buyoutThreshold(priced, 12),
      twentyFour: buyoutThreshold(priced, 24)
    };
  });

  // Printed absolute rather than resolved: this is documentation an agent is
  // meant to be able to copy out of the page and fetch, not in-site navigation.
  const calculatorUrl = new URL('/apple-upgrade/calculator', PUBLIC_APP_URL).href;
  const exampleUrl = `${calculatorUrl}?${EXAMPLE_QUERY}`;
</script>

<svelte:head>
  <title>Which iPhone upgrade path should I pick? - Martin Emde</title>
  <meta
    name="description"
    content="The short version of the Apple Upgrade comparison: the buyout rule that decides every lease, why AppleCare rarely pays for itself, and the catches that move real money. Includes a JSON calculator endpoint."
  />
</svelte:head>

<article>
  <header class="hero">
    <div class="eyebrow">// the short version</div>
    <h1>Which one should I pick?</h1>
    <p class="lede">
      <a href={resolve('/apple-upgrade')}>The full comparison</a> runs {HORIZON} months of cash flow across
      five columns and lets you watch them fill up. That is the right shape for understanding the program
      and the wrong shape for answering this question. Here is the answer, the three numbers it turns
      on, and the catches that decide it.
    </p>
    <p class="lede">
      Every figure below is computed from the same model, for one worked example: an
      <strong>iPhone 18 Pro at {money0(EXAMPLE.listPrice)}</strong>, a
      {money0(EXAMPLE.tradeIn)} Apple trade-in, a {money0(EXAMPLE.carrierOffer)} carrier promotion, AppleCare+
      billed monthly, and a new phone every two years. Change any of that with the
      <a href="#calculator">calculator</a>.
    </p>
  </header>

  <section class="answer">
    <div class="eyebrow">// if you read nothing else</div>
    <h2>Four rules</h2>
    <ol class="rules">
      <li>
        <strong>Buy the lease out at the end. Almost always.</strong>
        A lease collects {Math.round(LEASE_SHARE[12] * 100)}% of the sticker over 12 months or
        {Math.round(LEASE_SHARE[24] * 100)}% over 24, so the buyout is the remaining
        {Math.round(advice.leaseBuyout[0].buyoutShareOfList * 100)}% or
        {Math.round(advice.leaseBuyout[1].buyoutShareOfList * 100)}% of list. Handing the phone back
        sells it to Apple for exactly that. If the trade-in quote is higher — and for a one-year-old
        iPhone it usually is — handing it back is the expensive door.
      </li>
      <li>
        <strong>AppleCare is not included, in any of them.</strong>
        It is billed separately by Apple whichever way you pay, it costs
        {money0(care.fourYearCost)} over four years here, and it only pays for itself if you crack a screen
        about every {Math.round(care.monthsBetweenBreaksToBreakEven ?? 0)} months.
      </li>
      <li>
        <strong>How often you upgrade beats which plan you pick.</strong>
        Every year costs {money0(yearly.annualCost)} a year here; every three years costs
        {money0(triennial.annualCost)}. That gap is
        {money0((yearly.annualCost - triennial.annualCost) * 4)} over four years — larger than the
        {money0(advice.plans[advice.plans.length - 1].netCost - advice.plans[0].netCost)} between the
        cheapest and the most expensive plan on the same schedule.
      </li>
      <li>
        <strong>Then, and only then, pick a plan.</strong>
        On this example the winner is <strong>{advice.recommendation.name}</strong> at
        {money0(advice.recommendation.netCost)} net over four years, ahead of
        {advice.recommendation.runnerUp?.name} by {money0(advice.recommendation.margin)}.
        {advice.recommendation.confidence === 'clear'
          ? 'That is a real gap.'
          : 'That is inside the error bars — pick on cash flow instead.'}
      </li>
    </ol>
  </section>

  <section>
    <div class="eyebrow">// rule one, priced</div>
    <h2>The buyout is a fixed share of the sticker</h2>
    <p>
      This is the least obvious thing about Apple Upgrade and the thing that decides it. Apple
      describes the purchase option fee as the list price less the payments you have made and less
      any trade-in credit. Work that through and the trade-in cancels out: credit comes off the
      payments and off the buyout by the same amount. What is left is always the same share of list.
    </p>
    <div class="table-scroll">
      <table>
        <caption
          >Buy it out when the trade-in beats the buyout. Trade-in quotes are Apple's published
          maximums as of {TRADE_IN_QUOTES_CHECKED}, scaled by tier.</caption
        >
        <thead>
          <tr>
            <th scope="col">Phone</th>
            <th scope="col">Price</th>
            <th scope="col">12&nbsp;mo buyout</th>
            <th scope="col">Worth at 1&nbsp;yr</th>
            <th scope="col">24&nbsp;mo buyout</th>
            <th scope="col">Worth at 2&nbsp;yr</th>
          </tr>
        </thead>
        <tbody>
          {#each lineup as row (row.label)}
            <tr>
              <th scope="row">{row.label}{row.estimated ? '*' : ''}</th>
              <td>{money0(row.price)}</td>
              <td>{money0(row.twelve.buyoutWithTax)}</td>
              <td class={row.twelve.verdict === 'buy-it-out' ? 'win' : 'lose'}>
                {money0(row.twelve.tradeInAtTerm)}
                <span class="verdict"
                  >{row.twelve.verdict === 'buy-it-out'
                    ? `buy it out, +${money0(row.twelve.buyoutAdvantage)}`
                    : 'hand it back'}</span
                >
              </td>
              <td>{money0(row.twentyFour.buyoutWithTax)}</td>
              <td class={row.twentyFour.verdict === 'buy-it-out' ? 'win' : 'lose'}>
                {money0(row.twentyFour.tradeInAtTerm)}
                <span class="verdict"
                  >{row.twentyFour.verdict === 'buy-it-out'
                    ? `buy it out, +${money0(row.twentyFour.buyoutAdvantage)}`
                    : 'hand it back'}</span
                >
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="note">
      * The iPhone Duo has no older generations to quote, so its resale is estimated from Pro Max
      percentages. Buyouts include sales tax at {inputs.taxRate}%; trade-in credit is untaxed.
    </p>
    <p>
      There is a catch inside the catch: <strong
        >Apple does not accept a trade-in against a replacement lease.</strong
      >
      You never owned the phone you handed back, so there is nothing to trade. The only route from a leased
      phone to trade-in value is to buy it out first and trade in the phone you then own. That is why
      "just hand it back and start again" is a luxury rather than a saving.
    </p>
  </section>

  <section>
    <div class="eyebrow">// rule two, priced</div>
    <h2>AppleCare, as arithmetic</h2>
    <p>
      Nothing here bundles it. The lease covers the financing, not the phone, and the premiums sit
      on top of every column identically. So the question is not which plan includes it — none do —
      but whether you break screens often enough to want it at all.
    </p>
    <dl class="figures">
      <div>
        <dt>Premiums over {HORIZON} months</dt>
        <dd>{money(care.fourYearCost)}</dd>
      </div>
      <div>
        <dt>One screen, with coverage</dt>
        <dd>{money(care.repairWithCare)}</dd>
      </div>
      <div>
        <dt>One screen, without</dt>
        <dd>{money(care.repairWithoutCare)}</dd>
      </div>
      <div>
        <dt>Saved per repair</dt>
        <dd>{money(care.savedPerRepair)}</dd>
      </div>
      <div>
        <dt>Screens to break even</dt>
        <dd>{care.repairsToBreakEven?.toFixed(1)} in four years</dd>
      </div>
      <div>
        <dt>Which is a crack every</dt>
        <dd>{Math.round(care.monthsBetweenBreaksToBreakEven ?? 0)} months</dd>
      </div>
    </dl>
    <p>
      Break one screen a year and coverage is worth having. Break one every other year and you have
      paid {money0(care.fourYearCost - care.savedPerRepair * 2)} for the privilege. Most people are in
      the second group and buy as though they were in the first. A good case is the cheaper hedge.
    </p>
    <p class="note">
      This prices screen repair only. AppleCare+ also covers theft and loss, battery service and
      other accidental damage at their own service fees; if you are buying it for theft cover, this
      arithmetic is not your arithmetic. There is one more wrinkle on a lease: a returned phone has
      to work, so a cracked screen you would happily live with on a phone you own becomes a
      {money0(care.repairWithoutCare)} bill before you can hand it back.
    </p>
  </section>

  <section>
    <div class="eyebrow">// the rest of the catches</div>
    <h2>What actually surprises people</h2>
    <p>
      Each of these is priced for the worked example, and each one is in the calculator response
      under <code>gotchas</code> with the same numbers.
    </p>
    <ul class="gotchas">
      {#each advice.gotchas as gotcha (gotcha.id)}
        <li class={gotcha.severity}>
          <div class="gotcha-head">
            <h3>{gotcha.headline}</h3>
            <span class="tag">{SEVERITY_LABEL[gotcha.severity]}</span>
          </div>
          <p>{gotcha.detail}</p>
          {#if gotcha.impact !== null}
            <p class="impact">Moves {money0(gotcha.impact)} on this example.</p>
          {/if}
        </li>
      {/each}
    </ul>
  </section>

  <section>
    <div class="eyebrow">// the worked example</div>
    <h2>Five paths, one schedule, four years</h2>
    <p>
      Settled at month {HORIZON} with every path holding a paid-off phone of the same age, so the columns
      are comparable. Net cost is in today's dollars, net of card rewards, after crediting back whatever
      phone you still hold.
    </p>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Plan</th>
            <th scope="col">Net cost</th>
            <th scope="col">vs. best</th>
            <th scope="col">Due today</th>
            <th scope="col">Worst month</th>
            <th scope="col">Per month</th>
          </tr>
        </thead>
        <tbody>
          {#each advice.plans as plan (plan.key)}
            <tr class:best={plan.rank === 1}>
              <th scope="row">{plan.name}</th>
              <td>{money0(plan.netCost)}</td>
              <td>{plan.costAboveBest === 0 ? '—' : `+${money0(plan.costAboveBest)}`}</td>
              <td>{money0(plan.dueToday)}</td>
              <td>{money0(plan.biggestMonth)}</td>
              <td>{money0(plan.netCostPerMonth)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="note">
      {advice.recommendation.reason} The lease rows assume the cheapest exit at each upgrade, which the
      calculator searches for you — on this schedule that is
      {advice.plans.find((plan) => plan.key === 'upgrade-24')?.leaseExits?.['24'] === 'bought-out'
        ? 'buying the 24-month lease out rather than handing it back'
        : 'handing the 24-month lease back'}.
    </p>
    <p>
      <a class="cta" href={resolve('/apple-upgrade')}
        >Run it with your own numbers, month by month →</a
      >
    </p>
  </section>

  <section id="calculator">
    <div class="eyebrow">// for agents and scripts</div>
    <h2>The calculator endpoint</h2>
    <p>
      <code>GET {calculatorUrl}</code> returns this whole summary as JSON. Every parameter is optional.
      Called with none it describes itself: the parameter table below, a worked example, and notes on
      how to read the response.
    </p>
    <p class="example">
      <!-- resolve() builds the path; the query string is the whole example. -->
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a href={exampleUrl}><code>{exampleUrl}</code></a>
    </p>
    <h3>What comes back</h3>
    <dl class="fields">
      <dt><code>recommendation</code></dt>
      <dd>
        The pick, the runner-up, and the margin between them. When
        <code>confidence</code> is not <code>clear</code> the margin is inside the error bars on four
        years of guessed trade-in values, and the choice should be made on cash flow instead.
      </dd>
      <dt><code>plans</code></dt>
      <dd>
        All five paths, cheapest first by <code>netCost</code>, with the cash-flow columns (<code
          >dueToday</code
        >, <code>biggestMonth</code>) that decide whether a cheap plan is actually affordable. Lease
        rows carry <code>leaseExits</code>, which says what happened to the phone at each upgrade.
      </dd>
      <dt><code>leaseBuyout</code></dt>
      <dd>
        Rule one, per term: the buyout, its share of list, the trade-in it is up against, and a
        <code>verdict</code> of <code>buy-it-out</code> or <code>hand-it-back</code>.
      </dd>
      <dt><code>appleCare</code></dt>
      <dd>Rule two: premiums, repair prices, and the break-even cadence.</dd>
      <dt><code>cadence</code></dt>
      <dd>Rule three: best-case annual cost at one-, two- and three-year replacement.</dd>
      <dt><code>gotchas</code></dt>
      <dd>
        The catches this particular set of answers triggers, each priced.
        <code>severity: critical</code> means it changes which button to press, not just what it costs.
      </dd>
      <dt><code>warnings</code></dt>
      <dd>
        Parameters that were unknown, unparseable or clamped. Nothing is ever fatal: a bad value
        earns a warning and the default.
      </dd>
    </dl>
    <h3>Parameters</h3>
    <div class="table-scroll">
      <table class="params">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Default</th>
            <th scope="col">What it does</th>
          </tr>
        </thead>
        <tbody>
          {#each PARAMETERS as parameter (parameter.name)}
            <tr>
              <th scope="row"><code>{parameter.name}</code></th>
              <td class="default">
                <code>{parameter.default}</code>
                {#if parameter.values}
                  <span class="verdict">{parameter.values.join(' · ')}</span>
                {/if}
              </td>
              <td>{parameter.description}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="note">
      All amounts are US dollars. The figures are estimates from published prices, not quotes: Apple
      trade-in maximums were read on {TRADE_IN_QUOTES_CHECKED}, and tax treatment, promotions and
      resale values all move.
    </p>
  </section>
</article>

<style>
  article {
    padding-bottom: 96px;
  }

  .hero {
    padding: 80px 0 44px;
  }
  .hero .eyebrow {
    margin-bottom: 18px;
  }
  h1 {
    margin: 0 0 18px;
    text-wrap: balance;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 46px;
    line-height: 1.05;
    letter-spacing: -0.03em;
  }
  .lede {
    margin: 0 0 14px;
    max-width: 62ch;
    font-size: 17px;
    line-height: 1.7;
    color: var(--muted);
    text-wrap: pretty;
  }

  section {
    border-top: 1px solid var(--border);
    padding: 52px 0 0;
  }
  section .eyebrow {
    display: block;
    margin-bottom: 14px;
  }
  h2 {
    margin: 0 0 18px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 32px;
    line-height: 1.12;
    letter-spacing: -0.025em;
  }
  h3 {
    margin: 32px 0 12px;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 19px;
    letter-spacing: -0.015em;
  }
  p {
    max-width: 68ch;
    margin: 0 0 16px;
    line-height: 1.7;
  }
  .note {
    color: var(--muted);
    font-size: 13.5px;
    line-height: 1.65;
  }

  .answer {
    border: 1px solid var(--accent);
    border-radius: 14px;
    background: color-mix(in oklch, var(--accent) 7%, var(--surface));
    padding: 28px;
    margin-top: 8px;
  }
  .rules {
    margin: 0;
    padding-left: 22px;
    display: grid;
    gap: 18px;
  }
  .rules li {
    max-width: 68ch;
    line-height: 1.7;
  }
  .rules strong {
    display: block;
  }

  .table-scroll {
    overflow-x: auto;
    margin: 0 0 16px;
  }
  table {
    width: 100%;
    min-width: 560px;
    border-collapse: collapse;
    font-size: 14px;
  }
  caption {
    caption-side: bottom;
    padding-top: 10px;
    color: var(--muted);
    font-size: 13px;
    text-align: left;
    line-height: 1.6;
  }
  th,
  td {
    border-bottom: 1px solid var(--border);
    padding: 10px 12px 10px 0;
    text-align: right;
    vertical-align: top;
  }
  thead th {
    color: var(--muted);
    font-weight: 520;
    white-space: nowrap;
  }
  tbody th[scope='row'] {
    text-align: left;
    font-weight: 520;
  }
  tr.best td,
  tr.best th {
    background: color-mix(in oklch, var(--accent) 9%, transparent);
  }
  td.win {
    color: var(--text);
  }
  td.lose {
    color: var(--muted);
  }
  .verdict {
    display: block;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.5;
  }

  table.params th,
  table.params td {
    text-align: left;
  }
  table.params td {
    line-height: 1.6;
  }
  table.params td.default {
    white-space: nowrap;
  }
  table.params td:last-child {
    min-width: 30ch;
    white-space: normal;
  }

  .figures {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 14px;
    margin: 0 0 20px;
  }
  .figures > div {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    background: var(--surface);
  }
  .figures dt {
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }
  .figures dd {
    margin: 6px 0 0;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  .gotchas {
    display: grid;
    gap: 14px;
    margin: 0 0 16px;
    padding: 0;
    list-style: none;
  }
  .gotchas li {
    border: 1px solid var(--border);
    border-left-width: 3px;
    border-radius: 10px;
    padding: 16px 18px;
    background: var(--surface);
  }
  .gotchas li.critical {
    border-left-color: var(--accent2);
  }
  .gotchas li.watch {
    border-left-color: var(--accent);
  }
  .gotcha-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .gotchas h3 {
    margin: 0;
    font-size: 16.5px;
  }
  .gotchas p {
    margin: 8px 0 0;
    font-size: 14.5px;
    line-height: 1.65;
    color: var(--muted);
  }
  .gotchas .impact {
    color: var(--text);
    font-weight: 520;
  }
  .tag {
    color: var(--muted);
    font-size: 12px;
    white-space: nowrap;
  }

  .fields dt {
    margin-top: 16px;
    font-weight: 520;
  }
  .fields dd {
    margin: 6px 0 0;
    max-width: 68ch;
    color: var(--muted);
    line-height: 1.65;
  }

  .example {
    overflow-x: auto;
    max-width: none;
  }
  .example code {
    white-space: nowrap;
  }
  code {
    font-size: 13px;
    background: var(--code);
    border-radius: 4px;
    padding: 1px 5px;
  }

  .cta {
    display: inline-block;
    min-height: 48px;
    border: 1px solid var(--accent);
    border-radius: 12px;
    padding: 13px 20px;
    font-size: 15px;
  }

  @media (max-width: 640px) {
    .hero {
      padding-top: 56px;
    }
    h1 {
      font-size: 34px;
    }
    .lede {
      font-size: 16px;
    }
    h2 {
      font-size: 25px;
    }
    .answer {
      padding: 20px;
    }
  }
</style>
