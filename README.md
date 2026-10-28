# Wizlandia Election Simulator

A standalone GitHub Pages election website inspired by the sidebar, parliament diagram, party cards and result tabs of [ThermidorElections](https://consuldelmar.github.io/ThermidorElections/). The interface and source here are a new implementation. No code or assets from the reference site are included.

## Current update: fixed variation and geographic districts


The **Compass** tab is a party-bubble compass inspired by Thermidor's presentation.
Party coordinates retain their Wizlandia economic and cultural meanings. Circle
radius is proportional to `sqrt(seats)` using the selected Combined, Electoral
Districts or PR List component; zero-seat parties have hollow markers. Bubble
clicks, keyboard activation, seat cards and sidebar parties all use the same
selection, including coalition highlights and fading. Both party-compass axes
range from −10 to +10. SVG export is available.

Only the Compass tab displays CA at `(0.00, 0.00)`, NF at `(-0.50, 8.00)`,
SWP at `(-9.00, -7.50)` and SDP at `(-4.00, -1.50)`. These presentation-only
coordinates never enter election calculations, saved configurations or the
Districts Median Position plot. The model retains CA `(0.00, -0.50)`, NF
`(0.00, 8.00)`, SWP `(-9.50, -8.00)` and SDP `(-3.50, -1.50)`, with its
original calibrated results.

The former compass has moved unchanged to **Districts Median Position**, after
History. It retains the density overlay and contours, all 400 district medians,
party crosses, national median star, density/district controls and hover details.


Within-type variation is fixed at **0.20**. The variation slider is removed, and loading an older configuration cannot override this setting. The economic, cultural and variance-multiplier sliders remain available. The existing party-boundary caps still apply, so 0.20 is a maximum offset rather than the standard deviation of every type.

The **Electoral Districts** view displays the 400-seat cartogram in place of the Assembly diagram. Combined retains its Assembly diagram. PR List instead shows a vertical chart of national vote shares, using the fixed left-to-right party order, original party colours and percentage labels on the y-axis. The chart updates with the election, supports dark mode and exports as SVG. The separate lower Cartogram tab has been removed. All states shows nationwide district seat totals for every party that won a seat. Selecting a state zooms the map and shows that state’s winning-party totals instead. Both summaries use the current election, ordered by seats won. Each state’s results sit to the left of its map on wide screens, with the map shifted right; smaller screens stack the results above the map. Individual state cartograms render at two-thirds of their previous width and height. The nationwide cartogram remains its original size. District type family mode includes a labelled colour key for all five families, on both nationwide and individual state maps. Colour by current winner, type family or state; click a tile for its ID, locality and full type name.

The Extary–Erewen border follows the ten marked tiles: five move into Extary's schematic territory and five into Erewen's. Their entitlements remain 30 and 60. Every one of the 49 named cities now has one connected group of tiles, including cities spanning two states. KR-22 is assigned to Davenport on its own island, rather than the capital across the strait. All 50 type counts, individual offsets, district populations and underlying geographic polygons are preserved.

The sidebar heading is “Explore Wizlandia’s elections.” The two requested explanatory paragraphs are removed. Batch size defaults to **20** elections; saved configurations can still specify another batch size.

Upload all top-level HTML, CSS, JS and SVG website files in this ZIP, including the new **district-geography.js**. The JSON and CSV contain the underlying mapping; tests and Python code are optional for hosting.

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

All 50 original types, their counts, compass centres and model generation indices are preserved. The original ID is retained as `legacyId`; this also preserves the deterministic tie-breaking order. Type placement is a proposed interpretation of settlement and state economic notes. Finance, technology, shipbuilding, manufacturing, mining and agricultural placements have explicit geographic constraints; other types fit urban structure, state wealth and varied local neighbourhood profiles. These are assumptions, not observed voting patterns. Geographic population is separate from the calibrated nationwide Gaussian PR electorate.

## Publish on GitHub Pages

1. Extract this ZIP.
2. Create a GitHub repository, for example **WizlandiaElections**.
3. Upload the extracted **contents** into the repository's root. `index.html` must be at the top level, alongside `styles.css`, `app.js`, `engine.js`, `data.js` and `favicon.svg`. Keep the supplied `.nojekyll` file if uploading through Git; the site also works as plain HTML without a build step.
4. Commit the files to `main`.
5. Open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then **main** and **/(root)**. Click **Save**.
6. Once GitHub completes deployment, use the published URL shown on that page. For a project repository it normally has the form `https://YOUR_USERNAME.github.io/WizlandiaElections/`.

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
- Seeded single draws and batches of up to 100 elections, a batch summary and restorable run history; summaries follow the selected component.
- Editable party coordinates for exploratory scenarios.
- JSON configuration save/load; results, districts and history CSV downloads; Assembly, vote-share chart and cartogram SVG downloads.
- Light and dark themes, keyboard-operable controls and a responsive layout.
- An updated Python simulator in `python/wizlandia_election_simulator.py`.

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

Hold the economic shift at 0.00, variance at 1.00, party positions at their defaults and the fixed within-type variation of 0.20:

| Cultural shift | Green district seats |
| --- | ---: |
| +0.00 | 6 |
| +0.28 | 5 |
| +0.32 | 4 |
| +0.46 | 3 |
| +0.63 | 2 |
| +0.76 | 1 |
| +0.81 | 0 |

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
