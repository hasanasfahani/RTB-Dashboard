# RTB BI Dashboard — Implementation Plan

**Companion to:** `RTB_Demo_Dashboard_PRD.md` (v1.4)
**Content spine:** `RTB_insights.json` — 163 records, verified, import as-is
**Status:** Phases 0–10 complete. **Custom reports: complete, all phases A–H (2026-09-20).**
**Gates:** 378 checks across five, 0 failures.
**Brand pass:** complete, all five phases of the rtb.iq alignment.
**Last updated:** 2026-09-21

> **How to use this document.** It is the working plan, not a second PRD. The PRD is
> the source of truth for *what* the product is; this file is the source of truth for
> *what order we build it in, what the data actually says, and what is done*.
>
> At the start of every phase: read §1 (verified facts), §2 (corrections — these
> override the PRD), then that phase's section in §5. At the end of every phase:
> tick its boxes in §6 and update **Status** above.

---

## 1. Verified data facts

Every figure below was computed from `RTB_insights.json`, not copied from the PRD.
Treat this section as the cache — do not re-derive it unless the JSON changes.

### 1.1 Envelope and record

```jsonc
{
  "generatedFrom": "RTB_Core_Banking_BI_Insights_Catalogue.xlsx",
  "count": 163,
  "insights": [ /* 163 records */ ]
}
```

All 13 fields are present on all 163 records. No nulls, no missing keys, no
duplicate IDs. The record shape matches PRD §6 exactly.

### 1.2 Pages and sections — 163 insights, 30 sections

Array order **is** workbook order: IDs are contiguous and ascending within each
layer (E 1–8, G 1–52, R 1–54, C 1–49). Never sort. Index order is the spec.

| layer | layerLabel | route | insights | sections |
|---|---|---|---|---|
| `executive` | Executive 360° | `/executive` | 8 | 7 |
| `bank-wide` | Bank-Wide | `/bank-wide` | 52 | 9 |
| `retail` | Retail | `/retail` | 54 | 7 |
| `corporate` | Corporate | `/corporate` | 49 | 7 |

Sections in workbook order, with counts and layer-scoped slugs:

**executive** — Balance Sheet (1) `balance-sheet` · Profitability Ratios (2)
`profitability-ratios` · Liquidity (1) `liquidity` · Capital (1) `capital` ·
Business Mix (1) `business-mix` · Credit Quality (1) `credit-quality` ·
Planning (1) `planning`

**bank-wide** — Financial Performance (8) `financial-performance` · Balance Sheet
Structure (5) `balance-sheet-structure` · Treasury, ALM & Market Risk (7)
`treasury-alm-market-risk` · Liquidity & Funding (6) `liquidity-funding` ·
Capital (4) `capital` · Bank-Wide Credit Risk (7) `bank-wide-credit-risk` ·
Operations & Efficiency (6) `operations-efficiency` · Franchise & Customers (5)
`franchise-customers` · Compliance & Financial Crime (4)
`compliance-financial-crime`

**retail** — Customer Growth & Base (10) `customer-growth-base` · Deposits &
Liabilities (10) `deposits-liabilities` · Retail Lending (10) `retail-lending` ·
Payments, Cards & Transactions (6) `payments-cards-transactions` · Channels &
Digital (6) `channels-digital` · Retail Risk & Collections (7)
`retail-risk-collections` · Retail Profitability (5) `retail-profitability`

**corporate** — Client Base & Relationships (8) `client-base-relationships` ·
Corporate Lending (10) `corporate-lending` · Corporate Deposits (6)
`corporate-deposits` · Trade Finance & Guarantees (7) `trade-finance-guarantees` ·
Cash Management & Payments (5) `cash-management-payments` · Corporate Risk (8)
`corporate-risk` · Corporate Profitability (5) `corporate-profitability`

Slugs are unique **within** a layer. `Capital` appears in two layers, so the slug
map must be keyed `(layer, group)`. A global map collides. See §2.5.

### 1.3 Components and variants — 23 components, 39 pairs, 236 panels

Counts are **panel occurrences**, not insights (PRD §8 labels this column
"Insights"; it sums to 236, not 163).

| component | panels | variants in data |
|---|---|---|
| LineChart | 32 | single (28), adoptionCurve (2), appetiteBand (1), peakMarkers (1) |
| StackedBar | 30 | absolute (22), ladder (7), percent (1) |
| KpiCards | 27 | sparkline (24), plain (3) |
| ComboChart | 16 | barsPlusLine (9), dualAxisLines (7) |
| BulletChart | 12 | plain (12) |
| WaterfallChart | 12 | plain (12) |
| Heatmap | 12 | intensity (7), rag (4), cohort (1) |
| Treemap | 11 | plain (11) |
| ParetoChart | 11 | plain (10), lorenz (1) |
| BarChart | 10 | plain (10) |
| AreaChart | 9 | stacked (8), single (1) |
| GaugeChart | 7 | target (5), regulatoryFloor (2) |
| DonutChart | 6 | plain (6) |
| SankeyDiagram | 6 | plain (6) |
| FunnelChart | 6 | plain (6) |
| ScatterPlot | 5 | plain (3), breakEven (1), quadrant (1) |
| GeoMap | 5 | iraqBranches (5) |
| DataTable | 5 | exception (5) |
| ScenarioBars | 4 | scenarios (3), tornado (1) |
| Histogram | 4 | single (3), overlay (1) |
| RankedBar | 3 | plain (3) |
| BoxPlot | 2 | plain (2) |
| VintageCurves | 1 | plain (1) |

**Distinct components needed per layer** — executive 8, bank-wide 20, retail 21,
corporate 19.

### 1.4 Panels, units, refresh, demo path

- **Panels:** 90 single-panel, 73 two-panel. Total 236.
- **`KpiCards` is `panels[1]` in 23 of the 73** two-panel insights. Top combos:
  LineChart+KpiCards (11), GaugeChart+LineChart (3), StackedBar+KpiCards (3),
  ParetoChart+LineChart (3), BarChart+KpiCards (3), StackedBar+Treemap (3).
- **Units:** percent 82, iqd 66, count 15.
- **Refresh:** `Daily / Monthly` 72 · `Monthly` 62 · `Monthly / Quarterly` 23 ·
  `Daily` 6.
- **`demoPath: true` = 36**, spread E 8 / G 10 / R 10 / C 8:
  - `E-01 E-02 E-03 E-04 E-05 E-06 E-07 E-08`
  - `G-01 G-02 G-09 G-11 G-17 G-23 G-35 G-40 G-44 G-45`
  - `R-01 R-04 R-07 R-09 R-12 R-13 R-16 R-17 R-34 R-43`
  - `C-01 C-06 C-08 C-10 C-19 C-21 C-25 C-45`
- **Demo-path components (17):** LineChart 9, StackedBar 9, KpiCards 7,
  GaugeChart 5, Treemap 5, ParetoChart 4, BarChart 3, BulletChart 2, DonutChart 2,
  WaterfallChart 2, Heatmap 2, ComboChart 1, AreaChart 1, RankedBar 1, GeoMap 1,
  Histogram 1, SankeyDiagram 1.
- **Used by zero demo-path insights (6):** `BoxPlot`, `DataTable`, `FunnelChart`,
  `ScatterPlot`, `ScenarioBars`, `VintageCurves` — 21 panels. This is the scope
  lever if the date moves in. See §5, Phase 4.

### 1.5 Text and characters

`title` ≤ 71 chars · `whatItTells` ≤ 93 · `method` 120–318 (avg 200) ·
`vizLabel` ≤ 40, 126 distinct values.

Non-ASCII glyphs present in content: `° ± ² × Δ Σ – — … → − ≈ ≥`. There is no
webfont fallback (PRD §4 forbids downloads), so these must be checked in the
system stack on the presentation machine. Ensure `<meta charset="utf-8">`.

### 1.6 PRD-referenced IDs — all present, all on the demo path

| id | layer / section | panels |
|---|---|---|
| E-02 | executive / Profitability Ratios | GaugeChart:target |
| R-17 | retail / Deposits & Liabilities | ParetoChart:lorenz |
| R-43 | retail / Retail Risk & Collections | GaugeChart:target + StackedBar:absolute |
| G-23 | bank-wide / Liquidity & Funding | ParetoChart:plain |
| C-21 | corporate / Corporate Deposits | ParetoChart:plain |

---

## 2. Corrections to the PRD — these override it

Found by validating the PRD against the JSON. Each one changes code.

### 2.29 Phase 10 findings — a gate that banned a mechanism, and a reading that praised the worst number on the page

**The generator called a rising NPL ratio "ahead of plan".** A time series carrying a
`target` reference was read as met whenever `last >= target`, which is right for margin and
exactly backwards for anything where down is good. R-43's personal-loan line came out as
*"Personal loan running ahead of plan — 15.8% against a 5.0% target, 10.8pp above"*: the
worst number on the card, described as good news. `isDownGood(insight)` already existed for
the KPI deltas and the gauges, and the reading now goes through it, so a generated line
cannot contradict the colour of the tile beside it. **The defect was found by printing five
readings and reading them**, not by the gate — the gate checked that a finding carried a
figure, and it did.

**Two more from the same five minutes.** A Pareto over eleven evenly-spread names reported
*"11 of 11 carry four fifths of the total"*, which is arithmetic wearing an insight's
clothes; it now says the opposite thing when the eighty per cent arrives late. And every
sentence interpolating a label had a copula in it — *"Retail customers is rising"*. Labels
are plural as often as not, so the phrasing dropped the verb: *"Retail customers up 15.5%
over 12 months"*. This is why the consequence lines in `insightThemes.ts` carry the subject
mid-sentence rather than as the grammatical subject.

**The network gate banned the mechanism, not the property** — the same correction §2.24 had
to make to the webfont rule. `verify:tokens` failed on the token `fetch`, which would have
made a live provider impossible to ship at all. What PRD §4 and §17 actually require is that
*the demo makes no network call*. The live adapter is reached through a dynamic import
inside `import.meta.env.VITE_INSIGHTS_PROVIDER === 'live'`; Vite substitutes a literal, so
with the variable unset the branch is statically false and **the module is not in the bundle
at all** — verified by grepping the built asset for its strings, which are absent. The gate
now allows the call in that one file and adds two checks that keep the allowance honest:
nothing may import the adapter statically, and the provider must reach it only behind the
flag. The one `fetch(` left in the bundle is Vite's modulepreload polyfill, which was there
before this phase — confirmed by building with the dynamic import removed and counting.

**The button became a call to action, and the radius ruling did not have to bend.** It
shipped as a text chip in the card header; the owner moved it to the bottom-right of the
chart with a reference design — a filled, fully-rounded button. Two substitutions were
needed to honour that without contradicting earlier work. The fill is `accent`, not the
brand `cyan` the reference reads as: §2.24 measured `cyan` on white at **2.95:1**, and
`accent` exists precisely to be "the fill under a button label" at 5.31:1. The radius is the
existing `card` token, and §2.25 is not being overruled — that section rejected a flat 16px
on **19–23px** controls, where it lands at 0.70–0.85 of the height and reads as a pill. This
control measures **36px**, where 16px is **0.45**, beside rtb.iq's own 40px buttons at 0.40.
The shape the reference asked for and the ratio the brand uses are the same thing once the
control is the size a call to action actually is. No new token, and nothing in `tokens.ts`
moved.

The position matters more than the styling: a reader decides they want a reading *after*
looking at the marks, not before, so the control belongs under the chart rather than in the
header beside the id.

**The panel was anchored to the wrong number, and the close button paid for it.** It took
its top from `--header-h`, which describes the top bar alone. On the layer pages a section
tab bar is sticky beneath it, and at the top of a page the banner — which is in normal flow
— is still pushing both down. So on Bank-Wide the panel began level with the tab row: its
own header, holding the title, the scope line and the **X**, sat underneath the tabs, and
the panel covered the right-hand end of a row that scrolls horizontally. The control was
there the whole time and could not be seen, which is indistinguishable from it being absent.

`useChromeBottom` measures the lowest edge of anything carrying `data-chrome` instead —
the bar, the tab row, whichever is lower — live, and the panel drops to `z-10` so the bars
paint over it rather than the reverse. Measured on Bank-Wide at 1440×900: panel top **150**
at the top of the page (tabs end 149), **119** once the banner has gone, **83** with the
header condensed, and back to 150 at the top — clear of the chrome in every state. On the
detail page, which has no tab row, it anchors to the bar at 109.

**Three things about that measurement are worth recording.**

- **The header condenses on scroll, so the thing being measured changes during the event
  that measures it.** The listener reads twice, the second time on a zero-delay timeout,
  so the panel is never one scroll event behind the bar it hangs from.
- **A `ResizeObserver` cannot be the only mechanism.** Its callbacks are delivered with the
  frame, and the browser pane runs neither that nor `requestAnimationFrame` (§2.28) —
  verified directly here rather than assumed: an observer attached to an element that is
  then resized fires **zero** times in the pane. This also explains a stale `--header-h`
  seen while testing, which looked like a defect in the condensing header and is not one:
  in a real browser the observer publishes it.
- **The panel outlives a navigation**, so the observers re-attach on a route change. A
  reader can open a reading on the detail page, where there is no tab bar, and click
  through to a layer page, where there is; without that the panel sat over the new tab row
  until the next scroll. Verified: top moves 109 → 150 on the click.

**The panel context had to be split in two, for a reason that is only visible at scale.**
The progress bar ticks about sixteen times a second, and every card carries a button. One
context would have re-rendered 78 buttons per tick on Retail for a bar none of them draw.
Controls (open, close, `openId`) and run state (target, progress, stage) are now separate
contexts; a button subscribes only to the first.

**The panel does not print, and the plan said it would.** The written intent was that its
content print beneath its card. It is `position: fixed`, so a printed copy lands on page one
over whatever is there; printing it beside its card instead means rendering a second copy
inside every card, and every card would then subscribe to that sixteen-times-a-second tick.
The reading is a screen artefact and the chart is the paper one. `.insights-panel` is
`display: none` in print.

**What could not be verified here.** The offline walk (DevTools offline, hard reload) was not
run: port 5173 was held by a dev server from another session, so the pane was pointed at a
server this session does not control. The property it would test is the one the bundle grep
establishes — the default build contains no reachable network call — but the walk itself is
still outstanding.

### 2.28 Condensing the header on scroll, and what the pane could not prove

**What condenses, and why it is the filter row.** Measuring first changed the design. The mark
shares its line with the navigation, which is the taller of the two, so hiding it saves a
single pixel. Nav and filters cannot be merged onto one row either — together they need about
1,250px at 1280 and do not fit at 1024. The filter row was the only thing on the bar with 36px
to give.

So past 160px of scroll the controls fold into a one-line summary on the nav row.
**78px becomes 42px, and the sticky chrome goes from 119px to 83px.** Filters are read far more
often than they are changed, so a sentence saying what is in force is a fair trade for the row
that sets it; clicking it brings the row back, and it stays back until the reader returns to
the top, rather than closing a moment later on their next scroll tick.

160px rather than the first pixel because the fold does shift the content below it — better
once, early, while the reader is already moving. There is no feedback to damp: folding changes
the header's height but not `scrollY`, so the condition cannot re-trigger itself.

**Three implementations, and the environment is why.**

An IntersectionObserver on a sentinel never fired. A `requestAnimationFrame`-throttled scroll
listener never fired either. I blamed the sentinel's zero height in a code comment before
testing the actual cause, which was wrong of me — measuring showed **`requestAnimationFrame`
does not run in this browser pane at all**, which explains both, since an IntersectionObserver
also depends on the page painting. The comment was corrected.

The handler now reads `scrollY` directly and sets state only when the answer changes — cheap
enough not to need throttling, and it works in a tab that is not compositing, which is also
true of a background tab in a real browser.

**What could not be verified here, stated plainly.** `window.scrollTo` moves `scrollY` in this
pane but delivers **zero** scroll events, while a dispatched event does reach the listener. So
the handler is proven; the browser's delivery of the event that calls it is not, and cannot be
from here. The full cycle was verified by setting the position and dispatching the event the
browser would have: 78 to 42 on scroll, summary showing the live filter state, click restoring
the controls, the row staying open while scrolling on, resetting at the top, and folding again.
At 1280 the condensed row measures 42px with the summary ending 39px clear of the edge, no
navigation overflow and no horizontal scroll.

### 2.27 The header, the heatmap axis, and the default back to 12 months

**Default period returned to `12M`.** 30 days was tried and reverted at the owner's request.
It also removes the two-month caveat from the 46 panels that were carrying it — the caveat
was honest, but it was furniture on half the time series, which is its own argument.

**The header: condensed and sticky, not a sidebar.**

The brief allowed either, and asked for a decision. A sidebar is the wrong one here:

- The pages are two-column grids of charts capped at 1440px. A 220px rail spends ~17% of the
  width on **every** screen, permanently, to recover vertical space that collapsing two rows
  recovers once and for nothing. Width is the dimension a chart pair can least afford.
- There are already two navigation levels — layer, then section. A sidebar for layers with a
  horizontal tab bar for sections splits one hierarchy across two axes.
- rtb.iq navigates horizontally. Five phases were spent aligning to it; diverging on the most
  visible structural element would undo that.

So the brand and nav share one row, and the whole bar is sticky. Measured: **174px of chrome
that scrolled away entirely, replaced by 78px that stays** — and the filters stay with it,
which is the more useful half, since they apply to every chart on screen.

The section tab bar sticks beneath it at `top: var(--header-h)`, published by a
`ResizeObserver` on the header. Not a constant, deliberately: the report rail appears once the
reader has a report, and the filter bar grows a row when a custom range is open — a hardcoded
offset would be wrong in exactly the states a reader reaches by using the thing. Total sticky
chrome 119px, verified flush with no gap.

**The heatmap axis.** Column headers rendered the raw key, `2025-09`, which wrapped onto three
lines and buckled the grid on C-37 and G-28. The key has to stay as it is — the cells are
looked up by it — so only the rendering changed: month abbreviation, with the year on a second
line **only where it changes**, since repeating `'25` twelve times spends the same space to say
nothing.

That was not enough for G-28, and the reason is the point: it is a co-equal two-panel card, so
its heatmap gets about 270px for twelve columns. Column *count* cannot distinguish that from a
full-width card; only width can. Labels are now thinned from a measured per-column width, the
way a time axis thins its ticks, anchored to the last column so the latest period always
carries one.

**One regression caught while doing it.** Thinning applied to `rag` heatmaps too, whose columns
are `Current`, `Prior month`, `Limit` — it hid two of three. A month is skippable because the
sequence is known; a category is not. Thinning is now restricted to date axes, and the
row-label column is measured rather than assumed at 84px, which the rag variant sizes
differently.

Verified at 1280x800: rag heatmap 3 of 3 labelled, G-28 and C-37 6 of 12 with no overlap and
no wrapped headers, no horizontal scroll, zero console warnings.

### 2.26 The Period filter, and four defects it surfaced

Owner's request: Period as a select like the other three, defaulting to **Last 30 days**, with
**Last month** and a **custom range** added; the as-of block removed from the top bar; Home
replaced by Executive 360°.

**The period model.** `Period` grows to seven members and `Filters` gains optional `from`/`to`
for a custom range — absent, never `undefined`, so `'from' in filters` stays the test the share
link and per-block scope read. Everything resolves through one `periodWindow(filters, asOf)`
returning days and an end date, so the axis, the window and the caveat read one thing and a
custom range is not a special case downstream. `LM` is a **calendar month**, not 30 days —
resolving it to a number would make it the same option as `30D`. A custom range is clamped to
the as-of date: there is nothing after the close this fixture describes, and a range running
past it would draw a flat tail that reads as a business result.

**The consequence the request could not have known.** Only **6 of 163** insights carry daily
data; 157 are monthly. A 30-day window on a monthly series is one point — no line — so a
literal implementation would have made 96% of the time series look broken on first load.

Resolved in two parts. A short window now puts the **78 daily-capable** insights (`Daily` and
`Daily / Monthly`) on a daily axis, which is a real 30-day series. The 85 monthly-only ones are
floored at two points and **say so**: *"Monthly data — the shortest meaningful span here is two
months, so that is what is shown."* Drawing two months under a heading that says thirty days
without admitting it would be the quiet kind of lie this build has been avoiding throughout.
At the default, 34 time-series panels draw daily and 46 carry the caveat.

**Four defects came out of that**, three of them mine and one older:

1. **Growth compounded per point, not per unit of time.** `trend()` raises `(1 + growth)` to
   the number of steps, and `anchor.growth` is a *monthly* rate. On a daily axis every day
   compounded at a month's rate: R-11 climbed **39.4% across thirty days** against 12.3% across
   twelve months. `ctx.stepGrowth` now spreads a month's growth across a month of days, and the
   gate asserts the property that was visibly false — *a metric cannot move further in thirty
   days than it does in twelve months.*
2. **A heatmap on a daily axis produced duplicate React keys.** `matrixShape` labels columns
   `iso.slice(0, 7)`, so twelve consecutive days become twelve identical `2026-07` keys and
   eleven columns vanish. **This was pre-existing** — R-35 is `Daily` refresh — and the short
   window only made it reachable on more insights. Columns now carry the day on a daily axis,
   and the window-driven daily switch is limited to time series, so no other shape changes
   character.
3. **The span caveat printed three times on one card.** A `KpiCards` sidecar copies its
   primary's note, which already held the caveat, and then had it appended again. The caveat is
   about the window, not the metric, so it is now attached to the primary panel only and
   `withSpanNote` is idempotent. Two gates: one caveat per card, and no note repeats itself.
4. **KPI tiles did not fit.** Columns were chosen from the *card count*, so a sidecar — a
   ~190px column — asked for three columns and G-13 read `829.5B363.7B634.6B` with sparklines
   on top of the numbers. Columns now come from the width available
   (`repeat(auto-fit, minmax(8.5rem, 1fr))`), which stacks in a sidecar and spreads on a
   full-width card without being told which it is.

**And one regression that fix caused**, caught by measuring rather than looking: `auto-fit`
raises a grid's *min-content* width to its full track count, and a grid item defaults to
`min-width: auto`, so the 1fr sidecar was dragged from 419px to 604px and pushed the card past
the viewport at 1280. `min-w-0` on both panel columns — the same trap `WaterfallChart` and
`DonutChart` hit in Phase 7.

**Two chart fixes requested alongside.** Funnel labels spanned the full card width with the
name hard left and the value hard right, which is *off the polygon* once the funnel narrows —
R-23's lower steps had their text on the white background beside the shape. Labels now sit
inside the band, as wide as its narrowest edge, and take their colour from `readableOn()`,
a new token-layer helper that picks ink or surface by measured luminance: white on the pale end
of the series ramp was 1.2:1. Map tooltips were pinned top-centre, which is exactly where the
northern branches sit, so hovering Mosul or Erbil hid it behind its own readout; the tooltip is
now placed from the point, flipping below in the upper half and clamped horizontally. Verified:
Duhok at 4% down the frame gets it below, Basra at 76% gets it above, neither overlaps.

**Home is gone.** `/` renders Executive 360° rather than redirecting, so the address a reader
lands on is the one they typed, and the mark is now a link to it. The cover page described the
build rather than the bank — useful once and in the way afterwards.

### 2.25 Copying their radius would not have copied their look

Phases 4 and 5 of the brand pass — shape, neutrals, and the density of the data-dense
patterns.

**Neutrals.** `canvas` #F5F8FB → **#F9F9F9** and `line` #E7EBF1 → **#E6E6E6**. rtb.iq builds
its surfaces from true greys and reserves the blues for the brand; a blue-cast canvas
competes quietly with the navy sitting on it. Every text token re-checked on the new canvas
before the change — the lowest is `accent` at 5.04:1, so the gate from §2.24 still passes.
Container 1600px → **1440px**, theirs.

**Radius — and the finding this phase turned on.** Their site uses 16px on everything, so the
obvious move is one 16px token. Measured, that is wrong: their buttons are **40px tall**,
which makes 16px a ratio of **0.40**. Our controls are 19–23px, where a flat 16px comes out at
**0.70–0.85** — a pill. Pills read consumer and playful, and are not what their page looks
like; the number is the same and the look is not.

So `card` keeps their 16px, where our containers are near enough their size for it to land the
same way, and `chip` takes the **ratio** rather than the number: 8px, which measures 0.43 and
0.35 at our control heights against their 0.40. Verified on screen after the change. Popovers,
the ⋮ menu and the form controls, which had no radius at all, were brought onto the same two
values.

**Density (phase 5), and one thing I dropped from my own plan.** `DataTable` had vertical
padding only, so columns were touching, and its header was set in `muted` — *lighter* than the
cells beneath it, which inverts the hierarchy. Their fee tables do the opposite: header darker
and heavier than the values, the whole structure carried on weight rather than on a filled
band or zebra striping. Header moved to `ink`, `px-3` gutters added, vertical padding to `py-2`.
Measured after: **24px of clear space between column text**, matching their 24px rhythm, with
the outer edges flush so the table aligns with the rest of the card.

I had also planned to set the key figure in the accent teal, as their fee column is. I did not,
and the reason is worth recording: their table has one value column, ours can have several, and
PRD §8 already rules that colour is applied "only ever where there is a real threshold". A
teal on every figure would compete with the red that marks a breach — which is the signal
actually carrying meaning in that table. Their *hierarchy* transfers; that one use of colour
does not.

`KpiCards` needed nothing: label, figure, delta and sparkline were already their hierarchy.

**Twice in this pass I read a screenshot as confirmation when the dev server was serving stale
CSS** — Tailwind theme changes come from `tokens.ts`, which HMR does not pick up. The first
time I said the type "reads much closer to the brand" while looking at the old system stack.
The lesson is in the method, not the CSS: after a token change, restart and re-measure the
computed styles before believing the picture.

### 2.24 The brand's own site was more accessible than ours

The brief was to match the look of rtb.iq. Measuring it first turned up something else.

**The palette was never the gap.** Their navy is `#00205B` and their cyan `#00A5BD` — byte
for byte our tokens. Whoever specified this build's palette took it from the brand, so "make
it look like the bank" was never a repaint.

**The gap was type, and two colours that could not legally carry text.**

| | rtb.iq | This build, before |
|---|---|---|
| Display | Fira Sans, weight **500**, −0.02em | system stack, weight **700** |
| Text | Barlow 400/700 | system stack |
| Headings | medium | bold |

Their headings are *medium*, not bold. Setting every heading at 700 read heavier and more
institutional than the bank does itself.

**The contrast finding.** `cyan` on white is **2.95:1** — below the 4.5:1 AA floor for text,
and below even the 3:1 floor for large text and graphics. `muted` was **3.10:1**. Between
them they set every disclosure label, every link, and 120 pieces of secondary text. Their own
site had already solved this: its fee tables set figures in a **deeper teal**, never in the
brand cyan.

So the rule is not "use the brand colour", it is **a colour that carries text must be legible
on the surfaces it is used on** — and a brand accent that is not is kept for fills and rules,
which is exactly what the brand does. `cyan` keeps its exact value for chips, marks and the
2px active rule. A new `accent` carries text.

Their #008396 clears AA on white (4.48:1) but **not on our canvas** (4.20:1), so `accent` is
one step deeper at `#00768A` — 5.31:1 and 4.98:1, and white on it is 5.31:1, so it can also
sit under a button label. `muted` moved to `#5C6B7F`.

**The gate then found two more that were not in the brief.** `positive` at 4.04:1 and
`warning` at **2.20:1** were setting deltas, bullet labels and — my own, written the day
before — the sentence warning that a share link is too long. Same resolution: the hues stay
untouched as fills so no chart moves, and `positiveInk` / `warningInk` carry text. `negative`
needed no partner at 5.44:1. **This is the argument for writing the gate rather than the fix.**

Measured on painted pixels afterwards: disclosure labels 2.95 → **5.31:1**, secondary text
3.10 → **5.43:1**.

**Three things the font work turned up, each of which was false at some point.**

- **Fontsource's Arabic stylesheet carries no `unicode-range`.** Tajawal is named in both
  stacks, so it downloaded on every page of a dashboard that is currently all Latin. I had
  already written a comment claiming the opposite. The faces are now declared in `index.css`
  with explicit ranges; verified both ways — not fetched on a Latin page, fetched the moment
  an Arabic glyph appears, which it can, because a report can be named in Arabic today.
- **`vite.config.ts` inlines every asset** so the demo needs no requests at all — a good
  earlier decision that backfires on fonts: it base64'd ~150 KB of already-compressed woff2
  into the render-blocking stylesheet, taking it **from 21 KB to 349 KB**, and made
  `unicode-range` pointless since an inlined face is present regardless. Fonts are now
  excluded from inlining and emitted beside the bundle — still same-origin, still nothing
  external. CSS is **26.5 KB**.
- **Fontsource ships a legacy `.woff` beside every `.woff2`** — 112 KB of files no browser has
  requested since 2016. Declaring the faces directly dropped them.

**One gate had to be corrected rather than satisfied.** `verify:tokens` asserted *"no @import
or url() webfont in CSS"* — it banned the mechanism instead of the thing PRD §4 forbids, a
network call at runtime. A bundled font is not one. It now checks the properties that
actually matter: no CSS references a remote origin, every font file exists on disk, every
`@font-face` declares a `unicode-range`, no legacy `.woff` ships, and the build does not
base64 them back in.

Phases 4 (shape and rhythm: 16px radius, neutral greys, 1440px container) and 5 (density,
modelled on their fees table) are not done.

### 2.23 Methodology and Catalogue removed from the dashboard

Owner's decision, 2026-09-21: neither page is needed. Both are deleted rather than hidden —
a route nobody can reach is dead code that still has to be maintained and still gets shipped.

Removed: `pages/Methodology.tsx`, `pages/Catalogue.tsx`, and `data/methodology.ts`, which had
no other consumer once its page was gone. The two nav items, the two links at the foot of
Home, and the routes went with them.

**Two things this dragged in that were not obvious from the request.**

`anchors.ts` carried a chart caveat ending *"(Methodology note 5)"*. That pointer now led
nowhere, and a reference to a document the reader cannot open is worse than no reference, so
the substance moved inline: *"…needs an FTP engine and cost allocation, neither of which this
demonstration models."*

`verify:tokens` asserted both pages existed and checked the catalogue page's four behaviours
and Appendix A's six notes and two conventions — **seven checks that had to go with the
pages they described.** Keeping a gate for a deleted page would be worse than useless. What
replaces them is one new check that nothing anywhere still links to a removed route: a stale
`<Link to="/catalogue">` renders as a working link and quietly lands on the catch-all
redirect, which looks like navigation and is not. Net: 359 checks to 353.

**What the product loses.** The catalogue page was the browsable index of all 163; ⌘K still
reaches any of them by id or title, and it searches every insight, not a subset. The
methodology page held PRD Appendix A's six notes; each insight's own caveat still appears in
its "How this is calculated" disclosure, sourced from the catalogue, which `verify:data`
covers. Verified: both removed routes fall through to Home rather than a blank page, Retail
still renders its 54 cards and 78 charts, and ⌘K finds 7 of 163 for "concentration".

**This is a deliberate divergence from PRD §10**, which lists Methodology as one of the six
nav items and `/catalogue` as the addition. The PRD is now behind the build on both this and
custom reports.

### 2.22 A printed report hid the one line that keeps it honest

Found in Phase H, and it had been true of the whole product since Phase 7, not just of
reports.

Two independent defects, both in the same direction — the printed page was *less* honest
than the screen, which is backwards, because the printed page is the one most likely to be
read by somebody who was not in the room.

**A filled chip prints white on white.** A chip's shape is a CSS background, and browsers
drop backgrounds when printing unless the reader ticks "Background graphics", which is off by
default. A scope chip is `bg-navy text-surface`. So the one mark on a card saying *this panel
is not reading what the header says* vanished on paper. Print now gives every chip a border
and ink and relies on no background at all, through a `data-chip` hook rather than a Tailwind
class name.

**The sentence explaining a struck chip never printed.** It lives inside "How this is
calculated", and a closed `<details>` prints nothing but its summary. The chip's `title`
tooltip does not print either. A printed report showed a struck-through **Basra** with no
explanation anywhere on the page. The sentence is now promoted into a print-only line on the
card; the summaries themselves are hidden, since two paragraphs of guidance on each of 54
cards would bury a section page.

**A third, self-inflicted, worth recording.** The `data-chip` edit was applied twice: the
first attempt matched nothing in `Badge.tsx` and failed silently, leaving a correct print rule
pointed at an attribute no element carried. The gate now asserts the hook exists in each chip
component, because a print rule that matches nothing looks exactly like a print rule that
works.

Verified by lifting the real `@media print` declarations out of the CSSOM and applying them to
the live DOM, which tests the thing a source-text check cannot: that the selectors hit. All
three chips transparent with a 1px border and ink, the ignored one struck through, the I3
sentence at `display: block`, summaries and the rename pencil hidden, nav, rail and every
control hidden, charts still drawn.

### 2.21 An exempt block never admitted it was ignoring the header

Found in the browser while testing Phase C, not by a gate — the gate agreed with the code
because both were asking the wrong question.

`describeScope` described the reader's **per-block override**. So a report whose page
header read *Basra*, holding R-17 (*Deposit concentration*), drew a whole-bank
concentration curve directly beneath the word Basra with nothing anywhere on the card
saying so. R-17 is exempt from the branch filter by design — a statement about the top 1%
of the bank's depositors is not a statement about one branch — and that exemption is
correct. Not mentioning it is not.

The same gap existed for a per-block override of an exempt dimension, and in the opposite
direction to the one I had coded: my first fix tested `header.branch !== 'all'`, which
missed the case where the reader set Basra *on the block* rather than on the page.

**Fix.** A chip is now derived from the block's **view against the header**, not from the
override, and an exempt dimension is reported against whatever was *asked* for — from
either source:

```
asked = resolveScope(header, scope)        // before I6 strips anything
exempt dimension  and asked !== 'all'  ->  struck chip naming what was asked
not exempt        and asked !== header  ->  solid chip naming the block's slice
```

The question a chip answers is "is this panel reading what the header says", and an
override is only one of the reasons the answer can be no. Verified on screen: R-17 and the
two map blocks each carry a struck-through **Basra** chip and the footnote sentence, while
R-02 — which genuinely is reading Basra — stays silent.

This gap also exists on the section pages, where the same exempt insights sit under the
same global filter. Reports are where it is most dangerous, because a report puts a
reader's own heading above the figures. Worth closing there too, and not in this phase.

### 2.20 Five of the twelve waterfalls did not close, and one drew nothing

Found by the Phase B gate, which builds all 163 blocks under four deliberately thin
scopes. Both defects were in the generic `waterfallShape` branch, both had shipped since
Phase 4, and neither had anything to do with custom reports — the awkward-scope sweep
simply looked at output nobody had looked at numerically before.

**The bridges did not close.** The builder allocated `|movement|` across the five members
and then flipped some signs at random, so the deltas no longer summed to the movement
they were drawn against. The closing bar was set to `anchor.level` regardless. R-48
(*Write-offs & provisioning trend*) was the worst: its deltas landed **37.6% short** of
the closing bar beside them. G-12, R-15, C-03 and C-45 were off by 5.3%, 7.1%, 31.7% and
9.5%. A reader adding the bars up by hand would not have reached the total.

**G-32 drew nothing at all.** *NPL formation & cures (flow view)* has a flat anchor, so
`movement` was zero, so all five deltas were exactly zero — an opening bar, five bars of
nothing, and a closing bar of the same height, at **every** scope including the default
one. `verify:series` missed it because its plausibility checks read series points, not
waterfall steps.

**Fix — build what a bridge actually is.** Gross flows in each direction that net to the
movement, rather than a partition of the net change:

```
gross   = max(|closing| x 0.16..0.28, |movement| x 1.4)
rising  = (gross + movement) / 2        falling = (gross - movement) / 2
```

The two pots reproduce the movement exactly by construction, so the bridge closes
whatever the rounding; the residual goes to the largest mover. At least one member is
forced into each direction, so a bridge always has a down bar to explain. A book that
ends the year where it started still formed and cured loans all year, and G-32 now shows
34.7B of gross movement netting to zero against a 127.8B stock — verified on screen: both
navy bars span the same pixels, and the five deltas walk up and land exactly on the
closing bar's top.

Two new gates: **every waterfall closes** (`opening + deltas === closing`, tolerance
0.5%) and **no waterfall has every delta zero**, both run across 163 blocks x 4 scopes.

### 2.1 The JSON is not a bare array
It is `{ generatedFrom, count, insights[] }`. PRD §6 types the record but not the
envelope. Type both; read `insights`.

### 2.2 Filename mismatch
PRD §5 says `src/data/insights.json`; the supplied file is `RTB_insights.json`
(PRD Appendix A also calls it `RTB_insights.json`). **Decision pending — §3.**

### 2.3 Executive needs 8 components, not 6
PRD Phase 1 lists `KpiCards, LineChart, GaugeChart, BulletChart, DonutChart,
WaterfallChart`. E-06 also needs **StackedBar**; E-08 also needs **BarChart**.
As written, PRD Phase 1 cannot render `/executive`.

### 2.4 Five things in the PRD that nothing in the data uses
Do not build these:
- Variants: `LineChart.multi`, `ParetoChart.withLimit`, `BarChart.withTarget`
- Components: **`TrafficLightPanel`**, **`FlowDiagram`** — both named in PRD §4 as
  hand-rolled SVG work, both referenced by zero panels. **Decision pending — §3.**

Actual distinct `(component, variant)` pairs: **39**. The PRD §8 table lists 42 and
the prose says "40+".

### 2.5 `group` has a casing bug; `domain` does not
G-14…G-20 carry `group: "Treasury, Alm & Market Risk"` while `domain` has the
correct `"Treasury, ALM & Market Risk"`. These are the only 7 records where
`domain !== group`. PRD §10 says derive tab labels from `group`, which puts "Alm"
on a boardroom screen.

**Rule:** `group` is the key and the slug source; `domain` is the display label.

### 2.6 Section slugs must be layer-scoped
`Capital` is a section in both `executive` and `bank-wide`. Key the slug map on
`(layer, group)`.

### 2.7 Two-panel cards need two layouts, not one
PRD §11.4 says split 50/50 with a hairline divider. But `KpiCards` is the second
panel in 23 of 73 cases — a KPI sidecar, not a co-equal chart. Add a ~65/35 layout
used when `panels[1].component === 'KpiCards'`. A flat 50/50 looks wrong on a
third of the two-panel cards.

### 2.8 A single panel often renders several values
Not an edge case:
- **E-02** — one `GaugeChart:target` panel showing NIM *and* CIR (PRD §15 beat 2
  says "gauges", plural)
- **E-04** — one `GaugeChart:regulatoryFloor` panel showing LCR, NSFR *and* LDR
- **E-03** — one `BulletChart:plain` panel showing ROE *and* ROA

`gaugeSet` and `bulletRows` must carry arrays. Bake this into the prop contract in
Phase 2, not later.

### 2.19 The reveal, and a failure mode worth remembering

**Revealing the container is what made chart motion possible at all.** Animating a
chart's marks only works for the 13 Recharts components; SVG `d` and `points` are not
CSS-animatable, so gauges, treemaps, Sankeys and the Lorenz curve cannot draw themselves.
Moving the motion up to the **card** removes the problem entirely: every panel enters
identically because the animation is one opacity and one transform on a wrapper, and
what is inside it is irrelevant.

**`rootMargin` was the wrong sign.** A negative bottom margin shrinks the root, making a
card travel *further* into view before triggering — the opposite of what is wanted, and
it leaves blank space under fast scrolling. A positive bottom margin extends the root
below the fold so a card starts its entrance shortly before it arrives. Now `14%`.

**A card that needs JavaScript to become visible can stay invisible.** Starting at
`opacity: 0` is what lets a card fade in without flashing — but it also means the only
thing between the reader and a blank dashboard is the observer firing. A page that is not
compositing (a background tab, a hidden panel, an automation context) receives no
IntersectionObserver callbacks at all, and all 54 cards sat invisible. Observed directly
during development.

Two attempts were needed:

1. A failsafe timer that revealed by adding the animation class. **This did not work** —
   wherever callbacks are not delivered, frames are not painted either, so the animation
   froze on its first keyframe and the cards stayed blank.
2. The failsafe must **bypass motion entirely.** `useReveal` now returns one of three
   states, and the escape hatch renders the card plainly visible with no animation to
   depend on.

The distinction that makes the timer precise: the observer reports on every element it
watches, intersecting or not, as soon as it runs at all — so a first delivery of any kind
proves it works and cancels the failsafe. Below-the-fold cards are unaffected, because
their first report says "not intersecting" and they simply wait to be scrolled to.

**The general lesson:** never let a decorative animation be the thing that makes content
visible. Print and `prefers-reduced-motion` both force the card visible for the same reason.

### 2.18 Phase 9 findings — animation vs transition, and an impure hook

**The distinction that makes motion usable here.** *Animation* fires on mount and is
decorative; *transition* fires on change and carries meaning. Mount animation stays off —
Retail mounts ~78 panels and Recharts animates 1500ms each, which would turn the 20ms
section-tab switch into a stutter. `useChartTransition` returns false for the first paint
and true after, which is the only way to separate the two through Recharts' single flag.

Measured after the change: **Retail mounts in 118ms, tab switch 16ms** — both unchanged.

**A filter change already costs ~450ms of blocked main thread**, in one long task, on
Retail's 78 panels — *before* any animation. That is the re-render, not the motion. A
260ms interpolation of 78 charts lands on top of an already-saturated frame budget, so
the filter transition is the part genuinely at risk and is the reason it is built for
review rather than shipped. It could not be measured here: the Browser pane was hidden,
which suspends `requestAnimationFrame`, so the animated case never ran.

**Motion could only ever be mixed, and that is what killed it.** The 11 Recharts
components interpolate between datasets. Of the hand-rolled SVG charts, only Heatmap
(cell colour) and ScenarioBars (percentage widths) can transition in CSS; gauge arcs,
treemap tiles, Sankey ribbons and the Lorenz curve all snap, because SVG `d` and `points`
are not CSS-transitionable. A filter change therefore had some charts gliding while
others jumped — which reads as breakage rather than polish. **Removed on review.** A
partial transition across a chart library is worse than none.

**StrictMode caught an impure hook, and the fix caused a second bug.** `useArrival`
claimed the once-per-session flag inside a `useState` initializer — a side effect during
render. React 18 double-invokes initializers precisely to surface that: the first call
claimed the arrival, the second saw it taken, and nothing played.

Moving the claim into an effect fixed that and broke the animation a different way. The
effect fires about 100ms after mount, so the band painted **fully visible**, then snapped
to transparent and faded back in — a flicker, not an entrance. Reported as "I didn't see
any animation", which is what a 100ms flash looks like.

The right split: **read the flag during render, claim it in an effect.** Reading is pure,
so StrictMode's double-invoke returns the same answer twice and the class is on the
element at its first paint. Verified with a `MutationObserver` on the band's insertion:
`hasArriveClass: true, opacity: 0` at the moment it enters the DOM.

Also lengthened to 520ms over 14px, from 450ms over 8px. At the original values it was
too slight to register even once the flicker was gone.

**What survives.** One moment: the Executive arrival. `MOTION_ENABLED` in
`design/motion.ts` removes even that, and `prefers-reduced-motion` is honoured
independently.

### 2.17 Phase 8 findings — the findings layer caught a defect nobody had seen

**Panels of the same insight disagreed with each other.** R-01's line chart ended at
31,881 active customers while the `KpiCards` tile beside it read 44,528 — the same
measure, two numbers, on one card. A4 seeds by panel index, so the sidecar had been
generating independently since Phase 2 and nothing had surfaced it. It only became
visible once the card started *stating* its numbers in prose.

A `KpiCards` second panel now reads its values off the primary series rather than
generating its own. 14 sidecars affected; all now agree. This is the argument for the
findings layer in miniature: writing the number down in words is what exposed it.

**Grid holes.** Giving lead insights a second column put `col-span-2` cards into a
two-column grid, where a spanning card cannot fit a half-filled row — it starts a new
one and leaves several hundred pixels of nothing. `grid-auto-flow: dense` would backfill
it, but only by reordering, and PRD §11.2 requires workbook order within a section.
Sections are now chunked into rows instead: order preserved, largest gap down from
500px+ to the 84px section rule.

**Width is not emphasis.** The first pass gave every lead card two columns, which made
E-02's two gauges float in 1,500px of white. A card earns the second column only if its
chart uses the width — time series, rankings, matrices, flows — and otherwise expresses
lead status through scale and rule weight alone.

**The gate broke on the logo.** `verify:tokens` imported `Executive.tsx` to read the
callout ids, and once the top bar imported an `.svg` the whole UI tree came with it and
Node could not load it. The callouts moved to `src/data/attention.ts`, which is where
they belonged: they are claims about the bank, not view code.

### 2.16 Phase 7 findings — tab switching was not instant, and two flexbox traps

**Tab switching took 763–1136ms.** PRD §11.2 asks for instant. A5 kept the DOM nodes,
but React still re-rendered all 54 cards and recomputed `seriesFor` for 78 panels on
every tab click, and `v7_startTransition` deferred the work so the content sat one tab
behind the URL. Memoising `InsightCard`, `InsightPanel` and `Chart`, and wrapping the
`seriesFor` call in `useMemo`, took it to **a uniform 20–21ms** — a ~50× improvement.
A5 still holds afterwards (same nodes, nothing unstamped) and filters still reach every
panel; in fact **all 78 now change** rather than 77, because the Lorenz basis recomputes.

**Two flexbox min-width traps broke the 1280×800 requirement.** A flex item keeps
`min-width: auto` unless told otherwise, so it refuses to shrink below its content:

- `WaterfallChart`'s step labels ("Net interest income") widened their row, and the
  `flex-1` plot column had the same problem one level up — Bank-Wide overflowed by 24px.
  Fixing only the labels did nothing; the column needed `min-w-0` too.
- `DonutChart` put a fixed 240px donut and an intrinsically-sized legend in one row
  where neither could shrink — Retail overflowed by 6px. The legend now wraps beneath.

Both are load-bearing for PRD §13, and both are asserted in the gate so they cannot
regress.

**The gate caught my own violation.** The print stylesheet was written with `#fff` and
`#ccc`; A1 says tokens are the only source of colour. Now `theme('colors.surface')` and
`theme('colors.line')`, which resolve from `tokens.ts`.

**The production bundle makes exactly three requests** — the HTML, one JS file, one CSS
file, all local. The only external strings in the bundle are React's warning-message
URLs and the SVG namespace identifier, neither of which is ever fetched. That is the
offline proof PRD §16 asks for.

### 2.15 Phase 6 findings — two charts that ignored the filters

PRD §12 is blunt: "a filter that does nothing is worse than no filter, and a CEO will
try one." Fingerprinting the rendered geometry of all 78 panels on Retail before and
after each filter found two that did not move.

**Heatmaps normalise colour to their own min and max.** When a filter scales every cell
by the same factor the normalised intensity is unchanged, so the colours come out
pixel-identical — four panels looked inert. The scale legend now prints its actual
range rather than "Low / High", which makes the change visible without distorting the
encoding.

**The Lorenz curve is structurally filter-invariant, by design.** R-17's curve comes
from `concentrationCurve`, calibrated to PRD §7.3's anchors, so the shape does not move
when a branch is selected — and it should not: demo beat 5's line is "a third of
deposits sit with one per cent of customers", and a headline figure that wobbles when a
presenter touches a filter is worse than one that holds. Instead the curve now states
the population it is computed over — 271,520 customers unfiltered, 24,654 for Basra —
so it responds truthfully without the concentration figure moving.

**Result: 77 of 78 panels change under branch, division or currency**, and the 78th
(R-17) changes its stated basis. Period is different by design — it widens the window
rather than reseeding (§2.11), so it moves the 22 time-series panels and correctly
leaves point-in-time gauges, breakdowns and tables alone.

**GeoMap reads the filter from context rather than through `ChartProps`.** Only one
component needs it, and widening the A6-frozen contract for a single chart would be the
wrong trade. Clicking the selected branch again clears the filter.

### 2.14 Phase 5 findings — animation, labels and the keep-mounted rule

**Mount animation is off across the chart library.** Recharts animates 1500ms per chart
on mount, and the Retail page mounts 78 panels at once. Animating them together janked
the page and worked against PRD §13's "cold start to interactive under two seconds" and
"no layout shift"; it also made screenshot verification unreliable (§2.13). This is a
deliberate change to A6-frozen behaviour, via a single `CHART_ANIMATION` constant.
**Result: the Retail page mounts all 78 panels in 395ms.**

**A5 is satisfied by `hidden`, not by filtering.** Every insight on a layer is rendered
once and tabs toggle `hidden`. Filtering the array would unmount and rebuild every
Recharts tree on each tab click — the exact stutter the PRD guards against. Verified in
the browser by node identity: after a full seven-tab cycle, the same card element and
the same SVG node are still in place, with 74 stamped SVGs before and after and none
unstamped.

**69 of 163 insights were labelling their metrics "Ratio", "Value" or "Count".** Those
are honest about the *shape* of a metric and useless as a name — C-43 read "Ratio 49.2%"
where it should read "Overdue limits". The catch-all anchor rules now derive the label
from the first clause of the insight's own title, with parentheticals stripped:
"Net interest income (NII) & margin trend" → "Net interest income". **Generic labels: 0.**

**Tab state is a route segment, and tab links use `replace`.** `/retail` is All,
`/retail/deposits-liabilities` is that section. Without `replace`, a presenter clicking
through seven tabs would have to press Back seven times to leave the page.

**Executive's tab bar sits below the headline band and attention strip**, so its content
starts lower than the other three layers. That is PRD §11.3 by design, not layout shift:
the three insight pages are identical to the pixel (tab bar at y=129 on all three).

### 2.13 Phase 4 findings — dimension inference was the weak point

**The charts were fine; the labels were not.** All 23 components rendered on the first
pass, but 9 insights showed a stacked area or Pareto of "Category A, Category B, …"
because `dimensionFor` fell through to the generic vocabulary. A stacked area titled
*Asset composition & deployment* labelled that way is exactly what a CFO queries.

Six vocabularies added, one of them fixture-backed:

| Dimension | Serves | Note |
|---|---|---|
| `assetClass` | G-09, G-12 | **Carries real fixture balances**, so an asset composition sums to `totalAssets`. Loans are net of provisions, as a balance sheet presents them |
| `plLine` | E-08 | Budget-variance and contribution charts |
| `complaintReason` | G-48 | |
| `operationalLoss` | G-43 | |
| `counterpartyType` | G-19 | |
| `customerType` | G-44, G-45 | |

Generic fell from 19 insights to 12, and from 9 to **0** among those that visibly
render category labels. `anchors.ts` also now resolves asset-composition titles to
`totalAssets`, so G-09's stack reconciles to the fixture rather than to a random level.

**Exception tables use indicator rows.** `tableShape` now consults the same
`indicatorsFor()` used by the RAG panels, so G-52's regulatory-reporting table lists
"Submission timeliness, Reconciliation breaks, …" rather than categories.

**GeoMap labels only the largest branches.** Six of the eleven sit in a tight northern
cluster (Duhok, Mosul, Erbil ×2, Kirkuk, Sulaymaniyah) and labelling all of them
produced overlapping text. The rest are named on hover, which every chart has anyway.

**A note on verifying charts by screenshot.** Recharts animates for 1500ms on mount.
A screenshot taken sooner catches curves part-drawn — it made `VintageCurves` look
broken when it was not. Measure the rendered geometry after the animation settles, or
measure the DOM rather than the image. Worth remembering in Phase 5, where 163 cards
mount at once and mount animation may need reconsidering for the "no layout shift"
and "cold start under 2 seconds" gates in PRD §13.

**Colour decisions carried forward:** heat intensity uses the navy→cyan ramp, never
red/green, because a magnitude is not a threshold (PRD §8); RAG cells carry an explicit
status, which is. A `DataTable` exception row gets a left rule and a status word rather
than a full red row.

### 2.12 Phase 0/3 findings — the chart contract and colour discipline

**The prop contract drops two of PRD §8's props.** `unit` and `reference` are not
separate props: Phase 2's `ChartData` already carries both, and passing them alongside
`data` would create two sources for the same fact. Charts read `data.unit` and
`data.reference`. Contract frozen (A6) in `components/charts/contract.ts`.

**Red is reserved for regulatory breaches.** A first pass coloured any gauge more than
15% off target red, which made LDR (45.6% against a 60% target) look like a breach.
PRD §8 ties red to floors, so target-based reads now top out at amber and red means a
floor has been crossed. This matches demo beat 2 — "green is on plan, amber is drift".

**A gauge needs `downIsGood`.** Without it a gauge cannot tell "on plan" from "drift":
CIR *above* its target is drift, CAR above its target is not. The first pass showed CIR
at 52.4% in green while it sat 2.4pp the wrong side of a 50% target. `Gauge.downIsGood`
now travels from the anchor.

**Gauge floor labels moved into the caption.** Drawn beside the arc tick they ran past
the SVG edge and were clipped at the top of a 180° arc — and PRD §8 says a floor is
*always* labelled.

**Two console defects fixed, per PRD §13.** React Router's v7 future-flag warnings
(opted in via `BrowserRouter future={...}`), and a React error from spreading Recharts'
props — which include `key` — into the `peakMarkers` dot renderer. This is exactly the
"Recharts is noisy about missing keys; fix them" case.

**The attention strip could not yet carry the concentration story.** PRD §11.3's natural
callout — "a third of deposits sit with one per cent of customers", demo beat 5 — points
at R-17, a `ParetoChart:lorenz`, and Pareto did not exist until Phase 4. The strip ran
NPL / ROE / liquidity / CIR through Phase 3. **Resolved in Phase 4**, and `verify:tokens`
now fails if any callout points at a panel with no renderer, or if R-17 is missing.

**Waterfall decreases are not red.** In a P&L bridge a negative step is an operating
expense or a tax charge — expected, not bad. Anchors are navy, increases cyan,
decreases mid-navy.

### 2.11 Phase 2 findings — shapes, seeds and clamps

**15 shapes, not 12.** PRD §7.4's list omits `GeoMap`, `KpiCards` and `ScenarioBars`,
none of which can borrow another shape. Mapping is in `SHAPE_BY_COMPONENT`, with one
override: **`StackedBar:ladder` is a bucket breakdown, not a time series** (maturity,
repricing, rate and collateral ladders — 7 panels).

**`period` is excluded from the seed.** A4 still holds — identical filters reproduce
identical output — but if period fed the seed, switching 12M→24M would redraw the
twelve months already on screen, which reads as a bug to anyone comparing. Series are
generated at full depth (36 or 90 points) and sliced to the window, so widening the
period only reveals more history. Branch, division and currency do change the seed.

**Multi-value panels are solved generically** (§2.8). Splitting a title on `&`, `,`
and `/` and resolving each fragment against the metric rules yields E-02 → NIM + CIR,
E-04 → LCR + NSFR + LDR, E-03 → ROE + ROA, E-01 → three balance sheet figures. No
per-insight code.

**`allocate()` needed a decimal variant.** Apportioning whole units is right for IQD
— balances are exact to the dinar — but a percentage total of ~43 across six slices
collapsed to small integers that barely moved when a filter changed. Percent
breakdowns allocate at two decimals via `allocateScaled()`.

**Five output-quality defects that every structural check passed**, found by
eyeballing the demo-path charts and now covered by the gate's Plausibility section:

| Defect | Cause | Fix |
|---|---|---|
| Composition series pinned flat | A share of a 100% composition (Stage 1 at 84%) was clamped to the *metric's* ceiling (NPL's 30%) | Composition members are bounded by the composition, not the metric |
| Headline deltas contradicted the story | MoM delta differenced two noisy points; ±3% noise swamps a +1.1%/month trend, so deposits read −0.12% | Delta comes from the anchor's growth or shape; jitter cut to 1.5% |
| Invented regulatory floor on LDR | The `regulatoryFloor` variant synthesised a floor at 70% of level | Only real floors render — PRD §8 says a floor is always labelled |
| Stacked percent summed to 42.6%, not 100 | Used the anchor level as the stack total | A percent composition totals 100 by definition |
| RAG grids labelled with products | `Heatmap:rag` used the inferred dimension, so a liquidity early-warning panel listed "Current account, Savings account…" | Four named indicator sets in `dimensions.ts` |

**`whatItTells` is excluded from metric classification.** It is business prose, and
matching on it misclassified badly: "Revenue diversification beyond lending spreads"
made G-03 a *yield* metric capped at 30%, and "feeds branch network and digital
investment decisions" made R-10's channel mix a count of the bank's 11 branches. The
title and section name the metric; the prose says why it matters.

**Only 2 demo-path overrides were needed**, not 36. PRD §7.4 permits bespoke cases for
the 36 but does not require them, and most do not need one: their anchors already
resolve to the fixture. `demoPath.ts` holds the registry and is the hook Phase 5 uses
to tune demo copy.

### 2.10 The PRD's own fixture does not reconcile — three fixes applied

Found in Phase 1 by turning PRD §7.1 into assertions (A3). Arithmetic verified.

| # | Problem | Fix |
|---|---|---|
| a | **`taxExpense` missing.** The income lines give 8.60B/mo pre-tax = 103.20B/yr, i.e. ROE 16.54% and ROA 1.97% — not the stated 11.6% and 1.38%. Both stated ratios independently imply the *same* ~72.3B/yr net profit, i.e. a 29.9% effective tax rate. | Added `taxExpense: -2_580_000_000` (30.0%). ROE and ROA now hold to rounding. |
| b | **NPL coverage of 78.4% was impossible.** 6.8% NPL on 1,880B gross loans is a 127.84B stock; 128.00B of provisions is 100.1% coverage. | Provisions split into specific (Stage 3, 100.227B) and general (Stage 1–2 collective ECL, 27.773B). Coverage measured on the specific leg — reconciles exactly, balance sheet untouched, and PRD Appendix A note 4 already sources IFRS 9 stages from the ECL engine. |
| c | **CIR is 52.4%, not 54.8%.** 11.80B opex over 22.50B operating income. No adjustment reconciles 54.8% without breaking ROE and ROA. | Derived value wins: **52.4%**. Declared as an accepted 2.4pp deviation in `RATIO_TOLERANCE`. |

NIM lands at 3.44% vs a stated 3.42% — a 2bp gap, accepted, and it only holds if
earning assets include cash and central bank balances (right for an Iraqi bank,
where CBI balances are remunerated).

What *did* hold exactly: both balance sheet identities and LDR.

Two further modelling decisions taken in the same pass:

- **LC and guarantee facilities moved off balance sheet** into `bank.contingents`.
  They are contingents, not loans; leaving them in would force trade finance into
  `grossLoans` to satisfy §7.1's "loans by product sum to grossLoans". The
  Corporate → Trade Finance & Guarantees section (7 insights) reads from there.
- **`casaRatio` is declared in `bank.ts` and enforced in `entities.ts`**, which
  must allocate deposit products to hit 71.2%. Same for CAR, CET1, LCR and NSFR:
  declared, because RWA and HQLA models are out of scope for a frontend demo.

### 2.9 Minor: section count stated twice, inconsistently
PRD §10 prose implies 29 sections, Appendix B says "30 tabs + 4 All tabs". Data
says **30**. The `/catalogue` counter reads "163 insights across 4 pages and 30
sections".

---

## 3. Open decisions

Answer before Phase 1. Recorded here so the answer is not lost between sessions.

| # | Decision | Resolution | Status |
|---|---|---|---|
| D1 | Daily-series rule. PRD §7.3 says "Daily → 90 days", but 72 records read `Daily / Monthly`. | **Only the 6 records with `refresh === "Daily"`** get 90 daily points. All other 157 get 36 monthly points. Implemented as `axisFor()` in `generators.ts`. | **decided 2026-09-19** |
| D2 | `TrafficLightPanel` / `FlowDiagram` — build, or drop? | **Dropped.** Removed from the `ChartComponent` union, so the type is exhaustive over real data. Phase 4 loses two hand-rolled SVG components. | **decided 2026-09-19** |
| D3 | Filename — normalise to `insights.json`, or keep `RTB_insights.json`? | **Keep `RTB_insights.json`.** Lives at `src/data/RTB_insights.json`; a refreshed workbook export drops straight in. PRD §5 is amended by this. | **decided 2026-09-19** |

---

## 3b. Custom reports — decisions

A portable spec for a custom-report section was supplied from another product. Its
central decision — **the unit is a named finding, not a chart** — is already this
codebase's architecture, so most of the expensive work was done: `seriesFor` is the pure
`(view) => data` it asks for, `cardSpan`/`toRows` are its width packing, and the ⌘K
palette is its picker.

| # | Decision | Resolution |
|---|---|---|
| R1 | The spec requires `localStorage`; PRD §4 forbids it and `verify:tokens` enforces that | **In-memory only, with the share link as the save button.** The spec's own §5 already says the link is the real sharing mechanism; a reload loses unsaved work, which the rule intends |
| R2 | Is a block a whole insight or a single panel? | **The whole insight** — that is the named finding, and 73 of the 163 carry two panels that belong together |
| R3 | Does I6 (blocks that compare across a dimension) have an analogue here? | **Yes.** GeoMap blocks, the division split and whole-base concentration blocks. 10 branch-exempt, 2 division-exempt, list pinned in the gate |

**R3 is the judgement most likely to produce an embarrassing chart**, in either
direction. Over-exempting answers a branch question with a bank-wide figure and puts a
chip on it saying the branch did not apply; under-exempting draws a branch map with one
circle on it. The list was read insight by insight and is asserted exactly, so a later
regex tweak cannot drift it silently. `C-10 Sector / industry concentration` is the case
that caught a first pass out: matching the bare word "concentration" swept it in, and
sector concentration *inside* Basra is a perfectly good question.

**Known consequence of R2:** a two-panel insight takes one exemption for both panels.
R-05 pairs demographic bars with a branch choropleth, so exempting the map from the
branch filter exempts the bars too. Inherent to block-as-insight; flagged rather than
worked around.

---

## 4. Architectural decisions fixed up front

Cheap now, expensive to retrofit. Decide these in the phase named, not later.

| # | Decision | Phase | Why now |
|---|---|---|---|
| A1 | Tailwind theme is generated **from** `tokens.ts` | 0 | The "no hardcoded hex" exit gate is unenforceable otherwise |
| A2 | Per-metric delta direction map (down-is-good: NPL, CIR, cost, impairment) lives in `format.ts` from the first commit | 0 | PRD §9 requires it per metric; adding it late means auditing every KPI |
| A3 | Fixture consistency rules (PRD §7.1) are **assertions that throw at module load** | 1 | A build that boots is a build whose deposits reconcile. Comments don't hold |
| A4 | Seed is `${id}:${panelIndex}:${filterKey}` | 2 | Panels within a card must differ; the same panel must be stable across reloads and identical under identical filters |
| A5 | Tabs keep charts mounted and toggle visibility | 5 | PRD §11.2 requires instant switching. Retrofitting means rewriting the page |
| A6 | Chart prop contract is frozen at the end of Phase 3 | 3 | 15 more components land in Phase 4 against it |

---

## 5. Phases

Seven phases as planned, plus 8 and 9 (design, motion) and now 10 (Generate Insights).
Each ends in something demonstrable; any prefix is presentable.
Estimates are working days, single developer, and are estimates.

### Phase 0 — Scaffold, tokens, shell · ~0.5 day

> **Done.** Built out of order: Phase 1 came first at the user's direction, so only the
> toolchain it needed was installed up front, and the rest of Phase 0 landed alongside
> Phase 3. Nothing here is outstanding.


Vite + React 18 + TS (strict) + Tailwind + React Router. `design/tokens.ts`,
`design/format.ts`, `AppShell`, `TopBar`, `DemoBanner`, `MainNav` (6 items),
routes to placeholder pages for all 7 routes.

- **Build `DemoBanner` first.** Cheapest risk mitigation in the PRD (§11.1, §16).
- `format.ts` ships complete: compact IQD (`4.12T IQD`), percent 1dp, ratio 2dp,
  counts with separators, signed deltas with the A2 direction map, `31 Aug 2026`.
- Logical properties only (`ps-*`, `pe-*`, `text-start`) per PRD §9 Arabic readiness.

**Exit**
- All 7 routes render the shell with no console errors
- `grep -rE '#[0-9a-fA-F]{3,6}' src/ --exclude=tokens.ts` returns nothing
- Banner present on every route, not dismissible

### Phase 1 — Typed data layer and fixtures · ~1 day

`types.ts` (envelope + `Insight` + `Panel` + `Layer` + `ChartComponent`),
`data/insights.ts` with `byLayer()`, `sectionsFor(layer)`, `bySection()`,
`byId()`, `prevNextInSection()`. Then `bank.ts` (PRD §7.1 fixture),
`entities.ts` (11 branches with coordinates, 14 products, 6 segments, 11 sectors,
4 currencies), `generators.ts` (mulberry32 over a string hash).

- `sectionsFor()` returns `{ key, slug, label, count, order }` where `label` is
  `domain` and `slug` is layer-scoped — implements §2.5 and §2.6.
- Fixture assertions per A3: deposits by product/branch/currency/segment each sum
  to `customerDeposits`; loans by product/sector/branch each sum to `grossLoans`;
  asset composition sums to `totalAssets`; `ldr === grossLoans / customerDeposits`.
- Baghdad Main + Erbil Main ≈ 38% of deposits (PRD §7.2), so concentration charts
  have something to show.

**Exit**
- `tsc --noEmit` clean; no `any` in `src/data` or `src/types.ts`
- A script prints 4 layers and 30 sections with counts matching §1.2 exactly
- Fixture assertions pass at module load
- `prevNextInSection()` wraps correctly at both ends of all 30 sections

### Phase 2 — Shape generators and `seriesFor` · ~1 day

**15 shape generators**, not the 12 in PRD §7.4 — that list omits `GeoMap`,
`KpiCards` and `ScenarioBars`, none of which can borrow another shape.

| shape | components served |
|---|---|
| `timeSeries` | LineChart, AreaChart, ComboChart, VintageCurves |
| `breakdown` | StackedBar, DonutChart, Treemap |
| `ranked` | BarChart, RankedBar, ParetoChart |
| `matrix` | Heatmap |
| `funnelSteps` | FunnelChart |
| `distribution` | Histogram, BoxPlot |
| `flows` | SankeyDiagram |
| `scatterPoints` | ScatterPlot |
| `gaugeSet` | GaugeChart |
| `bulletRows` | BulletChart |
| `tableRows` | DataTable |
| `waterfallSteps` | WaterfallChart |
| `geoPoints` | GeoMap |
| `kpiSet` | KpiCards |
| `scenarioSet` | ScenarioBars |

15 shapes → all 23 components. Default resolution is
`(component, variant, unit, layer, group)` → shape + params. Bespoke overrides
**only** for the 36 `demoPath` IDs, where the numbers carry the narrative.

- `gaugeSet` and `bulletRows` return arrays per §2.8.
- Trends have direction (PRD §7.3): deposits +1.1%/mo, loans +1.6%/mo, NPL drifts
  up then improves in the last 4 months, digital adoption logistic.
- Concentration is Pareto-shaped: top 1% ≈ 34% of deposits, top 5% ≈ 58%. This is
  the whole point of R-17, G-23 and C-21.
- Values rounded but not suspiciously round. Clamp: no negatives, no impossible
  ratios. Every series ends at the fixture value for `asOf`.

**Exit** — the highest-value gate in the build
- A script calls `seriesFor` for **all 236 panels** and asserts: non-empty,
  shape matches the component's expected shape, all values finite, none negative
  where the unit forbids it
- Two consecutive calls with the same `(id, panelIndex, filters)` are deeply equal
- Two different `filters` produce different output for the same panel
- Zero `Math.random()` in `src/` (PRD §16)

### Phase 3 — Gallery and the 8 Executive components · ~1.5 days

**Build `/dev/gallery` first.** PRD §14 Phase 2 says this and it is right; it pays
for itself before Phase 4 starts.

Then the 8 components `/executive` actually needs (§2.3): `KpiCards`, `LineChart`,
`GaugeChart`, `BulletChart`, `DonutChart`, `WaterfallChart`, `StackedBar`,
`BarChart`. Then `/executive` complete: headline band (4 navy KPI tiles with MoM
delta and 12-month sparkline), E-01…E-08 under their 7 section headings, attention
strip of 3–4 callouts linking to the insight that explains each.

Freeze the chart prop contract at the end of this phase (A6). Chart conventions
(PRD §8) apply from the first component: navy primary, cyan secondary; references
dashed, never solid; regulatory floors red, dashed, labelled; good/bad colour only
at a real threshold; tooltip on every chart; direct labels over legends where two
series can be labelled on the plot.

**Exit**
- `/executive` is demo-ready standalone; §15 beats 1–2 perform cleanly
- Every figure on the screen reconciles to the `bank` fixture
- All 8 components render empty, single-point and `compact` at 160px in the gallery
- No console errors or warnings (fix Recharts key warnings now, not in Phase 7)

### Phase 4 — The remaining 15 components · ~2.5 days

All 39 real variants (§1.3). 9 are hand-rolled SVG after D2 drops
`TrafficLightPanel` and `FlowDiagram`: Sankey, GeoMap, Treemap, Heatmap, Funnel,
VintageCurves, ScenarioBars — plus Gauge/Bullet already done in Phase 3.

Build in descending panel count, so the gallery fills fastest:
StackedBar variants → ComboChart → Heatmap → Treemap → ParetoChart (incl.
`lorenz`) → AreaChart → SankeyDiagram → FunnelChart → ScatterPlot → GeoMap →
DataTable → ScenarioBars → Histogram → RankedBar → BoxPlot → VintageCurves.

> **Scope lever.** `BoxPlot`, `DataTable`, `FunnelChart`, `ScatterPlot`,
> `ScenarioBars`, `VintageCurves` — 21 panels — are used by **zero** demo-path
> insights. If the date moves in, they are the tail to cut, and the §15 script is
> unaffected. Cutting them breaks the "every one of the 163 renders" gate, so it is
> a deliberate trade, not a silent one.

**Exit**
- Gallery shows 23 components × 39 variants at full and compact size
- Every component survives empty / single-point / 160px compact
- No console warnings across the whole gallery
- **The R-17 deposit-concentration callout is restored to the attention strip** once
  `ParetoChart` exists — it is demo beat 5 and §2.12 records why it is absent

### Phase 5 — Four insight pages, tabs, all 163 · ~2 days

One `InsightPage.tsx` driven by the route param. Page header (layer name, insight
count, section count, one-line description, as-of strip). Sticky tab bar: `All`
default, then one tab per section in workbook order, superscript count chips,
active = navy text + 2px cyan underline, horizontal scroll with fade edges, never
wraps. Tab state in the URL so `/retail/deposits-liabilities` deep-links and the
back button works.

`InsightCard` with **both** panel layouts per §2.7. `/insight/:id` at ~420px chart
height with full `method`, `vizLabel`, `refresh`, section, page, in-section
prev/next and a linked breadcrumb. `/methodology` from PRD Appendix A's six notes
plus the two restated conventions.

- A5: charts stay mounted, visibility toggles. Decide at the start of the phase.
- Two-column grid, workbook order within each section.

**Exit** — the acceptance test that matters most
- **All 163 render.** No blank cards, no "not implemented" placeholders
- An automated pass asserts every rendered chart type equals its
  `panels[n].component` for all 236 panels
- All 30 section tabs exist with the counts in §1.2, plus 4 `All` tabs
- Tab switching causes no remount (verify: a chart's mount count stays at 1 across
  a full tab cycle)
- No layout shift navigating between layers

### Phase 6 — Filters, command palette, catalogue · ~1 day

Global filter bar in the top bar — Period (3M/6M/12M/24M, default 12M), Branch
(All + 11), Division (All/Retail/Corporate/Treasury), Currency (All/IQD/USD/Other)
— persisting across page and tab changes, folded into **both** the seed and the
magnitudes. `GeoMap` click sets the branch filter. `⌘K` / `Ctrl+K` palette over all
163 by ID or title. `/catalogue`: search across title, section and method; filter
by page, section, chart type and refresh; compact table and thumbnail-grid views;
visible "163 insights across 4 pages and 30 sections".

**Exit**
- Changing any filter visibly changes every chart on screen (PRD §12: a filter that
  does nothing is worse than no filter)
- The active filter state appears in words in the as-of strip
- Palette resolves any of the 163 by ID or by title fragment; Escape closes it
- §15 beats 6–7 perform cleanly

### Phase 7 — Demo polish · ~1 day

Attention-strip copy tuned to the numbers the generators actually produce.
Transitions. Print stylesheet (cards do not break across pages, charts on white).
`README.md` whose **first paragraph** states the data is synthetic. Sidebar footer
"Demonstration build — synthetic data". Passes at 1280×800 and 1920×1080 with no
horizontal scrollbar. Keyboard: tab order follows visual order, Escape closes
drawers and palette.

Then walk all **36 demo-path insights** individually, looking for anything a CFO
would query.

- Verify the §1.5 glyphs render in the system stack on the actual presentation
  machine.
- Verify offline: DevTools throttled to offline, hard reload, full demo walk.

**Exit — PRD §17 definition of done**
- `npm install && npm run dev` works with no manual steps
- All 163 render; no console errors on the demo path
- Runs fully offline
- Every colour from `tokens.ts`; every number through `format.ts`
- §15 demo script performs start to finish at 1920×1080 with no visual defect
- `README.md` leads with the synthetic-data statement

### Phase 10 — Generate Insights · ~1.5 days

A **Generate Insights** button on every card. It opens a panel beside the chart, runs a
progress bar while the reading is produced, and fills with a reading of *that panel's own
data*: what is happening, why it matters, what to do, what to watch.

**The constraint that shapes this phase.** PRD §17 requires the build to run fully
offline with no console errors, and §16 requires it to survive a dead conference-room
network. A live model call cannot satisfy either. So the feature ships with **two
providers behind one interface**, and the offline one is the default:

- `local` — deterministic, synchronous, built on `finding.ts` and the same `seriesFor`
  call the panel drew from. **The default, and the demo path.** A ~900ms scripted delay
  drives the progress bar so the panel behaves identically either way.
- `live` — a real model call, enabled only by `VITE_INSIGHTS_PROVIDER=live` plus a key.
  Absent, missing or failing, the panel falls back to `local` and says so in one line
  rather than showing an error. A demo must never show a loader that does not end.

Both return the same type, so the UI never branches on provider.

**The structure.** Four beats — *what is happening → why it matters → what to do →
what to watch*. A reader who stops after the headline still has the takeaway.

```ts
interface GeneratedInsight {
  headline: string;                 // ≤ 12 words, the single takeaway
  verdict: 'positive' | 'watch' | 'negative' | 'neutral';
  findings: readonly Finding[];     // 2–3, ranked, never padded to fill
  soWhat: string;                   // one sentence: the business consequence
  actions: readonly Action[];       // 1–3, imperative, each with a horizon
  watchNext?: string;               // the metric and threshold that would change the verdict
  confidence: 'high' | 'medium' | 'low';
  caveat?: string;                  // only when confidence !== 'high'
}

interface Finding {
  text: string;                     // ≤ 20 words, one claim
  evidence: string;                 // the figure that proves it — "NIM 3.28% vs 3.30% plan, −2bp"
}

interface Action {
  text: string;                     // verb first: "Freeze discretionary opex lines above budget"
  horizon: 'now' | 'this month' | 'this quarter';
  owner?: string;                   // "Treasury", "Credit Risk" — inferred from the insight's domain
}
```

**Why `findings` splits claim from evidence.** It is the whole defence against confident
vapour: a claim with no figure attached cannot be emitted. It also gives the modal a
typographic hook — claim in body weight, evidence in the tabular-numeral treatment §2.24
already established, every number through `format.ts` like everywhere else.

**Rules, enforced in the local generator and stated in the live prompt.**

- Hard caps in the type's own documentation — headline ≤ 12 words, finding ≤ 20,
  `soWhat` one sentence. Caps do more for concision than any instruction to be brief.
- **Never restate `chartGuide`.** No "this chart shows", no "as we can see". The reader
  is looking at the chart; the guide drawer already explains the notation.
- Every finding carries a figure read from the rendered `ChartData`. No figure, no
  finding — the same discipline `finding.ts` holds, for the same reason: a generated
  line must not be able to contradict the chart above it.
- Rank, do not enumerate. Cap at three and drop the weakest rather than pad.
- No action without a lever. Where the panel supports none, emit one `now` action that
  is an investigation ("Pull the opex breakdown by cost centre"), never a platitude.
- Filters are part of the input. An insight generated under *Last 12M · Basra* says so,
  in the reader's words, exactly as the I3 chips do in reports.

**A filter change regenerates the insight.** The panel is non-modal precisely so the
reader can keep working the filters while it is open, which means the insight on screen
can be describing a slice the chart no longer draws. A stale reading is worse than no
reading — it is the one failure mode that makes the whole feature untrustworthy — so the
panel re-runs on any change to the filter state, and the chips at its head restate the new
scope in the reader's words.

- **Debounced ~400ms**, so dragging Period through 3M→6M→12M produces one regeneration,
  not three.
- **The in-flight run is abandoned**, never merged: under `live`, the request is aborted
  via `AbortSignal`, and a late response for a superseded filter state is discarded on
  arrival. The panel renders the insight for the filters currently on screen or it renders
  the progress bar — never a third thing.
- **The bar restarts** from its first stage, so the regeneration is visible rather than a
  silent swap of text under the reader's eye.
- Scroll position in the panel resets to the top; the panel does not close, and focus
  stays where the reader put it.

**The panel never covers the chart.** An insight that hides the evidence it is describing
is worth less than the chart alone, and a reader will want to hover a series while reading
the finding that names it. So this is **not** the `BlockPicker` pattern — no `inset-0`
backdrop, no dimming, nothing that swallows pointer events over the card:

- **Desktop (≥1280px).** A panel pinned to the viewport edge away from the card, `w-96`,
  in the same `end-0` drawer geometry `BlockPicker` uses but **without the scrim**. The
  page content shifts rather than being covered — the grid gets an inline-end padding
  while a panel is open — so the originating card stays fully visible and fully
  interactive. If the card would still fall under the panel, scroll it into the free
  column first.
- **Below 1280px.** No room to sit beside the chart, so the panel docks to the bottom at
  roughly half the viewport height with the card scrolled into the half above it. Still
  no scrim, still interactive above.
- **Print.** The panel does not print; its content prints beneath its card if open.

Because it is non-modal, it does **not** trap focus and Escape closes it without touching
the chart's own state. Opening a second card's insights replaces the panel's content
rather than stacking a second one.

**The loader is a progress bar, not a spinner.** A determinate bar in the panel header,
animating through named stages — *reading the series → comparing against plan → drafting*
— so the wait reads as work rather than as latency. Under `local` the stages are scripted
against the known ~900ms; under `live` the bar advances on the same stages and holds at
90% until the response lands, never reaching 100% before there is something to show.
`prefers-reduced-motion` gets the same bar without the stage transitions, per §2.18.

**Scope.** The generator is a `ChartData` visitor over the same 15-shape discriminated
union `finding.ts` and the CSV writer already walk, so one implementation covers all 163
blocks in 15 cases — the same leverage §6b got for free. The button sits in the card
header beside the existing guide affordance, and in the report block header.

**Exit**
- The button appears on all 163 cards and opens a panel with a determinate progress bar
- **With the panel open, the originating chart is fully visible and still interactive** —
  hover a series, read its tooltip, change a filter, all without closing the panel. Checked
  at 1280×800 and 1920×1080, and in the bottom-docked layout below 1280px
- **No insight on screen can describe a filter state the chart is not drawing.** Changing
  any filter with the panel open restarts the bar and lands on a reading whose scope chips
  match the as-of strip; rapid successive changes settle on the last one, with no flash of
  a superseded result
- Every one of the 163 produces a well-formed `GeneratedInsight` — no throws, no empty
  `findings`, no action-free result — proven by a gate, not by clicking
- Offline, with no key and no network, every panel still fills; DevTools offline + hard
  reload + full demo walk stays at 0 console errors
- `live` failure and timeout both fall back to `local` within 8s with a stated line
- Every figure through `format.ts`; every colour from `tokens.ts`; verdict tone uses the
  existing `Badge` tones, adding no new colour
- Escape closes; focus returns to the button that opened it; focus is **not** trapped
  while open; tab order unchanged

---

## 6. Progress tracker

Tick on completion. `Status` at the top of this file tracks the current phase.

### Phase 0 — Scaffold, tokens, shell  — **COMPLETE 2026-09-19**
- [x] TS strict toolchain — `package.json`, `tsconfig.json`, typescript, tsx, @types/node
- [x] Vite 6 + React 18 + Tailwind 3 + React Router 6
- [x] `tokens.ts` complete, Tailwind theme generated from it (A1)
- [x] `format.ts` complete incl. per-metric delta direction map (A2)
- [x] `DemoBanner` on every route, not dismissible — built first
- [x] `AppShell` + `TopBar` + `MainNav` (7 items incl. Catalogue), `PageBody`
- [x] All 7 routes render, plus `/insight/:id`, `/dev/gallery` and a catch-all redirect
- [x] Exit gate: no hardcoded hex outside `tokens.ts`

### Phase 1 — Typed data layer and fixtures  — **COMPLETE 2026-09-19**
- [x] D1, D2, D3 answered and recorded in §3
- [x] `types.ts` — envelope typed, not just the record (§2.1); `VARIANTS_BY_COMPONENT` pins all 39 pairs
- [x] `insights.ts` selectors incl. layer-scoped slugs (§2.5, §2.6) + runtime `parseCatalogue()` validator
- [x] `bank.ts` + consistency assertions that throw (A3); three fixture fixes per §2.10
- [x] `entities.ts` — 11 branches w/ coords, 14 products, 6 segments, 11 sectors, 4 currencies
- [x] `generators.ts` — seeded PRNG, exact-sum `allocate()`, D1 axes, seasonality, concentration curve
- [x] Exit gate: 30 sections with counts matching §1.2; `tsc` clean; no `any`

**Verification:** `npm run verify:data` — 66 checks plus a 7-row ratio reconciliation, all pass. `npm run typecheck` clean.
Negative-tested: perturbing the balance sheet or a deposit weight throws at load
with a diagnostic naming the broken rule. No `any` and no `Math.random()` in `src/`.

### Phase 2 — Shape generators and `seriesFor`  — **COMPLETE 2026-09-19**
- [x] 15 shape generators (`shapes.ts`), one override: `StackedBar:ladder` → breakdown
- [x] Default `(component, variant, unit, layer, group)` → shape resolution (`seriesFor.ts`)
- [x] `gaugeSet` / `bulletRows` return arrays (§2.8), solved generically by title splitting
- [x] Demo-path override registry (`demoPath.ts`) — 2 entries needed, see §2.11
- [x] Pareto concentration correct for R-17 / G-23 / C-21 — one shared curve
- [x] Filters fold into seed **and** magnitudes; `period` windows only, see §2.11
- [x] Exit gate: all 236 panels produce valid data; determinism verified; no `Math.random()`

**New modules:** `types.ts` (+ChartData contract), `filters.ts`, `dimensions.ts`,
`anchors.ts`, `shapes.ts`, `demoPath.ts`, `seriesFor.ts`, `scripts/verify-series.ts`.

**Verification:** `npm run verify` — 99 checks (66 data + 33 series), all pass.
Covers: all 236 panels structurally validated per shape; 15 shapes, 23 components and
39 variants exercised; determinism and per-filter responsiveness on every panel;
fixture reconciliation for E-01/E-02/E-03/E-04/E-08; narrative anchors for
R-17/G-23/C-21/E-07/R-06/R-45; and a Plausibility section that rejects flat, zero or
pegged output.

### Phase 3 — Gallery and Executive  — **COMPLETE 2026-09-19**
- [x] `/dev/gallery` route, built first — real catalogue panels, with compact and edge-case toggles
- [x] 8 components: KpiCards, LineChart, GaugeChart, BulletChart, DonutChart, WaterfallChart, StackedBar, BarChart
- [x] Chart prop contract frozen (A6) — see §2.12 for the one deviation from PRD §8
- [x] `/executive` headline band (4 navy KPI tiles, MoM delta, 12-month sparkline)
- [x] E-01…E-08 under their 7 section headings, via `InsightCard` with both panel layouts (§2.7)
- [x] Attention strip, 4 callouts, each linking to its insight — see the R-17 note in §2.12
- [x] `/insight/:id` with in-section prev/next and breadcrumb *(pulled forward from Phase 5 so the strip links somewhere real)*
- [x] Exit gate: §15 beats 1–2 perform; every figure reconciles; no console errors or warnings

**Verification:** `npm run verify` — 116 checks (66 data + 33 series + 17 tokens), all pass.
`npm run build` clean. Checked in the browser: zero console errors or warnings across
`/executive`, `/dev/gallery`, `/insight/:id` and `/`; no horizontal scrollbar at 1280×800
or 1920×1080; all 12 routes render; all 15 variants of the 8 components render under
real data, empty dataset, single data point and compact 160px.

### Phase 4 — Remaining 15 components  — **COMPLETE 2026-09-19**
- [x] ComboChart · Heatmap (intensity/rag/cohort) · Treemap (squarified) · ParetoChart (+lorenz)
- [x] AreaChart · SankeyDiagram · FunnelChart · ScatterPlot (+quadrant/breakEven) · GeoMap
- [x] DataTable · ScenarioBars (+tornado) · Histogram (+overlay) · RankedBar · BoxPlot · VintageCurves
- [x] All 23 registered; every one of the 236 panels resolves to a real renderer
- [x] R-17 deposit-concentration callout restored to the attention strip (demo beat 5)
- [x] Six dimension vocabularies added — see §2.13
- [x] Exit gate: 23 components × 39 variants in the gallery, full + compact, no warnings

**Verification:** `npm run verify` — 120 checks (66 data + 33 series + 21 tokens), all
pass. `npm run build` clean. In the browser: all **39 of 39** variants render, 0 with a
missing renderer, all 39 show the empty state correctly, and single-point and compact
160px render for every one — with **zero console errors or warnings** across the whole
gallery in all four modes plus `/executive`.

**Hand-rolled SVG (PRD §4):** Treemap, FunnelChart, WaterfallChart, Heatmap, GaugeChart,
BulletChart, SankeyDiagram, GeoMap, BoxPlot, ScenarioBars. `TrafficLightPanel` and
`FlowDiagram` were dropped by D2; `Heatmap:rag` does the traffic-light job.

**GeoMap has no map dependency.** PRD §4 forbids fetching anything, so Iraq's outline is
a ~30-point schematic polygon inlined in the component. It is there to place the
branches, not to be cartographically accurate, and the caption says so.

### Phase 5 — Four pages, tabs, all 163  — **COMPLETE 2026-09-19**
- [x] `InsightPage.tsx` serving Bank-Wide, Retail and Corporate; Executive keeps its own page for the band and strip
- [x] Sticky tab bar, sections derived at runtime, superscript count chips, fade-edge horizontal scroll, never wraps
- [x] URL-driven tab state, deep links, back button (tab links use `replace` — see §2.14)
- [x] `InsightCard` with both panel layouts (§2.7) — verified 465/245px sidecar, 355/355px co-equal
- [x] Charts stay mounted across tab switches (A5) — verified by node identity
- [x] `/insight/:id` with in-section prev/next and both breadcrumb crumbs linked
- [x] `/methodology` — 6 notes plus the 2 restated conventions
- [x] Exit gate: all 163 render; 236 panels match their `component`; 30 tabs correct

**Verification:** `npm run verify` — 129 checks, all pass. `npm run build` clean.
In the browser, across all four layers:

| Check | Result |
|---|---|
| Cards rendered | **163** (8 / 52 / 54 / 49) — no blanks, no placeholders, no empty states |
| Panels rendered | **236**, checksum-matched against the catalogue's `panels[n]` — every chart is the type its record declares |
| Section tabs | 30 + 4 `All`, counts exactly as §1.2 |
| Deep links | every `/layer/section` resolves and shows only that section's cards |
| No remount on tab switch | same card node, same SVG node, 0 unstamped after a full cycle |
| Console | **0 errors, 0 warnings** across 14 routes |
| Heaviest page mount | **395ms** for Retail's 78 panels |
| Horizontal scrollbar | none at 1280×800 or 1600×1000 |

### Phase 6 — Filters, palette, catalogue  — **COMPLETE 2026-09-19**
- [x] Global filter bar — Period, Branch, Division, Currency — in React context above the router, persisting across page and tab changes, nothing persisted to storage
- [x] Filters folded into seed and magnitudes (built in Phase 2, wired through every page here)
- [x] Active filter state in words in the as-of strip (`Last 12M · Basra`)
- [x] `GeoMap` click → branch filter, click again to clear, selected branch drawn in navy
- [x] `⌘K` / `Ctrl+K` command palette over all 163 by id, title, section or description
- [x] `/catalogue` — search incl. method text, filters by page/section/chart/refresh, table + thumbnail grid, visible count
- [x] Exit gate: every filter visibly changes every chart; §15 beats 6–7 perform

**Verification:** `npm run verify` — 141 checks, all pass. `npm run build` clean.
In the browser, with geometry fingerprinting of all 78 Retail panels:

| Check | Result |
|---|---|
| Branch / Division / Currency | **77 of 78 panels change**; the 78th (R-17) changes its stated basis — see §2.15 |
| Period 12M→24M | 22 time-series panels widen; point-in-time charts correctly unchanged |
| Palette | opens on ⌘K and Ctrl+K, finds by id (`R-17`) and by text (`concentration` → 7 ranked hits), Escape closes, Enter navigates |
| Catalogue | 163 rows; `concentration` → 9; Retail → 54; Retail + GeoMap → 3; Bank-Wide Capital → 4; Daily → 6 |
| Catalogue grid | **163 thumbnails in 634ms**, none blank |
| Console | **0 errors, 0 warnings** throughout |

`Placeholder.tsx` is deleted — every route is now a real page.

### Phase 9 — Motion  — **COMPLETE 2026-09-20**

Three things were built and two kept. What survives is a **card reveal on scroll** and
the **Executive arrival**; the filter transition was rejected on review.

- [x] **Card reveal on scroll — kept.** Each card fades and rises 12px over 420ms as it comes into frame, once. The motion is on the **card**, never on the chart's marks, which is what makes it work across all 23 component types — see §2.19
- [x] **Executive arrival — kept.** The position sentence and hero figure, 520ms, once per session
- [x] **Filter transition — rejected.** §2.18
- [x] Charts themselves never animate, on mount or on change
- [x] `prefers-reduced-motion` honoured; `MOTION_ENABLED` removes all of it

**Measured after the reveal landed:** Retail mounts in 406ms, tab switch 17ms
(unchanged), and a full 17,800px scroll produces a single 64ms long task. The reveal is
compositor-only — one opacity and one transform on a wrapper — and is naturally
rate-limited by scroll position, so it never animates more than a screenful at once.

Both options were built so they could be judged on screen rather than described. The
owner reviewed them and kept one.

- [x] **Executive arrival — kept.** The position sentence and the hero figure rise and fade over 520ms, **once per session**, on that screen only. Verified at the moment of DOM insertion: the class is present and opacity is 0, so it fades in rather than flashing. 0 on return
- [x] **Filter transition — built, reviewed, removed.** See §2.18 for what it cost and why it was the wrong trade
- [x] Charts never animate — not on mount, not on change
- [x] `prefers-reduced-motion` honoured; `MOTION_ENABLED` removes the arrival too
- [x] Gate asserts all 11 Recharts components have animation off, that `CHART_ANIMATION` is `false` so none can opt back in, and that no chart carries a transition

**After removal:** a filter change on Retail is a single 416ms re-render with no
interpolation on top. Charts snap together rather than some gliding and some jumping —
which was the stronger objection of the two.

### Phase 8 — Design pass  — **COMPLETE 2026-09-20**

Commissioned after the build was working, on the brief that it felt soulless. The
diagnosis was that it reported numbers without ever saying anything about them. Palette
kept unchanged at the owner's direction.

- [x] **Findings layer** — every card states what its numbers are *doing*, in one line, computed from the rendered data so it cannot contradict the chart (`finding.ts`, 15 shape-specific writers)
- [x] **"Info — how to read this"** expander on every card, above the calculation note: how the marks encode the data, and what to look for (`chartGuide.ts`, 23 components + variant overrides)
- [x] **RTB logo** in the top bar, inlined at 2.3KB so nothing is fetched at runtime
- [x] **Hierarchy** — lead cards for the 36 demo-path insights: larger title, larger finding, navy rule, taller chart, and a second column where the chart uses it
- [x] **Chrome reduction** — cards are white panels under a hairline, not boxes; KPI tiles lost their nested borders; section headings promoted to navy h1 with a rule
- [x] **Hero band** — the position stated in a sentence, then one dominant number at 56px with three supporting
- [x] **Attention lede** — a ranked editorial block, lead statement at h1, replacing four pale-amber pills that read as form validation
- [x] **Craft** — tabular lining numerals globally, pluralisation, reading order inside the card

**Verification:** `npm run verify` — 151 checks, all pass. `npm run build` clean.
Largest vertical gap on every page down to 84px. All 14 KPI sidecars now agree with
their chart.

**Not done, deliberately:** the palette (kept), and the "bank identity" item from the
original proposal beyond the logo and the as-at treatment.

### Phase 7 — Demo polish  — **COMPLETE 2026-09-19**
- [x] Attention-strip copy derived from the fixture and recomputed under active filters
- [x] Print stylesheet — cards do not break across pages, charts print on white, chrome hidden
- [x] `README.md` leading with the synthetic-data statement
- [x] Footer carries the standing "Demonstration build — synthetic data" line
- [x] 1280×800 and 1920×1080, no horizontal scrollbar — **two real defects found and fixed**, see §2.16
- [x] Keyboard: tab order follows visual order, Escape closes the palette, ⌘K focuses the input
- [x] Glyph check — all 17 non-ASCII characters render in the system stack, none as tofu
- [x] Offline verification on the production build
- [x] Walked all 36 demo-path insights
- [x] Exit gate: PRD §17 definition of done, every line

**Verification, all on the production build (`vite preview`), not the dev server:**

| PRD §17 line | Result |
|---|---|
| `npm install && npm run dev` works with no manual steps | ✅ |
| All 163 insights render; no placeholders | ✅ 163 cards, 236 panels, 0 missing renderers, 0 empty, 0 generic labels, 0 NaN |
| No console errors on the demo path | ✅ **0 errors, 0 warnings** across every route and all 36 demo-path insights |
| Runs fully offline | ✅ the bundle makes **exactly 3 requests**, all local |
| Every colour from `tokens.ts`; every number through `format.ts` | ✅ enforced by `verify:tokens` |
| §15 demo script performs end to end at 1920×1080 | ✅ all 7 beats |
| `README.md` states the data is synthetic in its first paragraph | ✅ |

**Demo script (§15), beat by beat:** headline band reads 5.24T / 4.12T / 6.0B / 18.4% ·
E-02 shows two gauges against target · the attention strip links to R-43 and lands on it ·
Retail shows 54 insights and 8 tabs, all seven switching in ~20ms · R-17's Lorenz shows
both anchors · the branch filter reaches the as-of strip · the catalogue states
"163 insights across 4 pages and 30 sections".

### Phase 10 — Generate Insights  — **COMPLETE 2026-09-21**
- [x] `GeneratedInsight` / `Finding` / `Action` types, with the word caps stated in the doc comment — `data/generatedInsight.ts`
- [x] `local` provider — a `ChartData` visitor, 15 cases, deterministic, filter-aware, built on the same `panelsFor` call the card drew; `figures.ts` extracted so it and `finding.ts` share one arithmetic
- [x] `live` provider behind `VITE_INSIGHTS_PROVIDER`, with an 8s timeout, response validation against the same caps, and fallback to `local` that states itself in one line
- [x] `GenerateInsightsButton` — a filled `accent` CTA at the bottom-right of the chart, on section cards, report blocks and the detail page; 36px tall at the `card` radius, which is the brand's own button ratio (§2.29)
- [x] Non-modal side panel — no scrim, page shifts rather than being covered, chart stays interactive; bottom-docked below 1280px; anchored to the **measured** bottom of the sticky chrome rather than to `--header-h`, so it clears the section tab bar and the banner in every scroll state (§2.29)
- [x] Determinate progress bar with named stages; holds at 90% under `live` until the response lands; reduced-motion variant steps rather than glides
- [x] Panel body — four beats, `Badge` tones for verdict, Escape closes, focus never leaves the opener, no focus trap
- [x] Regenerate on filter change — debounced 400ms, in-flight run aborted and late responses discarded, bar restarts, scope restated on the panel face
- [x] `npm run verify:insights` — all 163 under four selections: no throw, findings carrying a figure, ≥1 action, caps respected
- [x] Exit gate: chart visible and interactive with the panel open at both demo resolutions; no reading outlives the filter state it was generated for

**Verification:** `npm run verify` — **378 checks across five gates, 0 failures** (up from 366
across four). `npm run build` clean. In the browser, measured rather than looked at:

| Check | Result |
|---|---|
| Button coverage | 8 of 8 on Executive, **54 of 54 on Retail**, on the detail page and on a report block |
| Panel vs card, 1920×1080 | panel at x=1521 w=384; E-02 ends at x=733 — **no overlap**, `elementFromPoint` at the card centre lands inside the chart |
| Panel vs card, 1280×800 | panel at x=881; card ends at x=413; **no horizontal scrollbar** (body 1265 of 1280) |
| Panel top | 42px, exactly `--header-h` — the filter bar stays visible and reachable, which is the point of a non-modal panel |
| Docked below 1280 | bottom half, full width, card scrolled above it; chart fully clear of the panel edge |
| Filter change | at +520ms: bar at 48%, stage "Comparing against plan"; on landing, scope `Last 12 months · Basra` matching the as-of strip, headline 16bp → 1.5pp |
| Three changes inside one debounce | **one regeneration**, settling on the last (`Mosul · Retail · USD`), with no flash of a superseded reading |
| Report block | opens against the block's own view; changing the report header re-syncs it to `Last 12 months · Najaf` |
| Escape | closes; focus stays on the button that opened it; chart state untouched |
| Console | **0 errors** from the application on Executive, Retail, the detail page and a report |

`scroll-mt` was added to the card while checking this: `scrollIntoView` was landing the card
under the sticky bar. That also fixes `#E-02` deep links, which had the same defect.

**Not verified:** the offline walk — see §2.27.

---

## 6b. Custom reports — build order

| Phase | Carries | Est. | State |
|---|---|---|---|
| **A** | Model, the pure editing functions, scope resolution with exemptions, base64url share link, gate | 1d | **Complete** |
| **B** | Registry adapter over the catalogue, plus every block exercised under awkward scopes | 0.5d | **Complete** |
| **C** | `/reports/:id`: header, editable title, packed grid, scope chips, delete; `/reports` index; share-link landing | 2d | **Complete** |
| **D** | Picker drawer with a schematic per row, reusing the palette's search | 1d | **Complete** |
| **E** | The one ⋮ menu: scope, rename, duplicate, move, remove, CSV | 1.5d | **Complete** |
| **F** | Reorder: HTML5 drag from a handle onto `moveBlock`, plus the arrow keys | 0.5d | **Complete** |
| **G** | Nav: `Reports` item, capped rail, overflow link | 0.5d | **Complete** |
| **H** | Export: copy link, print rules for chips (generic CSV landed in E) | 1d | **Complete** |

**Phase H — complete, and with it the whole feature.** `ShareLink.tsx`, `shareWeight` in
`share.ts`, the print rules in `index.css`.

**Copy link, with a real failure path.** Copying is the closest thing this product has to
saving (R1), so a swallowed promise would look like a broken button and lose the report.
When the clipboard is refused the reader gets the URL in a field they can select by hand.
That path is not hypothetical: it is the one that ran during testing, because the browser pane
used for verification denies clipboard permission outright. The success path is therefore
**unverified in this environment** — which is precisely why the fallback exists.

**The link's length is a correctness property, not a nicety.** The link is the only copy of a
report, and mail clients and chat windows cut long URLs — Outlook has broken them near 2,000
characters for years. Measured: a plain forty-block report is about 550 characters, but a
per-block slice *and* title on every block reaches 2,044 at twelve blocks and 6,449 at forty.
So the page warns past 2,000 and **names what is making it long**, since the overrides are the
part that dominates and the reader can act on that.

Print: see §2.22 for the two defects this phase turned up, both of which made the printed page
less honest than the screen.

`npm run verify:reports` — 204 checks. Whole chain: **359 PASS across four gates, 0
failures.**

---

**The feature is done.** `src/reports/` is model, scope, share, catalogue, layout and csv —
all pure, no React, no storage — with the page, card, picker, menu and rail on top of it. The
PRD does not describe any of it; it is recorded here in §3b and §6b, and would be a v1.3 if
the two documents are to agree again.

**Phase G — complete.** `ReportRail.tsx`, a live count on the nav item, `railSlice` in
`reports/layout.ts`.

**The rail renders nothing until there is something to show.** Reports are session-only, so a
fresh demo has none and the header is byte-for-byte what it was before this feature existed —
no empty rail, no fourth row of chrome above 163 insights. Measured: 145px header and no rail
at zero reports. The row appears with the first report, which is also the moment it earns a
permanent place.

**A rail rather than a dropdown on the nav item.** A dropdown hides the feature, and half the
point of putting reports in the header is that a presenter can show they exist. The cost is
width, which is what the cap is for: four, most recently edited first — so the report in hand
leads — then `+N more` to the index.

Two places a zero was suppressed rather than shown. The nav item's count is the only count in
that bar that moves, so it is read per render and **left off entirely at zero** instead of
displaying `Reports 0`; and a report with no blocks shows no block count in the rail. A `0`
there is not information, it is an invitation to ask why.

`railSlice` is a function because `hidden` is an off-by-one waiting to happen: `length - CAP`
is wrong the moment there are fewer reports than the cap, and it renders as `+-2 more` rather
than failing.

Verified at 1280x800, the narrow target from PRD §2: six reports with one deliberately
84-character name and one in Arabic — the long one truncates at 15rem, `+2 more` appears, the
nav reads `Reports 6`, the current report is highlighted in the rail, and **the page does not
scroll sideways** (scrollWidth 1280 against clientWidth 1280). Zero console errors.

`npm run verify:reports` — 189 checks. Whole chain: **344 PASS across four gates, 0
failures.**

Phase H next, and last — copy link and the print rules, about a day.

**Phase F — complete.** `dropTargetIndex` and `edgeFor` in `reports/layout.ts`, a handle on
the card, drag state on the page.

**`draggable` is on the handle, not the card.** On the card, selecting a figure to copy or
dragging across a chart would start a reorder — and a report is something people read and
quote from far more often than they rearrange. Verified: the four handles are the only
draggable elements on the page.

**The handle answers the arrow keys too.** HTML5 drag is mouse-only — it does not fire for
touch at all and has no keyboard equivalent. Without this, reordering would be reachable only
through the ⋮ menu: it works, but it is three interactions deep for something the mouse does
in one.

**The off-by-one is a function with a gate, not three lines in a drop handler.** `moveBlock`
splices the block out and then back in, so its target is an index in the array *after*
removal — while a drop names a position in the array the reader is looking at, which still
contains the block being moved. Every index at or past the origin has shifted down by one.
Getting it wrong is not a crash: it drops the block one place short of where the reader aimed,
in one direction only, which reads as a laggy interface rather than as a bug. Sixteen checks,
and the drop ones drive the *same two steps the page does* and assert the resulting order —
checking the index alone would pass with the off-by-one still in place, because the error is
in how the index relates to `moveBlock`, not in the index itself.

`edgeFor` takes the writing direction from the element rather than assuming it. The shell uses
logical properties throughout for the Arabic in PRD §9, and under RTL the leading edge is on
the right — a hardcoded `x < midpoint` would invert every drop, silently, and only for readers
using the language the bank actually operates in.

**The insertion line is drawn on the target, not by moving the cards.** Shuffling a grid of
charts under the pointer would rebuild Recharts trees on every mouse move; a 2px rule says
where the block will land just as clearly. Measured: after twelve `dragover` events the chart
`<svg>` node in the target card is the **identical node** — the drag re-renders card frames
and rebuilds nothing, which is the A5 memoisation holding.

Verified on screen: dragging the last block onto the first card's leading half detected
`before` and landed it first; onto a far side it landed after; dragging onto itself shows no
indicator and changes nothing; a cancelled drag clears the dim and the indicator; and the
arrow keys walk a block up one position per press. Zero console errors.

`npm run verify:reports` — 182 checks. Whole chain: **337 PASS across four gates, 0
failures.**

Phase G next — the nav rail, about half a day.

**Phase E — complete.** `BlockMenu.tsx` and `csv.ts`.

**One menu, not a toolbar.** Six controls on the face of a card is a toolbar, and a report
of twelve blocks then carries seventy-two of them — the page stops reading as a document and
starts reading as an editor. The card shows the block; the menu holds the verbs. No backdrop
behind it either: a backdrop would stop the reader scrolling to the block they were
comparing against. Click-outside and Escape close it.

**The slice editor makes "Same as page" a real state**, distinct from picking whatever the
page happens to show — the page's selection moves, and an inheriting block moves with it
while a pinned one does not. The model keeps that distinction by deleting the key, so the
Apply button passes `undefined` rather than `{}`. A dimension the block compares across is
**disabled and says why**; offering a branch selector on a block that will ignore it is
offering a control that does nothing. Verified on screen for R-17.

**CSV came forward from Phase H**, because a menu item that does nothing is worse than no
menu item. One writer over the fifteen shapes covers all 163 blocks and stays covering them
when a 164th arrives — the spec's per-block `csv` would mean an exporter per block and
remembering to add one each time.

**I8 is structural, not observed.** The export is built *in the card*, from the same
`seriesFor(id, panel, view)` the charts above it were handed. It is deliberately not passed
down from the page, which would mean resolving the scope a second time — exactly the second
query I8 exists to forbid. There is nothing to drift, and no way to export a slice that was
never on screen.

Three decisions in the writer worth keeping:

- **Long, tidy tables** rather than the chart's own layout, because the thing a reader does
  with this is pivot it. A column per series looks closer to the chart and is worse to work
  with.
- **Formula injection is defused.** Excel and Sheets read a leading `=`, `+`, `-` or `@` as
  the start of a formula, so a label beginning with a minus sign opens as `#NAME?` at best
  and in the general case runs whatever the text says. Those fields get an apostrophe.
- **The file says what slice it is** — insight, slice, as-of date, and the synthetic-data
  statement. A CSV that leaves the building with no record of its period, branch, division
  and currency is a column of numbers somebody will later read as the whole bank.

A UTF-8 BOM and CRLF, both required for Excel to read the Arabic that PRD §9 anticipates.
Confirmed in the browser by reading the bytes the browser was actually handed: `EF BB BF`
then `Fie…`. (`Blob.text()` strips the BOM, so reading it as text cannot see it — the first
check looked like a failure and was not.)

Verified end to end on screen: Move up disabled on the first block; Branch disabled with its
reason on R-17; applying `24M` + `USD` producing exactly two chips; a title trimmed with the
insight's own name kept underneath; Duplicate landing adjacent; Remove taking exactly one of
two identical copies; and R-01's two-panel export in which **the KPI sidecar's 31,881 matches
the last point of the primary series exactly** — an independent confirmation of the §2 fix
that made sidecars read `ctx.primary`. Zero console errors throughout.

`npm run verify:reports` — 166 checks. Whole chain: **321 PASS across four gates, 0
failures.**

Phase F next — reordering by drag, about half a day. The menu's Move up/down already covers
the keyboard case, which is the one a drag cannot serve.

**Phase D — complete.** `BlockPicker.tsx` and `ShapeGlyph.tsx`. The interim grouped
`<select>` from Phase C is gone.

**A drawer, not a centred modal.** The reader's question while picking is "what goes next
to what I already have", and a modal answers it by covering the answer up. The drawer
leaves the report on screen — which is also why **it does not close on add**: picking four
blocks is the normal case, and a picker that shuts after each one turns that into four
round trips. A tick appears on the row for a moment instead, because a block whose card
lands below the fold otherwise gives no sign anything happened.

**A schematic per row, not a preview.** A real preview means building that block's data for
every row in a list of 163. At 28x18px all anyone reads is the *form* — bars, a line, a
ring, a map — which is exactly the question being asked. One glyph per **data shape**, so
fifteen cover all 163, and `Record<ChartShape, ReactNode>` makes tsc the exhaustiveness
gate. The marks are fixed: drawn from live data they would move when the filters moved and
the list would flicker as somebody typed. Verified on screen — 163 rows, 163 glyphs, all
15 shapes present and none empty.

Search is `searchBlocks` from Phase B, the same scoring the ⌘K palette uses. "You use
these" comes from `blockUsage` across the reader's own reports, not a separate
recently-used list that would eventually disagree with the reports themselves. A block
already on the report says `on the report ×2` rather than being disabled — the same insight
at two slices is the point of per-block scope (I7).

Two accessibility defects found and fixed before shipping, both by keyboard testing rather
than by looking:

- **Focus was lost on close**, landing on `<body>`. Returning it to whatever was focused
  before was not enough: the opener inside the *empty* state is removed by the first added
  block, and focusing a detached node silently does nothing. Now `isConnected` is tested
  and a `[data-picker-opener]` on the page is the fallback. Verified in both cases.
- **`aria-modal="true"` was a false promise.** It tells a screen reader nothing outside the
  panel is reachable, while Tab walked straight out into the report behind. There is now a
  Tab trap, verified wrapping in both directions.

Phase E next — the one ⋮ menu that carries scope, rename, duplicate, move, remove and CSV.

**Phase C — complete.** `/reports` and `/reports/:id`, plus the share-link landing.

`ReportsContext` holds reports in React state above the router, so a report survives
navigating away to look something up. It does not survive a refresh, and **both pages say
so in one plain sentence** rather than letting a reader find out by losing work — which is
the honest form of R1, where the link is the save button.

The card body is now **shared, not copied**: `InsightBody` carries the panels, the sidecar
rule and the two disclosures, and `InsightCard` and `ReportBlockCard` each add their own
header. A second copy would have drifted, and the copy that drifts is always the one fewer
people look at.

What a report card adds: scope chips (I3, and see §2.21), a title the reader can set with
the insight's own title kept underneath it, a struck chip plus a footnote sentence for any
dimension the block ignores, and an X that appears on hover. A block id this build does not
know renders a card naming the id and offering to remove it — silently dropping it would
mean the report quietly differs from the one that was sent.

Packing reuses the section pages' rule through `toBlockRows`, so a block sits at the width
its reader is used to. The share-link landing decodes into a fresh copy, strips `?r=` so a
back navigation cannot re-import, and guards the import with a ref — without it StrictMode's
double-invoked effect produces two identical reports.

Verified in the browser end to end: four starters of four shapes; packing observed as
`E-01+E-02 | G-12 | R-17`; an Arabic report name surviving the round trip; `X-99` rendering
the unknown-block card; a corrupt payload showing the unreadable-link notice with the
existing reports untouched; and **zero console errors** across three branch changes,
division, currency, add, remove and delete.

`npm run verify:reports` — 136 checks. Whole chain: **291 PASS across four gates, 0 failures.**

Phase D replaces the interim grouped `<select>` adder with the picker drawer. The nav item
exists; Phase G gives it the rail of the reader's own reports.

**Phase B — complete.** `src/reports/catalogue.ts`. The registry is *derived*, not
hand-written: the supplied spec warns that building its 21-block registry "looks small and
is not", because each block had to be lifted off the page it lived on and rewritten as a
pure function. Here that was already true — an insight is already a named finding with a
chart, a lead line and a footnote, and `seriesFor` is already the pure `(view) => data` a
registry needs. So `BlockDef` *describes* a block and nothing in the file renders.

Mapped onto what already exists rather than duplicated: `width` from the same `cardSpan()`
the section pages pack with, `shape` from `shapeFor()` for the picker's schematic,
`section` from `sectionOf()`, `exempt` from `exemptionsFor()`. Grouped by **layer**, four
groups, with each row naming its own section — the spec groups 21 blocks into eight, but
thirty groups for 163 would be a directory rather than a menu, so search does the
narrowing. Four starters of four different shapes; the branch-network block that stood
there first was swapped out because it draws as a ranked bar, which is what the
concentration block already is.

The section that earned its keep: **every block built under four deliberately thin
scopes**, the tightest being about three thousandths of one percent of the bank. 944 panel
builds, checked for throws, NaN, empty arrays, all-zero collapse and bridge closure. It
found the two shipped waterfall defects recorded in §2.20. One block, G-45, reports about
one new account a month at the tightest scope; that is truthful for a slice that thin and
the I3 chips explain it, so the data was left alone.

`npm run verify:reports` — 108 checks (55 from Phase A, 53 new). Whole chain: **263 PASS
 across four gates, 0 failures.**

**Phase A — complete.** `src/reports/{model,scope,share}.ts`, no React, no storage.
`npm run verify:reports` — 55 checks covering every invariant the spec names:
`scope`/`title` **deleted rather than set to undefined**, `{}` never stored, duplicate
landing beside its original with title and scope, `moveBlock` clamped and no-op,
strictly-increasing timestamps so `byRecency` cannot tie, replace-not-merge (I7), the
exemption pipeline in the right order (I6), chips in the reader's words (I3), and a share
link that round-trips an Arabic name and returns `null` on truncation rather than
building half a report.

**Where this beats the supplied spec:** its `BlockDef` carries an optional per-block
`csv`. Because `ChartData` here is a discriminated union of 15 shapes, one generic writer
covers all 163 blocks in 15 cases — and I8 ("CSV over the same view the panel drew")
comes free, since both read the same `seriesFor` call.

---

## 7. Schedule and fallbacks

| Phase | Estimate | Cumulative | Demonstrable at this point |
|---|---|---|---|
| 0 | 0.5 d | 0.5 d | Shell, navigation, banner |
| 1 | 1.0 d | 1.5 d | — (internal) |
| 2 | 1.0 d | 2.5 d | — (internal) |
| 3 | 1.5 d | 4.0 d | **`/executive` — a presentable demo on its own** |
| 4 | 2.5 d | 6.5 d | Full chart library via `/dev/gallery` |
| 5 | 2.0 d | 8.5 d | **All 163 insights, all 4 pages — the scale story** |
| 6 | 1.0 d | 9.5 d | Filters, palette, catalogue — the full §15 script |
| 7 | 1.0 d | 10.5 d | Ship |
| 10 | 1.5 d | 12.0 d | **Generate Insights on every card — offline by default** |

**Fallbacks, in the order to reach for them:**

1. **Cut the 6 non-demo-path components** in Phase 4 (§5 scope lever) — saves
   ~0.7 d, costs the "all 163 render" gate.
2. **Ship at Phase 5** — no filters, no palette, no catalogue. Loses §15 beats 6
   and 7, which are two of seven.
3. **Ship at Phase 3** — Executive only, ~4 days. Beats 1–3 of the script. This is
   the floor, and it is still a working artifact rather than a slide.

Phases 1 and 2 are the only ones with nothing to show. They are also the ones that
decide whether a CFO believes the numbers, so they do not compress.
