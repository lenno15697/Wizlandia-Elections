# Wizlandia Election Simulator

A standalone GitHub Pages election website inspired by the sidebar, parliament diagram, party cards and result tabs of [ThermidorElections](https://consuldelmar.github.io/ThermidorElections/). The interface and source here are a new implementation. No code or assets from the reference site are included.

## Batch draw sequence fix

Repeated **Draw 20 elections** clicks now continue the current random-generator sequence. Previously, every batch constructed a new generator from the visible seed, replaying the same elections and producing the same final Senate. Single random draws and batches now share one continuing sequence. Changing the seed explicitly restarts its reproducible sequence; saving/loading a configuration preserves the current generator position.

Replace **app.js** and **index.html** when upgrading. The default 60/50/10 Senate History remains unchanged. All 15 JavaScript test suites pass, including the new repeated-batch, grouped-draw, single/batch interleaving, saved-configuration and explicit-reseed checks. A browser run with seed 20261030 matched the reference stream across three consecutive batches: LDP/CA/CON 57/55/8, 62/50/8, then 64/48/8.

Each election advances two years, so 20 elections span 40 years. The current Senate retains the ten latest cohorts, representing 20 years.

## Latest Senate History initialization

The default starting Senate is now **LDP 60, CA 50, CON 10**. Its ten cohorts are generated from coherent moderate national election swings, retaining the year-0 baseline, persistent state strongholds and plausible marginal-state changes. The chosen history includes one extra Conservative win in Laxburg and one CA win in Illixium. Future random draws and all election mechanics are unchanged.

Replace **senate.js** and **index.html** when upgrading from the previous ZIP. Reload or Reset to use the new defaults. Details, all state-by-state checkmarks and reproducible checks are in **analysis/senate_history_initialization.md**, the adjacent CSV/JSON files, and **tools/verify_senate_history.js**. Saved configurations keep their recorded history.

## Retained Senate permutations and History labels

All three additional swaps are applied: **NX-43 ↔ AX-49**, **NX-95 ↔ ET-32**, and **QL-10 ↔ WT-10**. These compose with the earlier LQ-13/EW-24 swap and all prior changes. The district permutation audit is version 11.

Senate History recalculates every default checkmark using the unchanged historical shock settings and the new map. The geographic recalculation initially produced LDP 56, CA 54, CON 10. The separate latest History initialization above now sets the requested 60/50/10 composition. Party row labels use **LDP • Liberal Democratic Party**, with normal capitalization and spacing. Narrow screens show the abbreviation and colour dot.

Ten million election draws confirm long-run means of **LDP 60.32, CA 50.76, CON 8.92**. The fixed starting history is a particular historical scenario and differs from these random-election averages. See **analysis/senate_three_swaps_update.md**, the associated JSON/CSV results, and **tools/verify_three_senate_swaps.js**. Earlier Senate reports describe their recorded earlier map versions.

If upgrading from the previous ZIP, replace **app.js**, **district-geography.js**, **styles.css**, and **index.html**. The JSON/CSV register and audits are also updated. The compact Senate hemicycle and east-to-west state selector order are retained.

## Senate elections and calendar

The former **Combined** upper tab is now **Assembly**. The upper tabs are
Assembly → Electoral Districts → PR List → Senate → Senators by state → Senate election.
The Assembly retains the same 800-seat model and PR calculations.

**Deploy this update:** add **senate.js**, and replace **app.js**, **engine.js**,
**index.html** and **styles.css**. Keep all other existing website assets.
The HTML uses content-versioned URLs, including for the new Senate module.

### Assembly shortcuts and Senate overview

**Random election** is the left mode tab and is selected on startup and Reset. **Set shifts** remains available on the right; moving a slider switches to that mode.

The controls include **Next Assembly election** in Set shifts mode and **Draw next Assembly** in Random election mode. They advance one election from an odd counter or two elections from an even counter, always finishing on an Assembly + Senate election. Intervening Senate-only elections are recorded in History and age the Senate cohorts normally. Random mode consumes a separate draw for each election and continues the existing seeded sequence.

The Senate Overview’s **Δ** column is the latest incoming cohort minus the cohort it replaced. The outgoing winners are retained through previews, History navigation and configuration save/load. The baseline, and older configurations without an outgoing cohort, show a dash until the next election. The ten serving cohorts and the default 60/50/10 Senate remain unchanged. The Overview’s national total column is labelled **Assembly**.

The “Next: election…” line is separate, larger and bold. The compact Senate hemicycle’s majority count and label sit lower in the central opening, in line with the Assembly’s proportions. The Senate election description uses Ranked Pairs terminology.

### Two-year steps

The baseline is **election 1**. **Next election (+2y)** advances two years using
the current shifts; **Draw next** advances with a fresh seeded shock.
**Even counters (2, 4, …) elect Assembly and Senate. Odd counters (1, 3, …)
elect only the Senate.** The initial baseline Assembly is held in election 1.

The shared sliders preview the displayed election. On Senate-only steps, all
Assembly results, district winners, national PR votes/seats and the Districts
Median Position plot stay at the last Assembly election. Grey vertical marks
on all three controls show those Assembly settings. Even party-position edits
leave the stored Assembly unchanged on a Senate-only step.

Each new election ages the Senate cohorts once. Slider adjustments preview the
current year-0 cohort without aging or recalculating older cohorts. The current
saved History entry tracks these previews. Selecting an earlier run restores
both chambers and the controls; the next election branches from that point.
Reset restores both chambers, the initial history and counter 1.

Batch draws now generate consecutive two-year elections, applying the same
alternation. Economic, cultural and variance shocks retain their original
independent distributions. Saving/loading a configuration preserves both
chambers, the counter, manual Senate edits and the random generator's position.
Original format-1 configurations remain supported; format 2 adds the calendar.
Export a configuration before refreshing to retain a Senate scenario.

### Statewide election rule and terms

For each state, take the **separate medians** of its districts' current economic
and cultural positions. Every district has equal weight; population does not
weight this calculation. With an even number of districts, average the two
middle values on each axis. Elect the nearest model party, i.e. the party whose
Voronoi region contains that position. Exact ties follow the fixed party display
order. The state medians include existing permutations, district offsets,
economic compression, current shifts and variance. Compass-only party display
coordinates never enter this calculation.

Each state elects one senator every two years for a **20-year term**. Its ten
serving senators were elected in relative years **0, −2, …, −18**. Advancing
moves each cohort back two years and drops −18, keeping **120 seats** in the
Senate, ten per state, and a **61-seat majority**.

The Senate hemicycle uses six compact arcs and larger dots. Both Senate map views list state selectors in the requested order: EX, EW, NX, AX, ET, KR, QL, AK, LQ, IL, LX, WT. Assembly diagram geometry and other state lists retain their existing configuration.

### Senate views

- **Senate:** uses the existing hemicycle/Westminster layouts, party cards,
  selection and square-root seat-share compass sizing, with 120 serving seats.
  The Overview distinguishes current Senate stock from the 12 latest winners;
  no national Senate vote share is invented.
- **Senators by state:** merges the existing hex geography into state shapes,
  removes internal district hexes and retains black state boundaries. Select
  any state (including either part of Kroana) to list its ten senators by party,
  ordered newest first from 0 to −18. Abbreviation buttons support selection too.
- **Senate election:** colours the same state shapes by the latest year-0 winners.
  Select a state to inspect its winner and current median coordinates.
- **Senate History**, after Districts Median Position: ten horizontal year tabs
  each contain the requested party-by-state checkmark table. Choose exactly one
  party per state/year; selecting a replacement clears the previous checkmark.
  Edits immediately affect Senate totals and lists. Slider changes recalculate
  year 0; older manual edits remain until that cohort expires.

The initial year-0 result is **LDP 6, CA 5, CON 1**. Older default cohorts are
illustrative elections calculated from fixed plausible national swings and each
state's own median, retaining strongholds and allowing marginal states to switch.
These are fictional defaults, not factual historical results. The initial
120-seat Senate is **LDP 60, CA 50, CON 10**. All assignments are editable.

Both state maps have SVG exports; Senate History exports a 10-cohort CSV.
Result/history CSV exports include both chambers and distinguish the current
shifts from the held Assembly settings. Run `node --test tests/*.test.js` for
all 14 suites. Tests cover medians, tie handling, 25 cohort rollovers, fixed
Assembly results, checkmarks, maps, configuration/RNG round trips, history
branching and batches. All 58 existing model reference scenarios still pass.

## Current model and interface

The Overview table shows Party, Ideology, Assembly, Electoral Districts, PR List, Vote share and Representation, in that order. Party ideology labels are presentation only. Representation bars compare national vote share with seat share in the selected component.


The **Compass** tab is a party-bubble compass inspired by Thermidor's presentation.
Party coordinates retain their Wizlandia economic and cultural meanings. Circle
radius follows `6 + 60 × sqrt(party seats / total seats)` using the selected
component: total seats is 800 for Assembly, 120 for Senate, 12 for the latest Senate cohort, and 400 for Electoral Districts or
PR List. Equal seat shares therefore have equal dot sizes across views. The
coefficient preserves the previous scale for the 400-seat component views.
The zero-seat marker has radius 6; every party with seats adds a positive
square-root contribution above that minimum.
Zero-seat parties retain hollow markers. Bubble
clicks, keyboard activation, seat cards and sidebar parties all use the same
selection, including coalition highlights and fading. Both party-compass axes
range from −10 to +10. SVG export is available.

Only the Compass tab displays CA at `(0.00, 0.00)`, NF at `(-1.00, 8.00)`,
SWP at `(-9.00, -7.50)` and SDP at `(-4.00, -1.50)`. These presentation-only
coordinates never enter election calculations, saved configurations or the
Districts Median Position plot. The model retains CA `(0.00, -0.50)`, NF
`(0.00, 8.00)`, SWP `(-9.50, -8.00)` and SDP `(-3.50, -1.50)`, with its
original calibrated results.

The former compass has moved unchanged to **Districts Median Position**, after
History. It retains the density overlay and contours, all 400 district medians,
party crosses, national median star, density/district controls and hover details.


Within-type variation is fixed at **0.20**. The variation slider is removed, and loading an older configuration cannot override this setting. The economic, cultural and variance-multiplier sliders remain available. The existing party-boundary caps still apply, so 0.20 is a maximum offset rather than the standard deviation of every type.

The **Electoral Districts** view displays the 400-seat cartogram in place of the Assembly diagram. Assembly retains its diagram. PR List instead shows a vertical chart of national vote shares, using the fixed left-to-right party order, original party colours and percentage labels on the y-axis. The chart updates with the election, supports dark mode and exports as SVG. The separate lower Cartogram tab has been removed. All states shows nationwide district seat totals for every party that won a seat. Selecting a state zooms the map and shows that state’s winning-party totals instead. Both summaries use the current election, ordered by seats won. In both the individual state results and the Nationwide cartogram summary, equal district-seat totals are ordered by nationwide Combined seats (district + PR); any remaining tie uses the fixed left-to-right party order. All other party lists retain their existing ordering. Each state’s results sit to the left of its map on wide screens, with the map shifted right; smaller screens stack the results above the map. Individual state cartograms render at two-thirds of their previous width and height. The nationwide cartogram remains its original size. District type family mode includes a labelled colour key for all five families, on both nationwide and individual state maps. Colour by current winner, type family or state; click a tile for its ID, locality and full type name.

The Extary–Erewen border follows the ten marked tiles: five move into Extary's schematic territory and five into Erewen's. Their entitlements remain 30 and 60. Every one of the 49 named cities now has one connected group of tiles, including cities spanning two states. KR-22 is assigned to Davenport on its own island, rather than the capital across the strait. All 50 type counts, individual offsets, district populations and underlying geographic polygons are preserved.

The sidebar heading is “Explore Wizlandia’s elections.” The two requested explanatory paragraphs are removed. Batch size defaults to **10** elections; saved configurations can still specify another batch size.

Upload all top-level HTML, CSS, JS and SVG website files in this ZIP, including **district-geography.js** and **senate.js**. The JSON and CSV contain the underlying mapping; tests and Python code are optional for hosting.

State apportionment uses the Hare quota and largest remainder on 212 million residents:

| State | Prefix | Districts |
| --- | --- | ---: |
| Neolexia | NX | 98 |
| Erewen | EW | 60 |
| Avax | AX | 57 |
| Ethuarica | ET | 38 |
| Extary | EX | 30 |
| Kroana | KR | 23 |
| Laxburg | LX | 21 |
| Luqur | LQ | 19 |
| Wittaria | WT | 17 |
| Akro | AK | 15 |
| Quelor | QL | 13 |
| Illixium | IL | 9 |
| **Total** | | **400** |

Extary was omitted from the requested prefix list but is a federal state in the notes, so it is retained as EX. Pelagos and New Pelagore are excluded. Ravenna and mainland Pelagore retain the corrected Tier 2 population clusters.

Each district covers land in one state only. Proposed geographic boundaries are drawn from the corrected population-density grid before political types are assigned. They cover all federal land without overlaps. Islands and detached coastal pieces may be combined in maritime districts. Residents per district range from **520,755 to 555,656**, with maximum deviation **0.27%** from each state's mean. Differences in the state means reflect rounding 400 state entitlements. IDs run in a north-to-south sweep, ordered west-to-east within eight-pixel latitude bands.

The geographic permutations preserve all 50 types, their counts and model generation indices. The separate university update below deliberately moves type 8’s economic centre. The original ID is retained as `legacyId`; this also preserves the deterministic tie-breaking order. Type placement is a proposed interpretation of settlement and state economic notes. Finance, technology, shipbuilding, manufacturing, mining and agricultural placements have explicit geographic constraints; other types fit urban structure, state wealth and varied local neighbourhood profiles. These are assumptions, not observed voting patterns. Geographic population is separate from the calibrated nationwide Gaussian PR electorate.

Type 50 is **Upscale waterfront and marina districts**, covering NX-06
(Wizlandia City) and AK-09 (Akropolis). Both use the **Urban core** family
colour (`#246d78`), reflecting waterfront neighbourhoods in major cities.
Only the name and family classification changed; both district compass
positions, the type centre, type count and election calculations are unchanged.

## Compression of the economically liberal district band

The marked economic band is interpreted as **[2.15, 5.75]**, compressed into
**[2.15, 4.75]** using `x_new = 2.15 + (13/18) × (x_old − 2.15)`.
Only the 180 baseline district points inside the source band move. Their
cultural coordinates remain identical; all 220 points outside stay fixed.
Party coordinates, the national voter distribution, PR calculations, baseline
seat totals, geography and previous district permutations are preserved.

Compression happens after the fixed source offsets are generated, before
election-level shifts and variance. It squeezes horizontal offsets as well
as type means, without changing vertical offsets. `data.js` retains those
source definitions as `sourceTypes`; `types` publishes the actual default-spread
means after compression. Two public-employment points straddle the lower
boundary, so that type’s displayed mean is calculated from its transformed
points. The full 0.20 dairy/livestock radius is preserved outside the band.

The green line bounds the baseline positions. Subsequent economic/cultural
shifts and variance can still carry districts outside it. See
`analysis/economic_compression_impact.md` for Libertarian win rates and the
full-domain best-case check; reproduce it with
`python3 tools/analyze_economic_compression.py 100000 20261028`.

## Rural and resource district centres

| District type | Economic centre | Cultural centre | Change |
| --- | ---: | ---: | --- |
| Traditional dairy and livestock | 1.23 | 2.47319 | +0.50 traditional |
| Export wine, orchard and specialty crops | 4.00 | 0.20319 | +0.40 traditional |
| Remote island and fishing communities | 0.52 | 2.46319 | +0.50 liberal |
| Remote mining and extractive | 0.37 | 2.67319 | −0.70 socialist |

The dairy/livestock type now uses the full **0.20 maximum fixed offset**.
The existing boundary-cap rule also allows island/fishing offsets to expand
from about 0.05288 to 0.20 after its shift. The dairy offsets previously reached
about 0.04842. All four updated types now reach 0.20; paired offsets keep their
type means exact. The 0.20 setting measures maximum distance from the type
centre in compass units. The separate election-level variance multiplier is
unchanged. These edits affect 24 district positions, with all type counts,
district identities, geography, baseline seats and national PR inputs preserved.

The university impact report below records the earlier university-only update.
Its analysis script reconstructs that frozen model from the saved input data
so the historical comparison remains reproducible after these later edits.

## University district economic centre

Major university and student districts (type 8, six districts) now have an
economic centre of **−0.05**, matching regional university and college towns
(type 28), instead of −1.94. Their cultural centre remains −3.976810123046975.
Every university district moves +1.89 horizontally at baseline; its paired
offset, cultural position, geographic identity and map tile stay unchanged.

The baseline allocation, national PR electorate, party positions, independent
shock distributions and the other 49 district types are unchanged. The saved
permutation audit uses the updated type-8 coordinates consistently. Earlier
notes below about preserving original type centres describe the geographic
permutations before this model update. See `analysis/university_shift_impact.md`
for the detailed matched-election results and `tools/analyze_university_shift.js`
to reproduce them.

## District type and compass permutations (version 11)

The requested district swaps change **type, full type name, type family, legacy
model ID, compass coordinates and derived baseline winner together**. Each
district retains its geographic ID, state, locality, population and map tile.
All 50 type counts and the complete national set of district positions remain
unchanged, so nationwide district and PR totals are preserved for every model
scenario. State and individual district outcomes can change.

The LQ-16/LQ-18 swap has been reversed. The earlier WT-11/LQ-16 swap
remains in place: WT-11 receives the former LQ-16 profile, LQ-16 receives the
former WT-11 profile, and LQ-18 retains its original profile. The final three
arrows are simultaneous: KR-22 receives the former EW-04 profile, EW-04
receives EW-06, and EW-06 receives KR-22.

The subsequent Neolexia cycle is simultaneous: NX-51 receives the current
NX-53 profile, NX-53 receives NX-44, and NX-44 receives NX-51.

The next cycle transfers the then-current profiles: NX-52 receives NX-35,
NX-41 receives NX-52, and NX-35 receives NX-41. NX-59 and NX-42 exchange
their then-current profiles. This composes with the earlier NX-59/NX-06
exchange; NX-06 keeps its profile from that earlier exchange.

AX-15 and ET-01 then exchange their current type and compass profiles.
The earlier AX-18/ET-01 exchange remains composed into this result; AX-18
keeps its profile from that earlier exchange.

The next four swaps are applied in the supplied order: EX-11/ET-23,
AX-49/KR-14, KR-14/KR-12, then KR-13/KR-12. The net transfer is
EX-11 receiving ET-23 and vice versa; AX-49 receives the former KR-14
profile, KR-14 receives KR-12, KR-12 receives KR-13, and KR-13 receives
AX-49. Each source refers to its profile before this group of four swaps.

The subsequent NX-35/EX-11 and NX-35/NX-50 swaps are applied in that
order. NX-35 receives the then-current NX-50 profile, EX-11 receives the
then-current NX-35 profile, and NX-50 receives the then-current EX-11
profile. This transfers one public-employment district from Lorenvia to
Westhaven; Lorenvia now has two, and Westhaven has one.

EW-58 and WT-14 then exchange their current district type and compass
profiles, preserving both district identities and all earlier permutations.

LQ-13 and EW-24 then exchange their complete profiles: older, settled middle-class suburbs and established middle-income homeowner suburbs. All prior permutations remain intact.

The latest three additional swaps exchange NX-43/AX-49, NX-95/ET-32 and QL-10/WT-10. AX-49 already participated in the earlier swaps, so its new assignment is composed into the effective permutation rather than undoing that history.

There are **45 affected districts** across the retained permutations. `district_permutation_changes.csv` lists
all old/new types and coordinates; `district_permutations.json` records the
input swaps, the effective permutation and verification hashes. Earlier
within-type permutation records are retained separately in
`compass_permutation_changes.csv`.

Run `node tests/permutations.test.js` to verify the exact transfers, all type counts and unchanged district geography.

## Publish on GitHub Pages

1. Extract this ZIP.
2. Create a GitHub repository, for example **WizlandiaElections**.
3. Upload the extracted **contents** into the repository's root. `index.html` must be at the top level, alongside `styles.css`, `app.js`, `engine.js`, `data.js` and `favicon.svg`. Keep the supplied `.nojekyll` file if uploading through Git; the site also works as plain HTML without a build step.
4. Commit the files to `main`.
5. Open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then **main** and **/(root)**. Click **Save**.
6. Once GitHub completes deployment, use the published URL shown on that page. For a project repository it normally has the form `https://YOUR_USERNAME.github.io/WizlandiaElections/`.

Stylesheet and script URLs in `index.html` include content-version query strings. This makes browsers fetch the current files after an update, rather than mixing new History headers with a cached older script. Upload `index.html` with each update; when changing a referenced asset, refresh its version token as well.

No npm install, bundler, server, API key or external CDN is needed. The runtime assets use relative paths so project repository subdirectories work.

Official instructions: [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

To try it locally, open `index.html` in a browser. Alternatively, run `python3 -m http.server 8000` in this directory and open `http://localhost:8000`.

## What is included

- Economic and cultural sliders in **[−1.00, +1.00]**.
- Variance multiplier in **[0.50, 2.00]**.
- Three selectable seat views: **Electoral Districts (400, cartogram)**, **PR List (400, vote-share chart)** and **Combined (800)**. The combined majority threshold is **401**.
- The specified left-to-right order: **SWP, UPL, SDP, Green, CA, LDP, Conservative, Libertarian, NF**.
- All nine original party colours, and a results table showing district, PR and combined seat counts together.
- National vote shares, a linked party-bubble Compass, and a separate Districts Median Position plot with party regions, voter density and contours.
- 400 individually positioned districts, with searchable results and a competitiveness sort.
- Coalition selection and minimal winning coalition combinations.
- Seeded single draws and batches of up to 100 elections, a batch summary and restorable run history; summaries follow the selected component. A fresh editable seed is generated when the page opens, using browser randomness with a time-based fallback. The displayed seed initializes both single draws and batches; manually entered seeds and saved configurations remain reproducible.
- Editable party coordinates for exploratory scenarios.
- JSON configuration save/load; results, districts and history CSV downloads; Assembly, vote-share chart and cartogram SVG downloads.
- Light and dark themes, keyboard-operable controls and a responsive layout.
- An updated Python simulator in `python/wizlandia_election_simulator.py`.

The History table includes **Most Viable Coalition** after **Result**. For each saved election, it shows the first option from “Ways to reach 401 (sorted by coalition viability)”, with overlapping party-colour dots and party codes. The following **Electoral Districts**, **PR List**, and **Combined** columns show the summed seats of that coalition’s members in the saved run. The earlier seat columns continue to show the largest party’s seats. It always uses that run’s Combined results, regardless of the selected component. A single-party majority is shown as that party; when the ranking produces no eligible majority, the cell says “No viable coalition” and its three seat columns show dashes. Both displays share the same ranking function.

History is in memory, capped at the latest 200 entries. Refreshing the page resets it. Configuration saves parameters, party positions and the selected component view, not history. Older configurations without a view open in Combined. Export history as CSV before closing if you want to keep it. The theme is stored locally when browser storage is available.

## The small district change

Previously all districts belonging to a type occupied exactly the same point. A type of six districts therefore changed winner as a block.

Now every district has its own **fixed offset of at most 0.20 compass units**, before shocks. The transformation remains:

```text
new position = national baseline median + election shift
               + sqrt(variance multiplier) × (individual baseline position − national baseline median)
```

Offsets come in opposite pairs. This preserves each district type's average exactly, up to floating-point rounding. Every type's radius is additionally capped at 80% of its distance to the nearest original party boundary. Thus all original baseline winners and the **186–170** LDP–CA split are preserved. Changing the seed redraws election shocks; it does not redraw district geography.

The original national Gaussian mixture, party positions, type counts, national baseline vote shares and shock distribution are unchanged. The website fixes within-type variation at 0.20. Moving party coordinates is a scenario change; the original calibration refers to the default positions.

### Example: Greens can now win intermediate numbers of seats

With the updated university economic centre, hold the economic shift at 0.00, variance at 0.80, party positions at their defaults and fixed within-type variation at 0.20:

| Cultural shift | Green district seats |
| --- | ---: |
| +0.00 | 6 |
| +0.67 | 5 |
| +0.77 | 4 |
| +0.79 | 3 |
| +0.88 | 2 |
| +0.89 | 1 |
| +0.99 | 0 |

These are illustrations along one path through the parameters, not limits on the party's possible seat totals. Each election is still discrete, so exact ties or simultaneous changes can occur; the offsets remove the systematic identical-type block effect.

## Electoral interpretation

The Assembly combines **400 district seats and 400 nationwide PR seats**, for a fixed total of **800 seats**. A majority in the combined Assembly requires **401**. The two components are parallel: PR seats are allocated independently of district victories, then added. They do not compensate for district results. The component views each have 400 seats. Lead headlines, majority indicators, majority statistics, and coalition tools appear only in Combined.

PR uses **Hare quota / largest remainder** on the simulated national vote shares, with **no electoral threshold**. Multiply each party's normalized vote share by 400, assign the integer part, then award remaining seats by descending fractional remainder. Exact remainder ties follow canonical model code order (LDP, CA, SDP, CON, GRN, NF, LIB, UPL, SWP). This tie rule is separate from the requested visual display order.

The view buttons appear as Combined, Electoral Districts, and PR List. The Combined view opens by default. Switching views updates the main map, vote-share chart or Assembly diagram, seat totals, party cards, representation comparisons and history summaries. The Combined view also shows coalition tools and majority information. The overview table always shows all three seat columns. CSV exports contain all three components, and the SVG export uses the selected view. Editing party compass positions does not reorder the fixed left-to-right display.

Baseline seat allocation:

| Party | District | PR | Combined |
| --- | ---: | ---: | ---: |
| SWP | 0 | 4 | 4 |
| UPL | 0 | 12 | 12 |
| SDP | 18 | 44 | 62 |
| Green | 6 | 32 | 38 |
| CA | 170 | 100 | 270 |
| LDP | 186 | 124 | 310 |
| Conservative | 20 | 40 | 60 |
| Libertarian | 0 | 16 | 16 |
| NF | 0 | 28 | 28 |
| **Total** | **400** | **400** | **800** |

Wizlandia has 400 single-member districts. As in the original simulator, the closest party to each district median wins. Under Euclidean voter preferences and centrally symmetric district electorates, that party is the Condorcet winner and therefore wins Ranked Pairs. This is the existing spatial model's interpretation, rather than an implementation that constructs individual ballots and executes a Ranked Pairs tally.

National first-preference shares integrate the original three-Gaussian mixture over each party's nearest-party region across the full plane. District medians come from a separate illustrative geographical calibration; no district-level vote distributions are inferred from national shares. The baseline national economic marginal median remains **X = 2.0**. Its cultural marginal median remains approximately **−0.19681**.

The colour palette is unchanged:

| Party | Colour |
| --- | --- |
| Liberal Democratic Party (LDP) | `#000080` |
| Civic Alliance (CA) | `#FF9000` |
| Social Democratic Party (SDP) | `#C00040` |
| Conservative Party (CON) | `#60C0FF` |
| Green Party (GRN) | `#20A020` |
| National Front (NF) | `#404040` |
| Libertarian Party (LIB) | `#F0C000` |
| United Progressive Left (UPL) | `#E030C0` |
| Socialist Workers Party (SWP) | `#700000` |

Random elections are independent shocks around the same baseline. Economic shocks have SD 0.35; cultural shocks have SD 0.25. Draws outside [−1,1] are rejected, then these shifts are rounded to two decimals. Log variance has mean 0.04 and SD 0.20, with draws outside [0.50,2.00] rejected. This retains the requested equality **f(V) = f(1/V)** for the continuous density. Variance is not rounded internally. The variance display and range slider show two decimals; stored and exported draws retain their full precision.

Coalition combinations are arithmetic possibilities, including combinations parties might reject politically. The page labels this explicitly.

## Source map

| File | Purpose |
| --- | --- |
| `index.html` | Structure, controls, result panels and guide |
| `styles.css` | Responsive design and themes |
| `data.js` | Exported parties, district types, Gaussian mixture and quadrature constants |
| `engine.js` | Pure election mathematics, fixed district offsets and seeded shocks |
| `app.js` | UI, SVG Assembly and party compass, district-median plot, history and exports |
| `python/wizlandia_election_simulator.py` | Updated standalone Python version |
| `tools/export_data.py` | Regenerate `data.js` from the Python constants |
| `tools/check_parity.py` | Compare browser calculations with Python/SciPy and refresh reference fixtures |
| `tests/model.test.js` | Model regression checks, using Node's built-in assertion library |
| `tests/python-reference.json` | Python results for 58 scenarios and ten seeded shocks |

**`DISTRICT_SPREAD = 0.20`** is the fixed setting. The browser and Python use the same paired-offset algorithm, including the original boundary caps. `tools/export_data.py` regenerates browser constants from Python. `district-geography.js` and `district-geography.json` attach the proposed geographic identities without reordering the model.

## Verification

With Node installed:

```bash
node tests/model.test.js
node tests/diagrams.test.js
node tests/selection.test.js
node tests/coalition-priority.test.js
node tests/cartogram.test.js
node tests/interface.test.js
```

For a fresh comparison against Python/SciPy:

```bash
python3 -m pip install numpy scipy matplotlib
python3 tools/check_parity.py
python3 python/wizlandia_election_simulator.py --self-test
```

Checks cover the calibrated district, PR and combined baselines; 400/400/800 seat totals; quota rounding and exact-remainder tie handling; the requested party order; unchanged type averages, distinct individual districts, maximum offset, all intermediate Green seat totals, zero-variation behaviour, seeded shocks, reciprocal density equality and exact district, PR and combined seat agreement across 58 Python reference scenarios. Maximum national vote-share discrepancy in those scenarios is about 0.000005 percentage points; JavaScript uses a numerical normal-CDF approximation.

The Python district CSV contains one row for each of the 400 individual districts, including state-based ID, state, locality, resident population, original model ID and original type.

The Python GUI also opens with Combined seats and has District, PR and Combined buttons. To start a different view from the command line, use `--component district` or `--component pr`. The election CSV includes separate `*_district_seats`, `*_pr_seats` and `*_combined_seats` columns. For compatibility with earlier Python code, `ElectionResult.seats` continues to mean district seats; explicit `district_seats`, `pr_seats` and `combined_seats` properties are available.


## Assembly diagrams and seat cards

The Combined view offers Hemicycle and Westminster layouts. The PR List view
shows national vote percentages as vertical bars, and Electoral Districts shows
the cartogram.
Hemicycle restores the old evenly spaced concentric arcs: 14 rings for 800
seats and 10 for 400. Ring capacities scale with circumference; the 800-seat
layout matches the supplied old screenshot. Tiny disconnected party blocks
receive a local reassignment between neighbouring rings, preserving every dot
position, party total and within-ring display order. The normal baseline colour
assignment is unchanged from the old layout.

Westminster uses two facing benches. Selecting party cards moves those parties
to the government bench; clearing the selection moves them back. Westminster always orders parties largest first within each bench;
the Seat order control is shown only for the hemicycle. Layout and seat-order choices
are included in configuration saves. SVG export uses the displayed diagram.

Seat Distribution uses cards with a coloured left border, a large coloured seat
total, seat share above vote share, and a proportional share bar. Hover over a
card for the district/PR breakdown.

For this update, replace `index.html`, `app.js` and `styles.css` at repository
root. The ZIP also contains the updated
Python model, district register and geographic metadata.

Run `node tests/diagrams.test.js` for geometry and colour-assignment checks and
`node tests/model.test.js` for election checks. The restored arcs were compared
with the supplied old screenshot, and the application SVG was rendered for
visual inspection. Interface event tests cover component views, coalition
selection, state filters, district details and exports.


## Linked party selection

Click a Seat Distribution card or a party in the left sidebar to add or remove
it from the selection. Selected cards lift with a party-coloured ring and glow;
unselected cards fade. Sidebar rows reflect the same selection. Clearing the
selection restores all cards and the largest-party summary.

The result box beside the Assembly diagram follows a selected party or
coalition, including a coloured badge, seat total, vote share, and seat meter.
Combined also shows the majority threshold and up to four clickable ways to
form a majority across all eligible parties. These suggestions follow the coalition preference tiers below and exclude
NF, UPL, and SWP. The separate Minimal winning coalitions tab remains an
arithmetic list of all coalitions. The Electoral Districts view shows winning-party totals for the selected state
or nationwide. PR List displays vote percentages, with PR seat totals retained
in the party cards below.

Run `node tests/selection.test.js` to check the summary and coalition suggestions,
including zero-seat parties and all three seat views.


## Ways to reach 401: coalition priority

The summary box shows at most four qualifying minimal winning coalitions across
all eligible parties, independently of the largest party and the current selection.
Every coalition containing NF, UPL, or SWP is excluded from this box, including when
there are fewer than four permitted suggestions. If none qualifies, the box
shows an empty-state message. Direct manual selections remain available.

1. Single-party majorities.
2. LDP–Conservative; LDP–Green; LDP–Libertarian; CA–SDP; CA–Green; CA–Conservative.
3. LDP–Conservative–Libertarian; LDP–Green–Libertarian; CA–SDP–Green; CA–SDP–Conservative.
4. LDP–CA; LDP–Conservative–Green; CA–Conservative–Green.
5. Any other combination of mainstream parties that contains none of the pairs
   LDP–SDP, Libertarian–SDP, or CA–Libertarian.
6. Any other combination of mainstream parties, including combinations with
   those tension pairs.
7. Any combination involving a cordon sanitaire party; classified but excluded
   from these suggestions.

The heading is “Ways to reach 401 (sorted by coalition viability)”. Suggestions
are ordered by tier first. Within each tier, fewer parties come first, then
total coalition seats in descending order. Ties across all three criteria retain
a reproducible enumeration order. Suggestions remain
available when the current selection already holds a majority. A single-party
majority appears as a tier 1 option. Party names inside each suggestion remain
largest first.

Run `node tests/coalition-priority.test.js` to check all tiers, the cordon,
ranking, the four-suggestion limit, and the empty state.

Validation includes 156 cartogram renders, 184 Assembly layouts, and full-app event checks. Browser review confirms the PR chart’s fixed party order, percentage labels and live updates. Party-compass checks cover square-root radius sizing and fixed ±10 axes, zero-seat markers, all three seat components, two-way dot/card selection, keyboard activation, dark mode, and the relocated original density plot. Measured map dimensions are two-thirds of their previous size for all 12 states, with the nationwide dimensions unchanged. The original election calibration and geographic assignments are preserved.

The coastline-based update samples the five landmass silhouettes on a common hex lattice, balances exact state tile capacities, repairs state-piece connectivity, and transports the existing district anchors within their own state and landmass. It changes no district population, type, compass point, model index or ID. The new `stateBorders` metadata deduplicates shared edges on an integer lattice.

## Geographic realism update

Major university/student districts are dispersed across Lorenvia, Wizlandia
City, Akropolis, Southport, Ravenna and Erewenton. Both manufacturing types are
coastal, and type 26 is now **Manufacturing towns**. Farmland is moved away from
the cold north, with five Traditional dairy and livestock districts in Laxburg's
hinterland. Sierra Vista and Zyoto receive tourism, hospitality and scenic/amenity
types; Laxford receives retail/commercial and administrative/healthcare types.
All 50 type counts, type centres and the national baseline are preserved. The
geographic districts retain their IDs, boundaries, populations and map positions.
State-level election results change to reflect the revised type placement.

Run `node tests/geography-realism.test.js` for the geographic constraints and
`node tests/diagrams.test.js` for the restored arcs and tiny-party grouping.

## Capital and northern tourism update

The major university district formerly in Sorenvia is now in Ravenna. The six
major university cities are Lorenvia, Wizlandia City, Akropolis, Southport,
Ravenna and Erewenton.

Alpinton has a wealthy resort/tourism-owner district, reflecting its skiing
industry. Lux Aeterna has a scenic/amenity-tourism district centred on Northern
Lights tourism. Westhaven has affluent managerial, professional-family,
entrepreneurial and prosperous independent-business districts, while retaining
its two dockyard/shipbuilding districts and one capital public-employment seat.

The eight capital-city public-employment districts are allocated as Lorenvia
three, and Ravenna, Erewenton, Westhaven, Kroana City and Luqur Bay one each.
Every capital other than Lorenvia has at most one; several have none because
the original national total remains eight. All type counts, compass centres,
paired offsets, district boundaries, populations and map positions are retained.


## Compass-position permutation

Twelve districts exchange their existing compass positions in five disjoint
cycles, without changing any district's type, geography, population or tile.
Each arrow below means the left district receives the right district's previous
position; two-way arrows indicate swaps.

- NX-04 ↔ AX-45
- NX-44 ← AK-08 ← EW-38 ← NX-31 ← NX-44
- EW-36 ↔ AK-14
- LQ-01 ↔ EW-13 (LQ-01 was confirmed in place of LQ-04)
- QL-05 ↔ NX-07

`compass_permutation_changes.csv` records the old and new coordinates and model
indices. All 400 original positions and deterministic model indices occur once,
and each type's position multiset is unchanged. National results are unchanged
for every election configuration; state and individual district results may
change. `district-geography.js` is the only runtime file to replace for this
update. The atlas's baseline colours and type-family maps are unchanged.
