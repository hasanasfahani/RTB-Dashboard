# RTB Core Banking BI Dashboard — Demo PRD

**Product:** RTB Business Intelligence Dashboard — Executive Demo Build
**Owner:** Hasan Asfahani
**Audience for this document:** Claude Code (implementation), RTB stakeholders (review)
**Version:** 1.4 — September 2026
**Source of truth for content:** `RTB_Core_Banking_BI_Insights_Catalogue.xlsx`, transcribed into `RTB_insights.json` (163 records)

---

## 0. Revision notes

### v1.4 — aligned to rtb.iq

v1.2 kept the palette and found soul in editorial voice. v1.4 revisits the surface itself,
against the bank's own website.

**Measuring it first changed the brief.** rtb.iq's navy is `#00205B` and its cyan `#00A5BD` —
byte for byte the tokens in §9 since v1.0. The palette was never the gap, so "make it look
like the bank" was never a repaint.

| § | Amendment |
|---|---|
| 9 | Two brand faces, self-hosted; the type scale retuned to their weights; `accent`, `positiveInk`, `warningInk`; neutral `canvas` and `line`; two radii |
| 9 | Arabic is no longer deferred — Tajawal ships, conditionally |
| 11.2 | Container 1600px → 1440px |
| 13 | Contrast is now a stated bar, with a gate behind it |

**The finding that matters most.** `cyan` on white is **2.95:1** — below the 4.5:1 WCAG AA
floor for text, and below even the 3:1 floor for large text and graphics. `muted` was
**3.10:1**. Between them they set every disclosure label, every link and 120 pieces of
secondary text. RT Bank had already solved this on its own site: its fee tables set figures in
a deeper teal, never in the brand cyan.

So the rule is not "use the brand colour". **A colour that carries text must be legible on the
surfaces it is used on**, and a brand accent that is not is kept for fills and rules — which is
exactly what the brand does with it. Writing that as a gate then caught two more the brief had
not mentioned: `positive` at 4.04:1 and `warning` at **2.20:1**.

**A second finding, about copying.** Their site uses a 16px radius throughout, so the obvious
move is one 16px token. It is wrong: their buttons are 40px tall, making 16px a ratio of
**0.40**, while our controls are 19–23px, where 16px lands at **0.70–0.85** — a pill, which is
not what their page looks like. §9 therefore carries **two** radii, and the smaller one takes
their *ratio* rather than their number.

The same judgement was applied twice more, and both are recorded in `IMPLEMENTATION_PLAN.md`
§2.25: their 67px hero type, photography and pill CTAs are marketing-site gestures that a
surface carrying 163 insights should not adopt; and their habit of setting a table's key figure
in the accent colour was **not** taken, because §8 already rules that colour is applied only
where there is a real threshold, and a tinted figure would compete with the red that marks a
breach.

---

### v1.3 — custom reports, and two pages removed

v1.2 gave the build a voice. v1.3 records a feature the product gained and two screens it
lost, both after that pass.

**Custom reports.** A reader can now assemble their own page from any of the 163 insights,
in their own order, each block reading whichever slice they point it at. It is described in
§5, §10, §11.8–11.10 and §12, and its build record is `IMPLEMENTATION_PLAN.md` §3b and §6b.

| § | Amendment |
|---|---|
| 4 | The no-storage rule is restated as a **consequence**, not just a prohibition: with nothing stored and no server, the share link *is* the save button |
| 5 | New directory `src/reports/` — model, scope, share, catalogue, layout, csv. `data/methodology.ts` removed |
| 10 | Nav gains `Reports`; **loses Methodology and Catalogue** |
| 11.6–11.7 | Deleted with their screens |
| 11.8–11.10 | New: the reports index, a report, and the block picker |
| 12 | Per-block scope, the one ⋮ menu, reorder by drag or arrow keys, CSV, copy link |
| 13 | The gate count, and the four suites |

**Three decisions worth stating here**, because each one closes off an obvious alternative:

- **A block is a whole insight**, not a panel. An insight is the named finding, and 73 of the
  163 carry two panels that belong together.
- **A report stores block references and nothing else** — never figures, never a scope of its
  own. Everything recomputes from `seriesFor`, so a report built today and opened next month
  describes next month rather than being a screenshot.
- **Some blocks must refuse a filter.** A block that compares branches, scoped to one branch,
  is a map with a single circle on it. Those blocks ignore the dimension they compare across
  and **say so on their face** — a struck-through chip and a sentence — rather than quietly
  answering a different question.

**Two pages removed**, at the owner's request on 2026-09-21: Methodology and Catalogue. This
is a deliberate divergence from §10 as v1.0–v1.2 described it. ⌘K still reaches any of the 163
by id or title; each insight's own caveat still appears in its "How this is calculated"
disclosure. `IMPLEMENTATION_PLAN.md` §2.23 records what went with them, including seven
verification checks that described the deleted screens and a chart caveat that had pointed at
the methodology page.

---

### v1.2 — the design pass

v1.1 reconciled this document with a build that worked. v1.2 records the pass that gave
that build a voice, commissioned on the brief that the dashboard felt **soulless**.

The diagnosis was that it reported numbers without ever saying anything about them:
every card carried a title, a chart and a textbook definition, and nothing on screen
told a reader what the numbers were *doing*. The palette was reviewed and **kept
unchanged**; soul was found in editorial voice, hierarchy and craft rather than colour.

| § | Amendment |
|---|---|
| 5 | New modules: `finding.ts`, `chartGuide.ts`, `attention.ts`, `insight/layout.ts`, `assets/logo-rtb.svg` |
| 8 | Chart conventions gain the reading-guide requirement |
| 9 | Tabular lining numerals; the RTB mark |
| 11.3 | Headline band restated as a position, with one dominant figure; the attention strip becomes a ranked editorial lede |
| 11.4 | The card gains a **finding line** and an **Info** disclosure, and a rank |
| 12 | Section layout chunks into rows rather than spanning a grid |

**One defect the pass exposed.** R-01's chart ended at 31,881 active customers while the
KPI tile beside it read 44,528 — the same measure, two numbers, one card. The sidecar
had been generating independently since the data layer was built, and no automated check
had caught it. It became visible the moment a card started stating its numbers in prose.
A `KpiCards` second panel now reads its values off the primary series. 14 cards were
affected. This is the argument for the finding line in miniature.

---

### v1.1 — reconciliation with the build

v1.0 was written before the build. v1.1 reconciled this document with what was actually
built, so the two do not disagree. Nothing in the product's intent has changed; the
amendments are corrections of fact, three deliberate deviations, and the decisions that
were left open.

| § | Amendment |
|---|---|
| 4 | Hand-rolled SVG list corrected — `FlowDiagram` and `TrafficLightPanel` are not used by any insight |
| 5 | Repository structure matches the build; the data file keeps its supplied name, `RTB_insights.json` |
| 6 | The JSON is an envelope, not a bare array. `ChartComponent` drops the two unused members |
| 7.1 | **The fixture did not reconcile.** A tax line was missing, NPL coverage was arithmetically impossible, and CIR was wrong. All three corrected |
| 7.3 | The daily-series rule is now unambiguous |
| 7.4 | 15 shape generators, not ~12; `seriesFor` takes a panel index |
| 8 | 39 variants, not 42. Three listed variants are used by nothing. The prop contract folds `unit` and `reference` into `data` |
| 10 | Tab labels come from `domain`, not `group`; the section count is 30 |
| 11.4 | Two-panel cards use one of two layouts, not a flat 50/50 |
| 12 | Period widens the window rather than reseeding |
| 14 | Superseded by `IMPLEMENTATION_PLAN.md`; the Phase 1 component list was short by two |
| A–B | Counts corrected |

**Three deliberate deviations** from v1.0, each argued in `IMPLEMENTATION_PLAN.md` §2:
the chart prop contract (§8), mount animation disabled (§8), and the CIR figure (§7.1).

The build record, including every correction and how it was verified, is in
`IMPLEMENTATION_PLAN.md`. Where the two documents still differ on a detail, that file is
the one that matches the code.

---

## 1. What this is

A **frontend-only, fully hardcoded demonstration** of the RTB Business Intelligence Dashboard. Its single job is to let the CEO see and feel what the dashboard will be, so that the decision to fund the backend and data-integration work is made against a working artifact rather than a slide.

Every number in this build is invented. No backend, no API, no database, no authentication. The application must run with `npm install && npm run dev` and nothing else.

**Companion file:** `RTB_insights.json` — all 163 insights from the catalogue, each already mapped to the chart component that should render it. Read it before planning. It is the content spine of the entire application and should be imported directly, not retyped.

### Why this exists

The insights catalogue proves the analytical thinking. The data requirements pack proves the engineering is understood. Neither of them shows a CEO what he will look at on a Tuesday morning. This build closes that gap.

---

## 2. Goals and non-goals

### Goals

| # | Goal | How we know it worked |
|---|---|---|
| G1 | The CEO understands the product in under five minutes without narration | A stakeholder who has not seen the catalogue can navigate it unaided |
| G2 | The scale of the analytical coverage is visible | All 163 insights are reachable and rendered, not described |
| G3 | The visual language is agreed before backend work starts | Colours, chart conventions and layout are settled from this build |
| G4 | It is obvious this is illustrative data | Nobody leaves the room believing they saw RTB's real position |
| G5 | The build is disposable but the components are not | Chart components carry forward into the production build unchanged |

### Non-goals — explicitly out of scope

- Any backend, API layer, database, or data fetching of any kind
- Authentication, user accounts, roles, permissions
- Real RTB data. Under no circumstances should real figures be used, even if available
- Data export to Excel or PDF (a browser print stylesheet is enough)
- Mobile-first design. Target is a boardroom screen and a laptop; degrade gracefully below 1024px but do not optimise for phones
- Internationalisation. English only in this build, but see §9 on Arabic readiness
- Write operations of any kind — no forms, no saved views, no user preferences persisted
- Accessibility beyond keyboard navigation and sensible contrast. Full WCAG audit is a production concern

---

## 3. Users of the demo

| User | What they need from it |
|---|---|
| **CEO (primary)** | "What is the state of my bank on one screen, and can I get from there to the thing that explains it?" |
| CFO / CRO | Confidence that the ratios and definitions are the ones they actually use |
| Head of Retail / Corporate | That their division is represented at the depth they work at |
| IT / data team | A concrete picture of what they are being asked to feed |

Design for the CEO. The others are watching over his shoulder.

---

## 4. Technical constraints

```
Framework      React 18 + TypeScript (strict)
Build          Vite
Styling        Tailwind CSS
Charts         Recharts for standard chart types; hand-rolled SVG for
               Sankey, GeoMap, Treemap, Heatmap, Gauge, Bullet, Funnel,
               Waterfall, ScenarioBars, BoxPlot. DataTable is an HTML table;
               VintageCurves is Recharts on an ordinal axis
Routing        React Router
State          React state + context only. No Redux, no Zustand, no react-query
Icons          lucide-react
Fonts          System stack. No webfont downloads
```

**Hard rules**

- No network calls. Not to an API, not to a CDN, not for fonts or images. The build must work fully offline, because the demo may be given on a bank guest network or none at all.
- No `localStorage`, `sessionStorage`, or IndexedDB. State resets on refresh, deliberately — a demo should always start from a known position.
- No backend simulation layer, no mock service worker, no fake latency. Data is imported synchronously from TypeScript modules. Loading skeletons are a production concern, not this one.
- Everything is typed. `any` is not acceptable in the insight, chart, or data layers.

---

### 4.1 A consequence of the storage rule — added in v1.3

The prohibition on `localStorage`, `sessionStorage` and IndexedDB was written for the insight
pages, where nothing needed keeping. Custom reports are the first thing a reader *makes*, and
the rule still holds — so a report lives in React state for the session and no longer.

That is not a gap to be apologised for in a tooltip. **The share link is the save button:** the
whole report travels in the URL, base64url over UTF-8 bytes so an Arabic name survives, and a
colleague opening it gets their own copy. Both report screens say in one plain sentence that
nothing is stored, because a reader who discovers it by refreshing has been misled by the page.

The link's length is therefore a correctness property. A plain forty-block report is about 550
characters; a per-block slice *and* title on every block reaches 2,044 at twelve blocks. Past
2,000 the page warns, and names the overrides as the cause, because mail and chat clients cut
long URLs and a cut link is lost work.

---

## 5. Repository structure

```
rtb-bi-demo/
├── src/
│   ├── main.tsx
│   ├── App.tsx                      # routes
│   ├── types.ts                     # domain types + the ChartData contract
│   ├── data/
│   │   ├── RTB_insights.json        # SUPPLIED — 163 records, do not edit
│   │   ├── insights.ts              # typed loader + selectors: byLayer(), sectionsFor(), bySection()
│   │   ├── bank.ts                  # the fixed "shape of the bank" fixture (§7.1)
│   │   ├── entities.ts              # branches, products, segments, sectors, currencies
│   │   ├── dimensions.ts            # categorical vocabularies + dimensionFor()
│   │   ├── anchors.ts               # magnitude, trend and thresholds per insight
│   │   ├── generators.ts            # seeded series generators (§7.3)
│   │   ├── shapes.ts                # the 15 shape generators (§7.4)
│   │   ├── demoPath.ts              # bespoke data for the demo-path insights
│   │   ├── filters.ts               # filter model, magnitudes and wording
│   │   ├── finding.ts               # what the numbers are doing — one line per panel (§11.4)
│   │   ├── chartGuide.ts            # how to read each chart type (§11.4)
│   │   ├── attention.ts             # the Executive callouts (§11.3)
│   │   └── seriesFor.ts             # insightId + panel -> chart-ready data (§7.4)
│   ├── reports/                     # custom reports — all pure, no React, no storage
│   │   ├── model.ts                 # CustomReport, ReportBlock, and every edit on them
│   │   ├── scope.ts                 # per-block scope, exemptions (§12), and the chips
│   │   ├── share.ts                 # base64url encode/decode, the link, its weight
│   │   ├── catalogue.ts             # the 163 as a block registry for the picker
│   │   ├── layout.ts                # row packing, drag arithmetic, the nav rail
│   │   └── csv.ts                   # one CSV writer over the 15 shapes
│   ├── design/
│   │   ├── tokens.ts                # colours, spacing, typography scale
│   │   └── format.ts                # number, currency, percent, date formatters
│   ├── state/
│   │   └── FiltersContext.tsx       # global filter state (§12)
│   ├── assets/
│   │   └── logo-rtb.svg             # SUPPLIED — inlined at build, nothing fetched at runtime
│   ├── components/
│   │   ├── charts/                  # the 23 chart components (§8) + contract, registry, common
│   │   ├── insight/                 # InsightCard + layout (card rank and row chunking)
│   │   ├── layout/                  # AppShell, TopBar, MainNav, SectionTabs, FilterBar, DemoBanner
│   │   ├── ui/                      # Card, Badge, Delta
│   │   └── CommandPalette.tsx
│   ├── pages/
│   │   ├── Home.tsx                 # the Cover sheet — title, scope, entry points
│   │   ├── Executive.tsx            # headline band + attention strip + the shared shell
│   │   ├── InsightPage.tsx          # serves Bank-Wide, Retail and Corporate
│   │   ├── InsightDetail.tsx
│   │   ├── Methodology.tsx
│   │   ├── Catalogue.tsx
│   │   └── DevGallery.tsx           # /dev/gallery — every component and variant
│   └── index.css
├── scripts/                         # verify-data, verify-series, verify-tokens
├── index.html
├── tailwind.config.ts               # theme generated from tokens.ts
└── README.md                        # how to run it, and a one-paragraph "this is fake data"
```

**The data file keeps its supplied name.** v1.0 called it `insights.json` here and
`RTB_insights.json` in Appendix A. It is `RTB_insights.json`, so a refreshed export from
the workbook drops straight in.

**`npm run verify`** runs the three check suites — 151 assertions covering the catalogue,
all 236 chart panels, and the design-system and structural rules.

---

## 6. Data model

`RTB_insights.json` ships with this shape. Note that it is an **envelope**, not a bare
array — v1.0 typed the record but not the wrapper:

```ts
export interface InsightCatalogue {
  readonly generatedFrom: string;   // 'RTB_Core_Banking_BI_Insights_Catalogue.xlsx'
  readonly count: number;           // 163
  readonly insights: readonly Insight[];
}

export type Layer = 'executive' | 'bank-wide' | 'retail' | 'corporate';

/**
 * 23 components, not 25. `TrafficLightPanel` and `FlowDiagram` appeared in v1.0's union
 * and §4's hand-rolled list, but no panel in the catalogue references either. Omitting
 * them keeps the type exhaustive over the real data. `Heatmap:rag` does the
 * traffic-light job.
 */
export type ChartComponent =
  | 'KpiCards' | 'LineChart' | 'AreaChart' | 'BarChart' | 'RankedBar'
  | 'StackedBar' | 'ComboChart' | 'DonutChart' | 'Treemap' | 'FunnelChart'
  | 'WaterfallChart' | 'Heatmap' | 'ParetoChart' | 'GaugeChart' | 'BulletChart'
  | 'ScatterPlot' | 'SankeyDiagram' | 'GeoMap' | 'VintageCurves' | 'Histogram'
  | 'BoxPlot' | 'DataTable' | 'ScenarioBars';

export interface Panel {
  component: ChartComponent;
  variant: string;            // e.g. 'stacked', 'lorenz', 'regulatoryFloor'
}

export interface Insight {
  id: string;                 // 'R-17' — stable, used in routes and deep links
  layer: Layer;
  layerLabel: string;
  domain: string;             // 'Deposits & Liabilities'
  group: string;
  title: string;              // 'Deposit concentration (top 1% / 5% of customers)'
  whatItTells: string;        // one-line business meaning
  method: string;             // full calculation methodology from the catalogue
  vizLabel: string;           // 'Pareto chart (Lorenz curve)'
  panels: Panel[];            // 1 or 2 panels
  refresh: string;            // 'Daily / Monthly'
  unit: 'iqd' | 'percent' | 'count';
  demoPath: boolean;          // true for the 36 insights on the CEO narrative path
}
```

**`panels`** is the instruction for rendering. An insight with two panels renders two charts side by side inside one card. Do not invent additional panels and do not collapse two into one.

**`demoPath`** marks the 36 insights that carry the CEO story. Those must be perfect. The remaining 127 must be present and correct, but they are browsed rather than presented.

**The array order is workbook order.** Insight ids are contiguous and ascending within
each layer, so pages, tabs and previous/next all derive from the array index. Nothing
sorts.

---

## 7. Mock data

This is the part that decides whether the demo is convincing or embarrassing. A CFO will spot an incoherent balance sheet in four seconds.

### 7.1 The bank fixture — one coherent shape, everything derives from it

Hardcode a single fixture representing a mid-sized Iraqi private bank, and derive every figure in the application from it so that totals reconcile across screens. Figures in IQD.

> **v1.1 — the v1.0 fixture did not reconcile.** Turning the consistency rules below
> into assertions surfaced three arithmetic problems. All three are corrected here and
> the working is in `IMPLEMENTATION_PLAN.md` §2.10.
>
> 1. **A tax line was missing.** The v1.0 income lines give pre-tax profit of 8.60B a
>    month — ROE 16.5% and ROA 2.0%, not the stated 11.6% and 1.38%. Both stated ratios
>    independently imply the *same* ~72.3B annual net profit, i.e. a 29.9% effective tax
>    rate, so the fixture was clearly built with tax and the line was dropped. Added at
>    30.0%; ROE and ROA now hold.
> 2. **NPL coverage of 78.4% was impossible.** A 6.8% NPL ratio on 1,880B of gross loans
>    is a 127.84B NPL stock, and 128.00B of provisions against it is 100.1% coverage.
>    Provisions are now split into specific (Stage 3) and general (Stage 1–2 collective
>    ECL), with coverage measured on the specific leg. This reconciles exactly, leaves
>    the balance sheet untouched, and is consistent with Appendix A note 4.
> 3. **CIR is 52.4%, not 54.8%.** 11.80B of opex over 22.50B of operating income. No
>    adjustment reconciles 54.8% without breaking ROE and ROA, so the derived figure
>    wins. This is a **deliberate deviation** from v1.0.
>
> NIM lands at 3.44% against a stated 3.42% — a 2bp rounding gap, accepted. It holds only
> if earning assets include cash and central bank balances, which is right for an Iraqi
> bank where CBI balances are remunerated. Both balance sheet identities and LDR held
> exactly as written.

```ts
export const bank = {
  asOf: '2026-08-31',
  balanceSheet: {
    totalAssets: 5_240_000_000_000,
    cashAndCentralBank: 1_610_000_000_000,
    investmentSecurities: 1_090_000_000_000,
    interbankPlacements: 410_000_000_000,
    grossLoans: 1_880_000_000_000,
    loanLossProvisions: -128_000_000_000,   // = -(specific + general)
    specificProvisions: 100_226_560_000,    // Stage 3 — the NPL coverage numerator
    generalProvisions: 27_773_440_000,      // Stage 1-2 collective ECL
    otherAssets: 378_000_000_000,
    customerDeposits: 4_120_000_000_000,
    interbankBorrowing: 180_000_000_000,
    otherLiabilities: 316_000_000_000,
    equity: 624_000_000_000,
    nplStock: 127_840_000_000,              // 6.8% of gross loans, a primitive
  },
  incomeMonthly: {
    interestIncome: 21_400_000_000,
    interestExpense: -7_100_000_000,
    feesAndCommissions: 5_900_000_000,
    fxAndTrading: 2_300_000_000,
    operatingExpenses: -11_800_000_000,
    impairmentCharge: -2_100_000_000,
    taxExpense: -2_580_000_000,             // added — 30.0% of pre-tax profit
  },
  // Off balance sheet: LC and guarantee facilities are contingents, not loans, so they
  // sit outside grossLoans and the "loans by product" rule below.
  contingents: {
    letterOfCreditOutstanding: 392_000_000_000,
    guaranteesOutstanding: 268_000_000_000,
    undrawnCommitments: 214_000_000_000,
  },
  base: {
    retailCustomers: 268_400,
    corporateCustomers: 3_120,
    totalAccounts: 412_700,
    activeDigitalUsers: 74_900,
    branches: 11,
    atms: 86,
    staffFte: 642,
  },
};
```

**Ratios are derived, not stored.** `nim`, `cir`, `roe`, `roa`, `ldr`, `nplRatio` and
`nplCoverage` are computed from the primitives above, so there is one source of truth
and they cannot drift:

```
nim  3.44   cir  52.4   roe  11.6   roa  1.38
ldr  45.6   nplRatio 6.8   nplCoverage 78.4
```

`car` 18.4, `cet1` 16.1, `lcr` 142.0, `nsfr` 118.0 and `casaRatio` 71.2 are **declared**
rather than derived: CAR and CET1 need risk-weighted assets and LCR/NSFR need HQLA and
stress-outflow models, all out of scope for a frontend demo. RWA is back-solved from CAR
(≈3,391B, a 64.7% average risk weight) so capital charts reconcile. `casaRatio` is
declared here and **enforced** in `entities.ts`, which must allocate deposit products to
hit 71.2%.

Consistency rules that must hold across every screen — these are **assertions that throw
at module load**, not comments. A build that starts is a build whose balance sheet adds up:

- Deposits by product, by branch, by currency and by segment each sum to `customerDeposits`
- Loans by product, by sector and by branch each sum to `grossLoans`
- Assets in the composition chart sum to `totalAssets`
- Liabilities plus equity sum to `totalAssets`
- Specific plus general provisions equal `-loanLossProvisions`
- LDR shown anywhere equals `grossLoans / customerDeposits`
- RWA ties back to the declared CAR
- Any month-on-month series ends at the fixture value for `asOf`

### 7.2 Entity fixtures

**Branches (11)** — real cities, plausible sizes, with coordinates for `GeoMap`:

```
Baghdad Main (44.39, 33.31) · Karrada (44.42, 33.30) · Erbil Main (44.01, 36.19)
Erbil Ankawa (43.99, 36.23) · Sulaymaniyah (45.43, 35.56) · Basra (47.78, 30.51)
Mosul (43.13, 36.34) · Kirkuk (44.39, 35.47) · Najaf (44.32, 32.03)
Karbala (44.02, 32.61) · Duhok (42.99, 36.87)
```
Baghdad Main and Erbil Main should carry roughly 38% of deposits between them, so the concentration charts have something to show.

**Products** — Current, Savings, Term deposit 3M/6M/12M, Salary account, Personal loan, Auto loan, Mortgage, Overdraft, Corporate term loan, Revolving credit, LC facility, Guarantee facility.

**Segments** — Retail: Mass, Affluent, Private. Corporate: SME, Mid-cap, Large corporate.

**Sectors** — Trade, Construction, Manufacturing, Oil services, Agriculture, Transport, Healthcare, Education, Real estate, Hospitality, Telecoms.

**Currencies** — IQD 78%, USD 20%, EUR 1.5%, other 0.5% of deposits.

### 7.3 Series generation

All generators are **seeded by insight ID** so a chart looks identical on every reload. A chart that reshuffles between two passes through the demo destroys credibility faster than any wrong number.

```ts
function seeded(seed: string): () => number   // simple deterministic PRNG, e.g. mulberry32 over a string hash
```

Rules:

- **36 months of history**, ending at `bank.asOf`. Monthly granularity unless the insight's `refresh` is **exactly** `Daily`, in which case generate 90 days. v1.0 was ambiguous here: 72 records read `Daily / Monthly`, and only 6 read `Daily`. Those 6 get a day axis; the other 157 are monthly, because a 90-point axis is illegible on a compact card.
- **Trends have direction.** Deposits grow ~1.1% a month, loans ~1.6%, NPL drifts up slightly then improves in the last four months, digital adoption follows a logistic curve. Flat noise looks synthetic.
- **Seasonality where it is real.** Ramadan and Eid dips in corporate volumes, month-end salary spikes on the 25th–28th for retail credits, Friday troughs in branch traffic.
- **Concentration is Pareto-shaped.** Top 1% of customers hold ~34% of deposits, top 5% hold ~58%. This is the point of R-17, G-23 and C-21 and it must look right.
- **Rounded but not suspiciously round.** `4,121,483` not `4,120,000`, except in the fixture headline values.
- **No negative balances, no impossible ratios.** Clamp everything — but a share of a composition is bounded by the composition, not by its metric's own ceiling.
- **The seed excludes the period filter.** Branch, division and currency fold into the seed; period only widens the window (§12).

### 7.4 `seriesFor(insightId, panelIndex, filters)`

One function, returns chart-ready data for any panel of any of the 163 IDs.

```ts
export function seriesFor(id: string, panelIndex: number, filters: Filters): ChartData;
export function panelsFor(id: string, filters: Filters): readonly ChartData[];
```

**The panel index is part of the signature.** v1.0 wrote `seriesFor(id, filters)`, but 73
of the 163 insights carry two panels that must not render the same chart.

Do **not** write 163 bespoke cases. Write **15** shape generators and map each insight to
a shape with parameters derived from its `unit`, its `panels[n].component` and its domain:

```
timeSeries · breakdown · ranked · matrix · funnelSteps · distribution · flows
scatterPoints · gaugeSet · bulletRows · tableRows · waterfallSteps
geoPoints · kpiSet · scenarioSet
```

v1.0 suggested ~12 and listed the first twelve. `GeoMap`, `KpiCards` and `ScenarioBars`
cannot borrow another shape, so they need their own. One mapping override:
`StackedBar:ladder` is a bucket breakdown, not a time series.

`gaugeSet` and `bulletRows` return **arrays** — E-02 is one panel showing NIM *and* CIR,
E-04 shows LCR, NSFR *and* LDR, E-03 shows ROE *and* ROA. This is handled generically by
splitting the title on `&`, `,` and `/` and resolving each fragment, not by special-casing.

Bespoke cases are permitted only for the 36 `demoPath` insights. In practice **two were
needed**: most demo-path anchors already resolve to the `bank` fixture.

---

## 8. Chart component library

23 components cover all 163 insights. Build them once, correctly, with a uniform prop contract.

The counts below are **panel occurrences**, not insights — they sum to 236, the total
number of panels across the 163 records. Three variants listed in v1.0 are used by no
panel and are not built: `LineChart.multi`, `ParetoChart.withLimit` and
`BarChart.withTarget`. The real total is **39** `(component, variant)` pairs.

| Component | Panels | Variants |
|---|---|---|
| LineChart | 32 | `single`, `appetiteBand`, `peakMarkers`, `adoptionCurve` |
| StackedBar | 30 | `absolute`, `percent`, `ladder` |
| KpiCards | 27 | `sparkline`, `plain` |
| ComboChart | 16 | `barsPlusLine`, `dualAxisLines` |
| BulletChart | 12 | `plain` |
| WaterfallChart | 12 | `plain` |
| Heatmap | 12 | `intensity`, `rag`, `cohort` |
| Treemap | 11 | `plain` |
| ParetoChart | 11 | `plain`, `lorenz` |
| BarChart | 10 | `plain` |
| AreaChart | 9 | `single`, `stacked` |
| GaugeChart | 7 | `target`, `regulatoryFloor` |
| DonutChart | 6 | `plain` |
| SankeyDiagram | 6 | `plain` |
| FunnelChart | 6 | `plain` |
| ScatterPlot | 5 | `plain`, `quadrant`, `breakEven` |
| GeoMap | 5 | `iraqBranches` |
| DataTable | 5 | `exception` |
| ScenarioBars | 4 | `scenarios`, `tornado` |
| Histogram | 4 | `single`, `overlay` |
| RankedBar | 3 | `plain` |
| BoxPlot | 2 | `plain` |
| VintageCurves | 1 | `plain` |

**Uniform prop contract:**

```ts
interface ChartProps<D extends ChartData = ChartData> {
  data: D;                  // carries `unit` and `reference` — see below
  variant: ChartVariant;
  height?: number;          // default 240, or 160 when compact
  compact?: boolean;        // true inside catalogue grid cards
}
```

**Deliberate deviation from v1.0.** `unit` and `reference` are not separate props. The
`ChartData` returned by `seriesFor` already carries both: every shape has a `unit`, and
`reference` is emitted by the shape generator that knows whether the metric has a target
or a regulatory floor. Passing them alongside `data` would mean two sources for the same
fact and an obvious way for them to disagree. Charts read `data.unit` and
`data.reference`.

Every chart must handle: an empty dataset, a single data point, and a `compact` render at ~160px height without axis labels colliding.

**Mount animation is off across the library** — a second deliberate deviation. The Retail
page mounts around 78 chart panels at once and Recharts animates for 1500ms per chart;
animating them together works against §13's "cold start to interactive under two seconds"
and "no layout shift".

**Chart conventions — apply everywhere, no exceptions:**

- Navy is the primary series, cyan the secondary, then the extended ramp
- Target and appetite references are dashed, never solid
- Regulatory floors are red, dashed, and always labelled
- Good/bad colouring only where there is a real threshold. Never colour a neutral category red because it is third in the list
- **Red is reserved for a regulatory breach.** A target miss reads amber, never red — red is tied to floors, and using it for an ordinary miss dilutes the one signal that must not be missed. A gauge also needs to know which way is good: CIR *above* its target is drift, CAR above its target is not
- Heat intensity uses the navy→cyan ramp, never red/green: a magnitude is not a threshold. A RAG cell carries an explicit status, which is
- A waterfall's decreases are not red. In a P&L bridge a negative step is an operating expense or a tax charge — expected, not bad
- **Every component carries a reading guide.** A chart type is not finished until someone who has never seen it can be told, in two sentences, how its marks encode the data and what to look for. This is content, not decoration, and it lives beside the component (§11.4)
- Tooltips on hover for every chart, showing the formatted value and the dimension label
- No chart legends where two series can be labelled directly on the plot

---

## 9. Design system

```ts
export const tokens = {
  color: {
    // Brand. Both taken from rtb.iq, and identical to what this document
    // specified from v1.0 — the palette was always right.
    navy:    '#00205B',   // primary, headers, primary series
    cyan:    '#00A5BD',   // FILLS, MARKS AND RULES ONLY — never text. See below.
    ink:     '#1A2436',   // body text
    muted:   '#5C6B7F',   // secondary text, axis labels
    accent:  '#00768A',   // the cyan, deepened, for anything that is text
    // Neutral, not blue-tinted: the brand reserves blue for itself.
    line:    '#E6E6E6',   // borders, gridlines
    surface: '#FFFFFF',
    canvas:  '#F9F9F9',   // page background
    series:  ['#00205B', '#00A5BD', '#4C7FB8', '#8FD9E4', '#9BB0CC', '#D3E0EC'],
    // Status hues are fills; their *Ink partners carry text.
    positive:'#2F8F5B',  positiveInk: '#256F47',
    warning: '#E2A33C',  warningInk:  '#8C6212',
    negative:'#C0392B',  // already 5.44:1; needs no partner
  },
  // Two values, because their single 16px is 0.40 of a 40px button and would be
  // 0.85 of one of ours. `chip` takes their ratio, not their number.
  radius: { card: 16, chip: 8 },
  space: [4, 8, 12, 16, 24, 32, 48],
  type: {
    display: '32px/1.15 500 tracking-[-0.02em]',
    h1: '22px/1.25 500 tracking-[-0.015em]',
    h2: '15px/1.3 600',
    kpi: '28px/1 700 tracking-[-0.02em]',   // a figure, not a heading: stays bold
    body: '13px/1.5 400',
    label: '10px/1.2 700 uppercase tracking-[0.08em]',
    micro: '9px/1.2 400',
  },
};
```

**Two faces, as the bank uses.** **Fira Sans** sets headings and figures, **Barlow** sets text
and UI. Both are SIL OFL and both are self-hosted — a webfont request is a network call, and
§4 forbids those. Their headings are **medium, not bold**, with negative tracking that tightens
as the size grows; every heading at 700, as v1.0–v1.3 specified, read heavier and more
institutional than the brand does itself. Bold is reserved for figures and for the small
uppercase label.

**A colour that carries text must be legible on the surfaces it is used on.** `cyan` is the
brand accent at its exact brand value and is used for chips, marks and the 2px active rule —
never for text, where at 2.95:1 on white it fails AA and misses even the 3:1 graphics floor.
`accent` carries text and filled-control labels. The same split applies to the two status
hues. Every text token clears **4.5:1 on both `surface` and `canvas`**, and `verify:tokens`
fails the build if one does not.

**Arabic ships.** Tajawal covers Arabic, as it does on rtb.iq. This is no longer a
readiness exercise: a custom report can be named in Arabic today (§11.9), and the share link
encodes UTF-8 bytes precisely so that survives. The face is declared with an explicit
`unicode-range`, so it is fetched when an Arabic glyph is on the page and never otherwise —
the packaged stylesheet omits that range, and without it the file downloaded on every
all-Latin page.

**The RTB mark** sits at the head of the top bar, paired with the product name across a
hairline. It is an SVG drawn in the two brand colours above, so it needs no recolouring,
and it is inlined at build time — nothing is fetched at runtime (§4).

**Tabular lining numerals, everywhere.** `font-variant-numeric: tabular-nums lining-nums`
on the body. Financial columns have to align digit for digit; proportional figures make a
column of balances look ragged and are the most common tell of amateur finance interfaces.

**Formatting rules — put these in `format.ts` and never format inline:**

- IQD large values compact: `4.12T IQD`, `284.6B IQD`, `1.9M IQD`. Full value in the tooltip with thousands separators.
- Percentages to one decimal: `18.4%`. Ratios to two: `1.42x`.
- Counts with separators: `268,400`.
- Deltas always signed with direction colour: `+2.4%` green, `−1.1%` red — **except** for cost, NPL, CIR and impairment, where down is good. Encode this per metric, not per sign.
- Dates as `31 Aug 2026`. Never `08/31/2026`.
- **Arabic:** do not hardcode `text-left` or `ml-*` for content alignment; use logical properties (`ps-*`, `pe-*`, `text-start`) so an RTL pass is a config change and not a rewrite. Arabic content **does** occur — a report name (§11.9) — and Tajawal covers it. Anything that reads a direction must take it from the element, never assume LTR: the drag-and-drop edge test in §12.1 does exactly this, and a hardcoded `x < midpoint` would invert every drop under RTL.

---

## 10. Information architecture — mirrors the workbook exactly

The navigation is a direct translation of the source Excel file. **Each sheet is a page in the main navigation. Each section within a sheet is a tab on that page.** Nothing is merged, renamed or reordered.

| Excel sheet | Nav item | Route | Tabs (sections) | Insights |
|---|---|---|---|---|
| Cover | Home | `/` | — | — |
| Executive 360 | Executive 360° | `/executive` | All + 7 | 8 |
| Bank-Wide Insights | Bank-Wide | `/bank-wide` | All + 9 | 52 |
| Retail Insights | Retail | `/retail` | All + 7 | 54 |
| Corporate Insights | Corporate | `/corporate` | All + 7 | 49 |
| *(addition)* | Reports | `/reports`, `/reports/:id` | — | the reader's own |

**Removed in v1.3**, at the owner's request: `Methodology` (`/methodology`) and `Catalogue`
(`/catalogue`). Both routes now fall through to Home rather than to a dead end. The six
methodology notes are no longer rendered anywhere; each insight's own `method` text is still
on its card.

Deep links: `/retail/deposits-liabilities` opens the Retail page with that tab active. `/insight/:id` remains available as a full-screen single view.

**Tab sets, in workbook order — do not reorder:**

```
/executive     All · Balance Sheet · Profitability Ratios · Liquidity · Capital ·
               Business Mix · Credit Quality · Planning

/bank-wide     All · Financial Performance (8) · Balance Sheet Structure (5) ·
               Treasury, ALM & Market Risk (7) · Liquidity & Funding (6) · Capital (4) ·
               Bank-Wide Credit Risk (7) · Operations & Efficiency (6) ·
               Franchise & Customers (5) · Compliance & Financial Crime (4)

/retail        All · Customer Growth & Base (10) · Deposits & Liabilities (10) ·
               Retail Lending (10) · Payments, Cards & Transactions (6) ·
               Channels & Digital (6) · Retail Risk & Collections (7) ·
               Retail Profitability (5)

/corporate     All · Client Base & Relationships (8) · Corporate Lending (10) ·
               Corporate Deposits (6) · Trade Finance & Guarantees (7) ·
               Cash Management & Payments (5) · Corporate Risk (8) ·
               Corporate Profitability (5)
```

Tab membership comes from the `group` field in `RTB_insights.json`. Derive it at runtime
— never hardcode the list — so the tabs cannot drift from the content.

**Tab *labels* come from `domain`, not `group`.** Seven records (G-14 to G-20) carry
`group: "Treasury, Alm & Market Risk"` while `domain` has the correct
`"Treasury, ALM & Market Risk"`. Using `group` for the label would put "Alm" on a
boardroom screen. `group` is the key and the slug source; `domain` is what is displayed.

**Section slugs are scoped to their layer.** `Capital` is a section on both Executive and
Bank-Wide, so a global slug map collides. Key on `(layer, group)`.

**There are 30 sections**, not 29 — §10's prose and Appendix B disagreed in v1.0.

---

## 11. Screen specifications

### 11.1 Demo banner — build this first

A slim persistent bar, cyan left border, above the top bar on every route:

> **Illustrative data.** All figures in this demonstration are synthetic and generated for the purpose of showing dashboard structure and capability. They do not represent RTB's actual financial position.

Not dismissible. This protects the presentation more than it costs in screen space.

### 11.2 Page shell and tab bar — shared by all four insight pages

One component serves Executive, Bank-Wide, Retail and Corporate. The page differs only by which slice of `RTB_insights.json` it receives.

**Content is capped at 1440px** and centred, which is where rtb.iq caps its own. Wider than
that and a two-column row of cards stretches until the chart and the sentence describing it
stop reading as one thing.

**Page header**

- Layer name, insight count, section count, one-line description
- As-of strip: `Data as of 31 August 2026` plus the active filter state in words

**Tab bar** — directly beneath the header, sticky on scroll

- `All` is the default tab: every insight on the page, grouped under section headings in workbook order. This is the scroll-through view and the one used in the demo
- Then one tab per section, in workbook order, each showing that section's insights only
- Each tab label carries its insight count as a superscript chip: `Retail Lending ¹⁰`
- Active tab: navy text, 2px cyan underline. Inactive: muted, no underline
- Tab state lives in the URL so any tab is deep-linkable and the back button works
- Horizontal scroll with fade edges when nine tabs exceed the width, never wrap to a second row
- Switching tabs must not remount charts already rendered — keep mounted, toggle visibility, so tab switching is instant during a demo

**Content area**

Insight cards in a 2-column grid, in workbook order within each section.

### 11.3 Executive 360° — `/executive`

Same shell as the other three, with two additions above the tab bar, because this is the screen the CEO sees first and judges the product by:

1. **Headline band** — navy, full bleed. It **opens with the position stated in a
   sentence** — *"RTB holds 5.24T IQD in assets against 4.12T IQD of customer deposits,
   lending 45.6% of what it takes in, with capital at 18.4% against a 12.5% regulatory
   floor"* — and then shows the four figures: Total assets, Customer deposits, Net
   profit MTD, CAR, each with a MoM delta and a 12-month sparkline.

   **One figure dominates.** Total assets is set at 56px and the other three at the KPI
   size beside it. v1.0 specified four equal tiles; four numbers at the same size say
   nothing about which one matters, and a screen that opens without a claim has not
   opened at all.

2. **Attention strip** — a **ranked editorial lede**, not a row of equal callouts. The
   first statement is set at h1 and given the room; the rest follow as a list. Each
   links to the insight that explains it, and each is computed from the rendered data
   under the active filters, so the strip cannot contradict the chart it points at.

   Set in ink on white. An earlier pass used a pale amber wash, which reads as form
   validation rather than editorial judgement.

**Motion, of which there are two pieces.** On arrival at this screen, the position
sentence and the headline figure rise and fade in over 520ms — **once per session**.
Returning to the screen does not replay it; a reload does.

Across every insight page, **a card fades and rises 12px as it scrolls into frame**, once
each. The motion sits on the card, never on the chart's marks: SVG `d` and `points` are
not CSS-animatable, so gauges, treemaps and Sankeys could never draw themselves, and
moving the animation up to the container is what lets all 23 component types enter
identically. It is compositor-only and rate-limited by scroll position.

A card must never depend on that animation to become visible — a page that is not
compositing receives no observer callbacks, and the reveal has an escape hatch that
renders it plainly visible with no motion involved.

Charts themselves never animate, on mount or on a data change. A transition on filter change was
built and reviewed, and rejected for two reasons: a filter change already blocks the main
thread for ~450ms re-rendering 78 panels, and only 13 of the 23 components can transition
at all — SVG `d` and `points` are not CSS-transitionable — so a filter change had some
charts gliding while gauges, treemaps and Sankeys snapped. A partial transition across a
chart library reads as breakage, not polish.

`prefers-reduced-motion` is honoured, and a single flag in `design/motion.ts` removes the
arrival as well.

The `All` tab then renders E-01 to E-08 under their seven section headings. Because several Executive sections hold a single insight, `All` is the tab that will be used in the demo; the section tabs exist for structural fidelity with the workbook.

### 11.4 Insight card — the atomic unit

```
────────────────────────────────────────────   ← hairline; navy on a lead card
 [R-17] ●                          Daily/Mthly
 Deposit concentration (top 1% / 5%)

 The top 1% of customers hold 34.0% of the        ← THE FINDING
 total and the top 5% hold 58.0% — a
 concentrated book, and a liquidity question.

        ┌──────────────────────────────┐
        │        chart panel(s)        │
        └──────────────────────────────┘

 Dependence on a small number of large             ← the catalogue's own description
 depositors — a liquidity vulnerability.
 ▸ Info — how to read this
 ▸ How this is calculated
```

**The finding line is the most important thing on the card.** It states what the numbers
are *doing* — direction, magnitude, against plan, for how long — and it is **computed
from the rendered data**, never restated from the fixture, so it cannot contradict the
chart beneath it. One writer per shape, fifteen in all.

v1.0 put the catalogue's `whatItTells` directly under the chart and called it done. That
field is a definition — *"The two efficiency ratios every board watches"* — which is true
and useless in front of a chart already drawn. An analyst would have written *"NIM 16bp
under plan, CIR 2.4pp over. Watch the shortfall."* That sentence is the difference
between a dashboard that reports and one that has a view. The definition stays, demoted
to context below the chart.

**`Info — how to read this`** is a second disclosure, above the calculation note. It
explains how the marks encode the data and what a reader should be looking for —
per chart type, with overrides where a variant changes the reading. Conventions that hold
everywhere (dashed means reference, red means regulatory) are stated once inside it
rather than repeated on 23 components. A dashboard that teaches its own notation is one
that can be handed to someone.

**Cards carry a rank.** The 36 `demoPath` insights are rendered as **lead cards**: a
navy top rule instead of grey, a larger title and finding, and a taller chart. A lead
card also takes the second column — *but only when its chart uses the width*. Time
series, rankings, matrices, flows and maps read better wide; a pair of gauges stretched
across 1,500px is not emphasis, it is a void.

**Cards are panels, not boxes.** A hairline above and white on the page canvas. v1.0's
bordered card containing bordered KPI tiles was a box inside a box, which is the visual
language of a form rather than a document.

Clicking the card header opens `/insight/:id`. 73 of the 163 have two panels — verify
against `panels.length`, never assume one.

**Panels of one insight must agree.** Where the second panel summarises the first — a
`KpiCards` sidecar beside a line chart — it reads its values off the primary series.
Generated independently, it produced a different number for the same measure.

**Two-panel cards use one of two layouts, not a flat 50/50.** `KpiCards` is the second
panel in **23 of the 73** — a KPI sidecar rather than a co-equal chart — so those split
roughly 65/35 and everything else splits evenly with a hairline divider. A flat 50/50
would look wrong on a third of the two-panel cards.

### 11.5 Insight detail — `/insight/:id`

Full-width chart at ~420px height, the full `method` text, the visualization type, refresh cadence, its section and page, and previous/next navigation **within the section**. Breadcrumb reads `Retail › Deposits & Liabilities › R-17` and both crumbs are links back to the page with that tab active.

### 11.6–11.7 *(removed in v1.3)*

Methodology and Catalogue. See §0 and `IMPLEMENTATION_PLAN.md` §2.23.

### 11.8 Reports index — `/reports`

The reader's reports, most recently edited first, each summarised by block count, how many
carry their own slice, and the first few names — enough to tell two apart without opening
either. `New report` starts one. This route is also **where a share link lands**: a `?r=`
payload is decoded into a fresh copy with new ids, the parameter is stripped so a back
navigation cannot re-import, and an unreadable link says so rather than building half a report
from whatever survived.

### 11.9 A report — `/reports/:id`

A document, not a dashboard: a name the reader owns and can edit in place, a line stating the
slice and the as-of date, and the blocks in the order they put them in. The global filters
apply to every block that has not overridden them, so the whole report re-reads as one when the
period changes.

Blocks are packed by the same rule the section pages use — the reader adds a block and the grid
decides where it sits; they never place one. An empty report offers four starters of four
different shapes, because a blank page with one button teaches nothing about what a report can
hold.

Each block is the same insight, the same charts and the same disclosures as its home page. What
a report adds: **scope chips**, a title the reader can set with the insight's own kept beneath
it, a drag handle, and one ⋮ menu (§12). A block id this build does not recognise renders a
card naming the id — silently dropping it would mean the report quietly differs from the one
that was sent.

### 11.10 Block picker

A drawer down the side, not a centred modal: the question while picking is "what goes next to
what I already have", and a modal covers the answer up. It **stays open after adding**, because
picking four blocks is the normal case.

Rows are grouped by layer, each naming its own section, searchable by id, title, section or
visualization. Every row carries a schematic of its data shape rather than a live preview — at
that size a reader is asking about *form*, and a real preview would cost a full data build per
row. Blocks the reader already uses are offered first, drawn from their own reports.

---

## 12. Interactions

**Global filters** in the top bar, applied across every chart on every screen and persisting across page and tab changes. On a report they are the *header*, which any block may override for itself — see §12.1:

| Filter | Options | Default |
|---|---|---|
| Period | Last 3M / 6M / 12M / 24M | 12M |
| Branch | All + the 11 branches | All |
| Division | All / Retail / Corporate / Treasury | All |
| Currency | All / IQD / USD / Other | All |

Filters must visibly change the charts — regenerate the series with the filter folded into the seed and the magnitudes. A filter that does nothing is worse than no filter, and a CEO will try one.

**Period is the exception, deliberately.** It widens the window rather than reseeding.
Series are generated at full depth and sliced to the period, so switching 12M to 24M
reveals more history without redrawing the months already on screen — reseeding there
would look like a bug to anyone comparing. Branch, division and currency fold into the
seed *and* the magnitudes. A ratio does not shrink when you look at one branch, so
percentage metrics take a bounded shift rather than a scale factor.

Two chart types need care to respond at all, because both normalise away a uniform
change: a heatmap's colour is relative to its own min and max, so its scale must state
its range; and a Lorenz curve's *shape* is structural, so it states the population it
covers instead. Neither should fake a change it did not have.

**Section layout.** Insight cards within a section are chunked into rows — a full-width
card takes a row of its own, and the rest pair up — rather than placed into a single
two-column grid. A spanning card cannot fit a half-filled CSS grid row, so the browser
starts a new one and leaves several hundred pixels of nothing; `grid-auto-flow: dense`
would close the gap only by reordering, and §11.2 requires workbook order within a
section.

**Other interactions**

- Hover tooltips on every chart
- Click a card header → insight detail; breadcrumb returns to the originating page with its tab active
- Click a branch on `GeoMap` → sets the branch filter
- Click an attention-strip callout → jumps to the relevant insight
- `⌘K` / `Ctrl+K` → command palette searching all 163 by ID or title. Cheap to build, and it demonstrates depth in one keystroke better than any menu
- Browser print stylesheet: cards do not break across pages, charts render on white

---

### 12.1 Report interactions — added in v1.3

**Per-block scope.** A block may override any of the four dimensions for itself. The override
**replaces** the header for that dimension — a block scoped to Basra means Basra, not "Basra as
well as". Anything left alone follows the header, and that is a genuinely different state from
pinning the value the header happens to show: the header moves, and an inheriting block moves
with it.

**Blocks that must refuse a filter.** A block that compares *across* a dimension is never
handed a view filtered on it — ten insights compare branches, two compare divisions. The
decision is derived from the catalogue, not hand-listed, so a block added later is covered.
Crucially the block **admits it**: the dimension appears as a struck-through chip naming what
was asked for, and a sentence in "How this is calculated" says why it did not apply. A chip is
shown whenever the block's view differs from the header, whatever the reason — the question it
answers is "is this panel reading what the header says", and an override is only one of the
ways the answer can be no.

**One ⋮ menu per block**, carrying slice, title, duplicate, move, remove and CSV. One menu
rather than six controls on the card face: a report of twelve blocks would otherwise carry
seventy-two, and the page would stop reading as a document.

**Reorder** by dragging the handle — on the handle, never the card, because a report is read
and quoted from far more often than it is rearranged. The handle also answers the arrow keys,
since HTML5 drag is mouse-only.

**CSV** holds the same view the panel drew. It is built from the very `ChartData` the chart was
given, so there is no second query to drift and no way to export a slice that was never on
screen. One writer covers all 163 in fifteen cases. The file names its insight, its slice, its
as-of date, and states that the figures are synthetic — a CSV that leaves the building with no
record of its filters is a column of numbers somebody will later read as the whole bank.

**Print.** A report prints as a document: no nav, no controls, no menus. Chips print with a
border and ink rather than a fill, because browsers drop backgrounds unless the reader asks for
them — and a chip that vanishes on paper is the one mark saying a panel is not reading what the
header says.

---

## 13. Quality bar

- **Cold start to interactive under 2 seconds** on a laptop. All data is synchronous, so this is a bundle-size discipline, not a loading problem.
- **No layout shift** when navigating between layers.
- **No console errors or warnings** during the demo path. Recharts is noisy about missing keys; fix them.
- **Every one of the 163 renders.** No blank cards, no "chart type not implemented" placeholders. This is the acceptance test that matters most.
- **Resize to 1280×800 and 1920×1080** without a horizontal scrollbar. Content is capped at 1440px, as rtb.iq caps its own.
- **Every colour that carries text clears WCAG AA (4.5:1)** on both `surface` and `canvas`, and white clears it on every filled control. This is a gate, not an aspiration — see §9.
- Keyboard: tab order follows visual order; escape closes drawers and the palette. A drawer
  that claims `aria-modal` must actually trap Tab, or the claim is false.
- **Every claim in this document has a check behind it.** `npm run verify` runs four suites —
  the catalogue and fixture (`verify:data`), all 236 chart panels (`verify:series`), the design
  system and structural rules (`verify:tokens`), and custom reports (`verify:reports`) — for
  353 checks, and must report zero failures.

---

## 14. Phased implementation plan

> **Superseded.** `IMPLEMENTATION_PLAN.md` is the plan that was executed and the record
> of what was built, phase by phase, with the exit gate for each. The outline below is
> kept for context. One correction: **Phase 1 needed eight components, not six** — E-06
> also needs `StackedBar` and E-08 also needs `BarChart`, so as written it could not
> render `/executive`.

Each phase ends in something demonstrable. If time runs out, the earlier phases still give a presentable demo.

### Phase 0 — Scaffold and design system
Vite + React + TS + Tailwind + Router. `tokens.ts`, `format.ts`, the app shell with the six-item main navigation, top bar and demo banner, and routing skeleton with placeholder pages.
**Done when:** the shell renders at all four routes, tokens are the only source of colour, and no hardcoded hex exists in any component.

### Phase 1 — Data engine and the Executive spine
`bank.ts`, `entities.ts`, `generators.ts`, `seriesFor.ts`. Build the **eight** components the Executive layer needs: `KpiCards`, `LineChart`, `GaugeChart`, `BulletChart`, `DonutChart`, `WaterfallChart`, `StackedBar` and `BarChart`. Build `/executive` complete with headline band, E-01 to E-08 and the attention strip.
**Done when:** the Executive screen is demo-ready on its own and every figure on it reconciles to the `bank` fixture.

### Phase 2 — The rest of the chart library
The remaining 17 components with all variants. Build them against a `/dev/gallery` route that renders every component and variant at once — build that route first, it will save more time than it costs.
**Done when:** the gallery shows 23 components and all 39 variants rendering correctly at full and compact size.

### Phase 3 — The four insight pages, tab navigation and all 163 insights
`InsightPage.tsx` serving all four pages from the route param, the sticky tab bar with section tabs derived from `group`, URL-driven tab state, insight cards, `seriesFor` extended to cover every ID, `/insight/:id` with in-section prev/next, and `/methodology`.
**Done when:** all 163 render with no placeholders, every card's chart type matches its `panels` entry, every tab in §10 exists with the right membership and count, and tab switching is instant with no chart remount.

### Phase 4 — Filters, navigation and catalogue
Global filter bar wired through `seriesFor`, `GeoMap` click-to-filter, the command palette, and `/catalogue` with search, filters and both views.
**Done when:** changing any filter visibly changes every chart on screen, and the palette finds any insight by ID or title.

### Phase 5 — Demo polish
Attention-strip copy tuned to the mock data, transitions, print stylesheet, `README.md`, a final pass on every screen at 1920×1080, and a walk of the 36 `demoPath` insights checking each one for anything a CFO would query.
**Done when:** the demo script in §15 can be performed start to finish without a single visual defect.

---

## 15. Demo script — five minutes

Build toward this. If a screen is not in this script, it is a Phase 3+ concern.

| Beat | Screen | The line |
|---|---|---|
| 1 | `/executive` headline band | "This is the bank on one screen. Assets, deposits, profit, capital — as of last night." |
| 2 | E-02 NIM & CIR gauges | "Two efficiency ratios against target. Green is on plan, amber is drift." |
| 3 | Attention strip → R-43 | "The dashboard tells you where to look. One click and you're at what's driving it." |
| 4 | `/retail`, All tab, scroll | "Fifty-four insights for retail alone." Then click through the seven section tabs: "acquisition, deposits, lending, cards, channels, risk, profitability." |
| 5 | R-17 Lorenz curve | "A third of deposits sit with one per cent of customers. That's a liquidity question." |
| 6 | Branch filter → Basra | "Every view slices by branch, division, currency and period." |
| 7 | `/catalogue` | "One hundred and sixty-three insights, ready to be built. This is the scope of what the data supports." |

---

## 16. Risks and how the build mitigates them

| Risk | Mitigation |
|---|---|
| The CEO believes the numbers are real | Non-dismissible banner, plus the presenter says it at beat 1 |
| A CFO spots an incoherent balance sheet | Every figure derives from one fixture; §7.1 consistency rules are a test, not a suggestion |
| A chart reshuffles mid-demo and looks broken | All generators seeded by insight ID; nothing uses `Math.random()` at render time |
| The demo is read as "the product is finished" | Sidebar footer carries a quiet "Demonstration build — synthetic data" line |
| 163 charts become 163 bespoke implementations | 23 components, 12 data shapes, one prop contract. Enforce it in Phase 2 |
| No network on demo day | Zero external requests, verified by running with the network disabled |

---

## 17. Definition of done

- `npm install && npm run dev` produces a working application with no manual steps
- All 163 insights render; no placeholders, no console errors on the demo path
- Runs fully offline with DevTools network throttled to offline
- Every colour comes from `tokens.ts`; every number goes through `format.ts`
- The §15 demo script performs cleanly end to end at 1920×1080
- `README.md` states in its first paragraph that the data is synthetic

---

## Appendix A — Files supplied with this PRD

| File | What it is |
|---|---|
| `logo-rtb.svg` | The RTB mark, 105×30, drawn in the brand navy and cyan. Inlined at build time. |
| `RTB_insights.json` | 163 insight records in an envelope (`{ generatedFrom, count, insights[] }`), each mapped to its chart component and variant, carrying `layer` (the sheet), `group` (the section key) and `domain` (the section label) so pages and tabs are derived rather than hardcoded. Import directly; do not transcribe from the Excel file. |

### Methodology page content (Excel sheet 6)

1. **Core banking data foundation** — all insights assume a daily extract covering customer master, account and deposit master, loan and facility master, transaction ledger, GL trial balance, and supplementary modules.
2. **Balance conventions** — month-end balances for stock metrics, monthly averages of daily balances for ratio denominators. Reconcile account-level aggregates to GL control accounts before publishing.
3. **Customer-level aggregation** — aggregate accounts to a single customer ID, and to group level for corporates, before computing any per-customer or concentration metric.
4. **NPL and staging** — non-performing follows the local regulator, typically 90+ days past due or unlikely to pay. IFRS 9 stages come from the ECL engine, not from raw DPD.
5. **FTP and profitability** — any margin, product P&L or RAROC measure requires an FTP engine and a cost-allocation model. Without them, use revenue-only proxies and flag the limitation on the chart.
6. **Growth and annualization** — MoM = (t / t−1) − 1; YoY = (t / t−12) − 1. Annualize monthly figures by × 365 / days-in-month.

Plus two conventions worth restating on the page: account level is not customer level, and a daily overwrite keeps no history.

## Appendix B — Insight distribution

| Excel sheet → page | Insights | Sections (tabs) |
|---|---|---|
| Executive 360° | 8 | 7 |
| Bank-Wide | 52 | 9 |
| Retail Banking | 54 | 7 |
| Corporate Banking | 49 | 7 |
| **Total** | **163** | **30 tabs + 4 "All" tabs** |

Two-panel insights: 73 of 163, of which 23 have a `KpiCards` sidecar. Total panels: 236.
Chart components: 23, across 39 variants.

36 insights are flagged `demoPath: true` and carry the CEO narrative.
