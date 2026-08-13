/**
 * The catalog for /trillion.
 *
 * Ground rules for anything added here:
 *   1. Every price traces to a published figure, linked in `sources`.
 *   2. `note` says where the number comes from and how it was arrived at,
 *      including the arithmetic when a price is a headcount times a unit cost.
 *   3. No scorekeeping between political teams. The subject is the size of the
 *      number, not who ought to be writing the check.
 *
 * Prices are what a thing costs, not what it is worth, and the estimates behind
 * the global ones are ranges in the underlying research. Where a range exists,
 * these use a figure the cited source itself headlines.
 */

import type { Bankroll, Tier } from './game';

/**
 * The ladder of whose money is on the table. Each amount is a total rather than
 * an increment — the ten richest people's $2.6 trillion already contains Musk's
 * share — so unlocking a rung replaces the pot instead of adding to it.
 */
export const bankrolls: Bankroll[] = [
  {
    id: 'musk',
    label: 'Elon Musk',
    short: 'Elon',
    people: '1 person',
    count: 1,
    each: 'Elon',
    exhausted: "That's more than even Elon has.",
    amount: 1_000_000_000_000,
    note: 'In June 2026 he became the first person ever to be worth a trillion dollars, on the back of the SpaceX listing. A round trillion is the starting pot.',
    sources: [
      {
        label: 'Forbes, June 2026',
        url: 'https://www.forbes.com/sites/tylerroush/2026/06/29/musk-is-a-trillionaire-again-spacex-and-tesla-boost-net-worth-by-50-billion/'
      }
    ]
  },
  {
    id: 'top10',
    label: 'the ten richest people on Earth',
    short: 'the top 10',
    people: '10 people',
    count: 10,
    each: 'each of the ten richest people alive',
    exhausted: "That's more than the ten richest people on Earth have.",
    amount: 2_600_000_000_000,
    note: 'Musk, Page, Brin, Bezos, Zuckerberg, Ellison, Arnault, Huang, Buffett, Ortega. Everyone in the top ten is worth over $140 billion; together they hold $2.6 trillion.',
    sources: [
      {
        label: 'Forbes, August 2026',
        url: 'https://www.forbes.com/sites/forbeswealthteam/article/the-top-ten-richest-people-in-the-world/'
      }
    ]
  },
  {
    id: 'usa',
    label: 'every billionaire in America',
    short: 'US billionaires',
    people: '989 people',
    count: 989,
    each: "each of America's 989 billionaires",
    exhausted: "That's more than every billionaire in America has.",
    amount: 8_400_000_000_000,
    note: 'The United States holds 989 billionaires worth $8.4 trillion between them — more than a third of all billionaire wealth on the planet.',
    sources: [
      {
        label: 'Forbes 2026 list',
        url: 'https://www.forbes.com/sites/chasewithorn/2026/03/10/2026-worlds-billionaires-list-facts-and-figures/'
      }
    ]
  },
  {
    id: 'world',
    label: 'every billionaire on Earth',
    short: 'all billionaires',
    people: '3,428 people',
    count: 3428,
    each: "each of the world's 3,428 billionaires",
    exhausted: "That's more than every billionaire on Earth has.",
    amount: 20_100_000_000_000,
    note: 'A record 3,428 billionaires worth a combined $20.1 trillion — a group that got $4 trillion richer in a single year. This is the last real money on the board.',
    sources: [
      {
        label: 'Forbes 2026 list',
        url: 'https://www.forbes.com/sites/chasewithorn/2026/03/10/2026-worlds-billionaires-list-facts-and-figures/'
      }
    ]
  },
  {
    id: 'red',
    label: 'money that does not exist',
    short: 'the red',
    people: 'nobody',
    count: 0,
    each: 'nobody',
    exhausted: 'There is nobody left to bill.',
    amount: 20_100_000_000_000,
    unlimited: true,
    note: 'There is nobody left to bill. Past this point the balance just goes negative and you are inventing the money, which is worth knowing about a list where everything is real.',
    sources: [
      {
        label: 'Forbes 2026 list',
        url: 'https://www.forbes.com/sites/chasewithorn/2026/03/10/2026-worlds-billionaires-list-facts-and-figures/'
      }
    ]
  }
];

export const tiers: Tier[] = [
  {
    id: 'toys',
    title: 'Pocket change',
    kicker: 'Tier one',
    lede: 'Start with the things money is famous for buying. Watch the counter at the top while you do it.',
    items: [
      {
        id: 'painting',
        label: 'The most expensive painting ever sold',
        cost: 450_300_000,
        note: "Leonardo's Salvator Mundi, hammered down at Christie's in November 2017 — still the record for any artwork at auction.",
        sources: [
          {
            label: 'Christie’s / record sale',
            url: 'https://en.wikipedia.org/wiki/Salvator_Mundi_(Leonardo)'
          }
        ]
      },
      {
        id: 'car',
        label: 'The most expensive car ever sold',
        cost: 142_000_000,
        note: 'The 1955 Mercedes-Benz 300 SLR Uhlenhaut Coupé went for €135 million in a private RM Sotheby’s sale in 2022 — roughly $142 million.',
        sources: [
          {
            label: 'RM Sotheby’s sale',
            url: 'https://en.wikipedia.org/wiki/Mercedes-Benz_300_SLR'
          }
        ]
      },
      {
        id: 'yacht',
        label: 'The largest superyacht ever built',
        cost: 600_000_000,
        note: 'Azzam is 180 metres of custom steel and aluminium; the build is generally reported at around $600 million.',
        sources: [{ label: 'Azzam', url: 'https://en.wikipedia.org/wiki/Azzam_(yacht)' }]
      },
      {
        id: 'ohtani',
        label: 'The richest contract in sports',
        cost: 700_000_000,
        note: 'Shohei Ohtani’s ten-year, $700 million deal with the Dodgers — the largest contract in sports history, most of it deferred into the 2030s. You are covering the whole thing today.',
        sources: [
          {
            label: 'Dodgers contract',
            url: 'https://en.wikipedia.org/wiki/Shohei_Ohtani'
          }
        ]
      },
      {
        id: 'tesla-bonus',
        label: 'A $50,000 bonus for every Tesla employee',
        cost: 6_739_250_000,
        note: 'Tesla reported 134,785 employees worldwide at the end of 2025. At $50,000 each that is $6.74 billion — three and a half times the painting, the car, the yacht and the contract put together.',
        sources: [
          {
            label: 'Tesla FY2025 Form 10-K',
            url: 'https://www.sec.gov/Archives/edgar/data/1318605/000162828026003952/tsla-20251231.htm'
          }
        ]
      }
    ]
  },
  {
    id: 'cheap',
    title: 'Rounding errors',
    kicker: 'Tier two',
    lede: 'Problems that sound unsolvable. Priced in decimal places of what you are holding.',
    items: [
      {
        id: 'medical-debt',
        label: 'Erase every medical debt in America',
        cost: 2_200_000_000,
        note: 'Around $220 billion in medical debt is owed nationally, but it trades for pennies. Undue Medical Debt spent $36 million to buy and cancel $30 billion of it. Priced here at a very conservative one cent on the dollar.',
        sources: [
          {
            label: 'Undue Medical Debt',
            url: 'https://unduemedicaldebt.org/press-release/undue-medical-debt-announces-largest-debt-acquisition-in-nonprofits-history/'
          }
        ]
      },
      {
        id: 'cataracts',
        label: 'Give sight back to 17 million people',
        cost: 3_060_000_000,
        note: 'Cataracts blind about 17 million people, and the surgery that fixes it costs about $178 in India. 17 million × $180 = $3.1 billion.',
        sources: [
          {
            label: 'Global cataract blindness (Eye, 2024)',
            url: 'https://www.nature.com/articles/s41433-024-02961-1'
          },
          {
            label: 'Surgery pricing',
            url: 'https://www.mdpi.com/2227-9032/10/12/2580'
          }
        ]
      },
      {
        id: 'polio',
        label: 'Finish off polio, forever',
        cost: 6_900_000_000,
        note: 'The Global Polio Eradication Initiative’s entire multi-year budget through 2029 — the last mile of a disease humanity has spent nearly 40 years cornering.',
        sources: [
          {
            label: 'GPEI budget',
            url: 'https://polioeradication.org/financing/financial-needs/financial-resource-requirements-frr/'
          }
        ]
      },
      {
        id: 'homeless',
        label: 'Housing for everyone in a US homeless shelter',
        cost: 9_600_000_000,
        per: 'year',
        maxUnits: 20,
        note: 'The National Alliance to End Homelessness prices permanent housing for every household that stayed in a shelter in a year at $9.6 billion. Government already spends about $35,578 a year per person left on the street.',
        sources: [
          {
            label: 'National Alliance to End Homelessness',
            url: 'https://endhomelessness.org/resources/research-and-analysis/how-much-would-it-cost-to-provide-housing-first-to-all-households-staying-in-homeless-shelters/'
          }
        ]
      },
      {
        id: 'gavi',
        label: 'Immunize 500 million children',
        cost: 11_900_000_000,
        note: 'Gavi’s full five-year budget through 2030. The alliance estimates it prevents 150 outbreaks and saves eight to nine million lives.',
        sources: [
          {
            label: 'Gavi 2026–2030',
            url: 'https://www.gavi.org/news/media-room/protecting-more-children-gavi-vaccine-alliance-plans-next-5-year-period'
          }
        ]
      },
      {
        id: 'lead-pipes',
        label: 'Rip out every lead pipe in America',
        cost: 18_800_000_000,
        note: 'The EPA counts about 4 million lead service lines still in the ground at an average replacement cost of $4,700 each.',
        sources: [
          {
            label: 'Brookings on EPA estimates',
            url: 'https://www.brookings.edu/articles/what-would-it-cost-to-replace-all-the-nations-lead-water-pipes/'
          }
        ]
      },
      {
        id: 'global-fund',
        label: 'Fully fund the fight against AIDS, TB and malaria',
        cost: 18_000_000_000,
        note: 'The Global Fund asked for $18 billion for 2027–2029 and got $12.64 billion. The full ask is modelled to save 23 million lives and prevent 400 million infections.',
        sources: [
          {
            label: 'Global Fund investment case',
            url: 'https://www.theglobalfund.org/en/investment-case/'
          }
        ]
      }
    ]
  },
  {
    id: 'trophies',
    title: 'Trophies',
    kicker: 'Tier three',
    lede: 'Now buy the fun stuff — the things people assume are the expensive ones. Compare these prices to the tier you just finished.',
    items: [
      {
        id: 'twitter',
        label: 'Buy Twitter. Again.',
        cost: 44_000_000_000,
        note: 'The 2022 price for the whole company. Two and a half times what it costs to fully fund the global fight against three of the deadliest infectious diseases on Earth.',
        sources: [
          {
            label: 'Acquisition of Twitter',
            url: 'https://en.wikipedia.org/wiki/Acquisition_of_Twitter_by_Elon_Musk'
          }
        ]
      },
      {
        id: 'nhl',
        label: 'Buy all 32 NHL teams',
        cost: 70_400_000_000,
        note: 'Forbes valued the average NHL club at $2.2 billion in 2025. Thirty-two clubs, every rink in the league.',
        sources: [
          {
            label: 'Forbes NHL valuations 2025',
            url: 'https://www.forbes.com/sites/justinteitelbaum/2025/12/11/the-nhls-most-valuable-teams-2025/'
          }
        ]
      },
      {
        id: 'mlb',
        label: 'Buy all 30 MLB teams',
        cost: 78_000_000_000,
        note: 'Average MLB franchise value hit a record $2.6 billion in 2025; thirty clubs at that average is $78 billion. The Yankees alone account for $8.2 billion of it.',
        sources: [
          {
            label: 'Forbes MLB valuations 2025',
            url: 'https://www.forbes.com/sites/justinteitelbaum/2025/03/26/baseballs-most-valuable-teams-2025/'
          }
        ]
      },
      {
        id: 'nba',
        label: 'Buy all 30 NBA teams',
        cost: 160_000_000_000,
        note: 'Forbes puts the 30 NBA clubs at just over $160 billion collectively, averaging $5.4 billion each.',
        sources: [
          {
            label: 'Forbes NBA valuations 2025',
            url: 'https://www.forbes.com/sites/justinteitelbaum/2025/10/23/the-most-valuable-nba-teams-2025/'
          }
        ]
      },
      {
        id: 'nfl',
        label: 'Buy all 32 NFL teams',
        cost: 228_000_000_000,
        note: 'Every franchise in the NFL is now worth at least $5 billion, averaging $7.1 billion, for an aggregate $228 billion. This is the single most expensive thing you have been offered so far.',
        sources: [
          {
            label: 'Forbes NFL valuations 2025',
            url: 'https://www.forbes.com/sites/justinteitelbaum/2025/08/28/the-nfls-most-valuable-teams-2025/'
          }
        ]
      }
    ]
  },
  {
    id: 'country',
    title: 'One country',
    kicker: 'Tier four',
    lede: 'Back to work. These are the line items of a single nation — the ones that show up in budget fights every year.',
    items: [
      {
        id: 'school-meals',
        label: 'Free school meals for every US student',
        cost: 30_000_000_000,
        per: 'year',
        maxUnits: 20,
        note: 'USDA already spends about $19 billion a year feeding kids who qualify. Dropping the paperwork and feeding all of them runs about $30 billion a year.',
        sources: [
          {
            label: 'USDA National School Lunch Program',
            url: 'https://www.ers.usda.gov/topics/food-nutrition-assistance/child-nutrition-programs/national-school-lunch-program'
          },
          {
            label: 'NPR: the cost of universal meals',
            url: 'https://www.npr.org/2024/08/30/nx-s1-5092432/the-indicator-from-planet-money-a-food-fight-over-free-school-lunch'
          }
        ]
      },
      {
        id: 'teacher-raise',
        label: 'A $10,000 raise for every public school teacher',
        cost: 38_000_000_000,
        per: 'year',
        maxUnits: 20,
        note: 'About 3.8 million public school teachers, at a national average salary of $74,200. Ten thousand dollars each, every year you fund it.',
        sources: [
          { label: 'NCES teacher counts', url: 'https://nces.ed.gov/fastfacts/display.asp?id=28' },
          {
            label: 'NEA teacher pay',
            url: 'https://www.nea.org/resource-library/educator-pay-and-student-spending-how-does-your-state-rank'
          }
        ]
      },
      {
        id: 'nih',
        label: 'Run the entire NIH for a year',
        cost: 47_000_000_000,
        per: 'year',
        maxUnits: 20,
        note: 'The National Institutes of Health ran on a $47 billion program level in FY2025 — all of it, every institute, every grant, cancer to Alzheimer’s.',
        sources: [
          {
            label: 'CRS: NIH funding',
            url: 'https://www.congress.gov/crs-product/R43341'
          }
        ]
      },
      {
        id: 'bridges',
        label: 'Repair every deficient bridge in America',
        cost: 467_000_000_000,
        note: 'ARTBA counts 42,067 US bridges rated in poor condition, with an estimated $467 billion repair bill. One in three bridges needs work.',
        sources: [{ label: 'ARTBA Bridge Report', url: 'https://artbabridgereport.org/' }]
      },
      {
        id: 'interstate',
        label: 'Build the Interstate Highway System from scratch',
        cost: 500_000_000_000,
        note: 'Almost 48,000 miles, finished in 1992 at $129 billion of the day’s money — north of half a trillion in today’s.',
        sources: [
          {
            label: 'FHWA highway history',
            url: 'https://www.fhwa.dot.gov/highwayhistory/data/page03.cfm'
          }
        ]
      }
    ]
  },
  {
    id: 'commons',
    title: 'The commons',
    kicker: 'Tier five',
    lede: 'The shared plumbing: the things nobody owns, everybody uses, and no single buyer has ever had the balance sheet to fix. Every item in this tier put together still fits inside the fortune.',
    items: [
      {
        id: 'broadband',
        label: 'High-speed internet to every American home',
        cost: 42_450_000_000,
        note: 'BEAD is the largest federal broadband program ever written: $42.45 billion to wire the 25 million Americans who still have no high-speed service. You are covering the entire program in one payment.',
        sources: [
          {
            label: 'NTIA BEAD program',
            url: 'https://www.ntia.gov/funding-programs/high-speed-internet-programs/broadband-equity-access-and-deployment-bead-program'
          }
        ]
      },
      {
        id: 'ports',
        label: 'Fix every port, lock and shipping channel in America',
        cost: 45_000_000_000,
        note: 'ASCE puts ten years of water transportation needs at about $45 billion — nearly $38 billion of it at the ports themselves, the rest on the inland waterways every barge of grain and gravel has to pass through. Ports graded a B in 2025; the waterways a C−.',
        sources: [
          {
            label: 'ASCE 2025: Ports',
            url: 'https://infrastructurereportcard.org/cat-item/ports-infrastructure/'
          },
          {
            label: 'ASCE 2025: Inland Waterways',
            url: 'https://infrastructurereportcard.org/cat-item/inland-waterways-infrastructure/'
          }
        ]
      },
      {
        id: 'transit',
        label: 'Close the repair gap on every bus and train in America',
        cost: 152_000_000_000,
        note: 'Transit graded a D. ASCE counts $618 billion of needs through 2033 against $466 billion of expected funding, leaving a $152 billion hole. This is the hole, filled.',
        sources: [
          {
            label: 'ASCE 2025: Transit',
            url: 'https://infrastructurereportcard.org/cat-item/transit-infrastructure/'
          }
        ]
      },
      {
        id: 'hsr',
        label: 'Build high-speed rail across America',
        cost: 205_000_000_000,
        note: 'The American High-Speed Rail Act asks for $41 billion a year for five years — $205 billion — for corridor construction, planning and safety rules for a national network. The ask has never been appropriated.',
        sources: [
          {
            label: 'High Speed Rail Alliance',
            url: 'https://www.hsrail.org/blog/205b-american-high-speed-rail-act-introduced/'
          },
          {
            label: 'Sponsor’s summary',
            url: 'https://moulton.house.gov/news/press-releases/moulton-re-introduces-american-high-speed-rail-act-calling-41-billion-annual'
          }
        ]
      },
      {
        id: 'storage',
        label: 'Put a terawatt-hour of batteries on the grid',
        cost: 334_000_000_000,
        note: 'NREL benchmarks four-hour utility-scale lithium-ion storage at $334 per kilowatt-hour, so a terawatt-hour — a thousand gigawatt-hours, enough to hold the output of a thousand large power plants for an hour — runs $334 billion. America’s record year, 2025, added 58 gigawatt-hours. This is seventeen of those, at once.',
        sources: [
          {
            label: 'NREL storage cost projections, 2025',
            url: 'https://www.osti.gov/biblio/2583471'
          },
          {
            label: 'SEIA: 2025 storage installations',
            url: 'https://seia.org/news/united-states-installs-58-gwh-of-new-energy-storage-in-2025/'
          }
        ]
      }
    ]
  },
  {
    id: 'planet',
    title: 'One planet',
    kicker: 'Tier six',
    lede: 'The whole world now, priced by the year. These are the headline numbers of global development — the ones usually described as impossible to raise.',
    items: [
      {
        id: 'malaria',
        label: 'Eradicate malaria',
        cost: 6_000_000_000,
        per: 'year',
        maxUnits: 30,
        note: 'The Lancet Commission puts eradication at a little over $6 billion a year — about $2 billion a year more than the world already spends.',
        sources: [
          {
            label: 'Lancet Commission on malaria eradication',
            url: 'https://www.malariaeradicationcommission.com/our-work/financing-malaria-eradication'
          }
        ]
      },
      {
        id: 'hunger',
        label: 'End world hunger',
        cost: 33_000_000_000,
        per: 'year',
        maxUnits: 10,
        note: 'Ceres2030 read half a million studies to price it: $33 billion a year, which keeps 490 million people out of hunger and doubles the incomes of 545 million small farmers.',
        sources: [
          {
            label: 'Ceres2030 / IISD',
            url: 'https://www.iisd.org/articles/iisd-news/ending-world-hunger-2030-would-cost-330bn-study-finds'
          }
        ]
      },
      {
        id: 'usaid',
        label: 'Cover the entire USAID budget',
        cost: 40_000_000_000,
        per: 'year',
        maxUnits: 25,
        note: 'Congress appropriated roughly $39.6 billion for foreign assistance managed by USAID and the State Department in FY2024, the agency’s last full year before it was folded into State. Every year you fund here is one full year of that work.',
        sources: [
          {
            label: 'CRS: USAID overview',
            url: 'https://www.congress.gov/crs-product/IF10261'
          }
        ]
      },
      {
        id: 'electricity',
        label: 'Electricity for everyone who has none',
        cost: 45_000_000_000,
        per: 'year',
        maxUnits: 10,
        note: 'About 645 million people are projected to still lack electricity in 2030. The IEA prices universal access at roughly $45 billion a year — about 2% of annual energy sector investment.',
        sources: [
          {
            label: 'IEA: access to electricity',
            url: 'https://www.iea.org/reports/sdg7-data-and-projections/access-to-electricity'
          }
        ]
      },
      {
        id: 'education',
        label: 'Put every child on Earth in school',
        cost: 97_000_000_000,
        per: 'year',
        maxUnits: 10,
        note: 'UNESCO’s Global Education Monitoring Report puts the annual financing gap across 79 low- and lower-middle-income countries at $97 billion — 21% of what universal education there would cost.',
        sources: [
          {
            label: 'UNESCO GEM Report',
            url: 'https://www.unesco.org/en/articles/annual-financing-gap-education-almost-100-billion'
          }
        ]
      },
      {
        id: 'water',
        label: 'Clean water and a toilet for every human',
        cost: 114_000_000_000,
        per: 'year',
        maxUnits: 10,
        note: 'The World Bank prices universal safe water and sanitation across 140 low- and middle-income countries at about $114 billion a year in capital spending.',
        sources: [
          {
            label: 'UN World Water Development Report',
            url: 'https://www.unesco.org/reports/wwdr/2021/en/valuing-water-supply-sanitation-services'
          }
        ]
      },
      {
        id: 'forests',
        label: 'Stop tropical deforestation',
        cost: 117_000_000_000,
        per: 'year',
        maxUnits: 10,
        note: 'The Forest Declaration Assessment estimates $117–299 billion a year is needed to hit the 2030 forest goals. The world currently manages about $2.2 billion a year in dedicated public funding.',
        sources: [
          {
            label: 'Forest Declaration Assessment',
            url: 'https://forestdeclaration.org/assessment/'
          }
        ]
      },
      {
        id: 'poverty',
        label: 'End extreme poverty where it is worst',
        cost: 170_000_000_000,
        per: 'year',
        maxUnits: 10,
        note: 'Researchers estimate $170 billion a year would cut extreme poverty to 1% or less in the 23 low-income countries that hold about half the world’s poorest people.',
        sources: [
          {
            label: 'UC Berkeley / UNU-WIDER',
            url: 'https://vcresearch.berkeley.edu/news/what-would-it-cost-end-extreme-poverty-worldwide'
          }
        ]
      }
    ]
  },
  {
    id: 'moonshots',
    title: 'Moonshots',
    kicker: 'Tier seven',
    lede: 'Fine. Buy the biggest things our species has ever attempted.',
    items: [
      {
        id: 'apollo',
        label: 'Run the Apollo program again',
        cost: 257_000_000_000,
        note: 'Every dollar of Apollo — eleven crewed missions, six landings, the Saturn V, the whole decade — priced at $257 billion in 2020 dollars.',
        sources: [
          {
            label: 'The Planetary Society',
            url: 'https://www.planetary.org/space-policy/cost-of-apollo'
          }
        ]
      },
      {
        id: 'nuclear',
        label: 'Build ten Vogtle-sized nuclear plants',
        cost: 315_000_000_000,
        note: 'Vogtle 3 and 4 cost about $31.5 billion for 2.2 GW — the most expensive nuclear build in American history. Ten more of them is 22 GW of always-on, carbon-free power.',
        sources: [
          {
            label: 'Lazard LCOE+ 2025',
            url: 'https://www.lazard.com/media/eijnqja3/lazards-lcoeplus-june-2025.pdf'
          }
        ]
      },
      {
        id: 'solar',
        label: 'Install a terawatt of solar',
        cost: 1_000_000_000_000,
        note: 'Utility-scale solar runs roughly $1 per watt installed, so a terawatt — about a thousand large power plants’ worth of peak capacity — costs about a trillion. Yes, the whole thing.',
        sources: [
          {
            label: 'Lazard LCOE+ 2025',
            url: 'https://www.lazard.com/media/eijnqja3/lazards-lcoeplus-june-2025.pdf'
          }
        ]
      }
    ]
  },
  {
    id: 'money',
    title: 'Just move the money',
    kicker: 'Tier eight',
    lede: 'Nothing to build here and nobody to hire. These are numbers that already exist somewhere in the economy, moved from one column into another — which turns out to be the most expensive thing on the board.',
    items: [
      {
        id: 'tariffs',
        label: 'Refund every tariff Americans paid in 2025',
        cost: 287_000_000_000,
        note: 'Daily Treasury data has $287 billion in customs duties, taxes and fees collected in calendar 2025, up 192% in a single year. US importers write those checks, and most of the cost turns up downstream in prices. This hands the whole year back.',
        sources: [
          {
            label: 'Richmond Fed on Treasury data',
            url: 'https://www.richmondfed.org/research/national_economy/macro_minute/2026/how_much_revenue_raised_by_tariffs_so_far'
          }
        ]
      },
      {
        id: 'small-business',
        label: 'Triple the number of American businesses that have employees',
        cost: 315_000_000_000,
        note: 'The SBA counts 6.3 million small businesses with anyone at all on the payroll, out of 36.2 million total. A $25,000 launch grant for 12.6 million more — three times as many employers as the country has now — is $315 billion.',
        sources: [
          {
            label: 'SBA Office of Advocacy, 2025',
            url: 'https://advocacy.sba.gov/2025/06/30/new-advocacy-report-shows-the-number-of-small-businesses-in-the-u-s-exceeds-36-million/'
          }
        ]
      },
      {
        id: 'dividend',
        label: 'Send every American a $2,000 check',
        cost: 600_000_000_000,
        note: 'One round of $2,000 per person — adults and children, the way the pandemic payments were written — costs about $600 billion, roughly twice what a year of the new tariffs brings in. Three fifths of the fortune, gone in one mailing.',
        sources: [
          {
            label: 'CRFB estimate',
            url: 'https://www.crfb.org/blogs/tariff-dividends-could-cost-600-billion-year'
          }
        ]
      },
      {
        id: 'debt-interest',
        label: 'Cover a year of interest on the national debt',
        cost: 970_000_000_000,
        per: 'year',
        maxUnits: 5,
        note: 'The federal government paid $970 billion in interest in FY2025 — up $89 billion in a year, and the third-largest line in the budget behind Social Security and Medicare. One year of it is almost exactly the fortune you started with.',
        sources: [
          {
            label: 'Peterson Foundation tracker',
            url: 'https://www.pgpf.org/programs-and-projects/fiscal-policy/monthly-interest-tracker-national-debt/'
          },
          {
            label: 'CRFB on interest costs',
            url: 'https://www.crfb.org/blogs/net-interest-costs-will-double-again-over-next-decade'
          }
        ]
      },
      {
        id: 'credit-cards',
        label: 'Erase every credit card balance in America',
        cost: 1_260_000_000_000,
        note: 'The New York Fed put card balances at $1.26 trillion in June 2026, just under the record set six months earlier. Clearing all of it costs more than the whole fortune — one household bill, larger than a trillion dollars.',
        sources: [
          {
            label: 'NY Fed household debt, Q2 2026',
            url: 'https://www.newyorkfed.org/newsevents/news/research/2026/20260811'
          }
        ]
      }
    ]
  },
  {
    id: 'wall',
    title: 'The wall',
    kicker: 'Tier nine',
    lede: 'And here is the other edge of it. These are the numbers that do not care how rich anyone is.',
    items: [
      {
        id: 'everyone',
        label: 'Hand every person on Earth $120',
        cost: 996_000_000_000,
        note: 'There are about 8.3 billion of us. Split the entire fortune evenly and everyone alive gets $120 — one tank of gas, one week of groceries. That is what a trillion dollars is, spread across the species.',
        sources: [
          { label: 'World population', url: 'https://www.worldometers.info/world-population/' }
        ]
      },
      {
        id: 'student-debt',
        label: 'Pay off all US student debt',
        cost: 1_866_000_000_000,
        note: 'Americans owed $1.866 trillion in student loans as of March 2026, per the Federal Reserve. The entire fortune covers a little more than half of it.',
        sources: [
          {
            label: 'Federal Reserve G.19',
            url: 'https://www.federalreserve.gov/releases/g19/current/'
          }
        ]
      },
      {
        id: 'infra-gap',
        label: 'Fix everything in America at once',
        cost: 3_700_000_000_000,
        note: 'ASCE prices a state of good repair across all eighteen categories it grades — roads, bridges, dams, levees, the grid, drinking water, transit, ports — at $9.1 trillion through 2033. Current funding trends cover $5.4 trillion of that. The hole is $3.7 trillion.',
        sources: [
          {
            label: 'ASCE 2025 Report Card',
            url: 'https://infrastructurereportcard.org/making-the-grade/'
          }
        ]
      },
      {
        id: 'climate',
        label: 'Fund the global energy transition for one year',
        cost: 4_500_000_000_000,
        note: 'The IEA estimates clean energy investment must reach $4.5 trillion a year by 2030 to stay on a 1.5°C path. The fortune buys about eleven weeks of it.',
        sources: [
          {
            label: 'IEA via WEF',
            url: 'https://www.weforum.org/stories/2023/09/iea-clean-energy-investment-global-warming/'
          }
        ]
      },
      {
        id: 'healthcare',
        label: 'Run the US health care system for one year',
        cost: 5_300_000_000_000,
        note: 'American health spending hit $5.3 trillion in 2024 — 18% of the entire economy, $15,474 per person. A trillion dollars covers about ten weeks of it.',
        sources: [
          {
            label: 'CMS National Health Expenditures',
            url: 'https://www.cms.gov/data-research/statistics-trends-and-reports/national-health-expenditure-data/historical'
          }
        ]
      }
    ]
  }
];

/** Every item, flat, in page order. */
export const allItems = tiers.flatMap((tier) => tier.items);

/**
 * One hue per tier at mid lightness, so the same value works as a grid square
 * and as a card's edge on either theme. Lives next to the tiers because a tier
 * added without a color paints nothing at all in the hero grid.
 */
export const tierColors: Record<string, string> = {
  toys: 'oklch(0.74 0.12 85)',
  cheap: 'oklch(0.72 0.13 160)',
  trophies: 'oklch(0.70 0.13 305)',
  country: 'oklch(0.70 0.12 250)',
  commons: 'oklch(0.73 0.13 122)',
  planet: 'oklch(0.74 0.11 195)',
  moonshots: 'oklch(0.68 0.15 30)',
  money: 'oklch(0.70 0.13 345)',
  wall: 'oklch(0.62 0.03 264)'
};
