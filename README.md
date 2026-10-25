# Wizlandia Election Simulator

A standalone GitHub Pages election website inspired by the sidebar, parliament diagram, party cards and result tabs of [ThermidorElections](https://consuldelmar.github.io/ThermidorElections/). The interface and source here are a new implementation. No code or assets from the reference site are included.

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
- Three selectable parliament views: **District (400)**, **PR (400)** and **Combined (800)**. The combined majority threshold is **401**.
- The specified left-to-right order: **SWP, UPL, SDP, Green, CA, LDP, Conservative, Libertarian, NF**.
- All nine original party colours, and a results table showing district, PR and combined seat counts together.
- National vote shares and a political compass with lightly shaded party regions, voter density and solid contour lines.
- 400 individually positioned districts, with searchable results and a competitiveness sort.
- Coalition selection and minimal winning coalition combinations.
- Seeded single draws and batches of up to 100 elections, a batch summary and restorable run history; summaries follow the selected component.
- Editable party coordinates for exploratory scenarios.
- JSON configuration save/load; results, districts and history CSV downloads; parliament SVG download.
- Light and dark themes, keyboard-operable controls and a responsive layout.
- An updated Python simulator in `python/wizlandia_election_simulator.py`.

History is in memory, capped at the latest 200 entries. Refreshing the page resets it. Configuration saves parameters, party positions and the selected component view, not history. Older configurations without a view open in Combined. Export history as CSV before closing if you want to keep it. The theme is stored locally when browser storage is available.

## The small district change

Previously all districts belonging to a type occupied exactly the same point. A type of six districts therefore changed winner as a block.

Now every district has its own **fixed offset of at most 0.10 compass units**, before shocks. The transformation remains:

```text
new position = national baseline median + election shift
               + sqrt(variance multiplier) × (individual baseline position − national baseline median)
```

Offsets come in opposite pairs. This preserves each district type's average exactly, up to floating-point rounding. Every type's radius is additionally capped at 80% of its distance to the nearest original party boundary. Thus all original baseline winners and the **186–170** LDP–CA split are preserved. Changing the seed redraws election shocks; it does not redraw district geography.

The original national Gaussian mixture, party positions, type counts, national baseline vote shares and shock distribution are unchanged. Within-type variation can be set to zero to recover coincident district centres. Moving party coordinates is a scenario change; the original calibration refers to the default positions.

### Example: Greens can now win intermediate numbers of seats

Hold the economic shift at 0.00, variance at 1.00, party positions at their defaults and within-type variation at 0.10:

| Cultural shift | Green district seats |
| --- | ---: |
| +0.00 | 6 |
| +0.41 | 5 |
| +0.43 | 4 |
| +0.50 | 3 |
| +0.58 | 2 |
| +0.65 | 1 |
| +0.67 | 0 |

These are illustrations along one path through the parameters, not limits on the party's possible seat totals. Each election is still discrete, so exact ties or simultaneous changes can occur; the offsets remove the systematic identical-type block effect.

## Electoral interpretation

The Assembly combines **400 district seats and 400 nationwide PR seats**, for a fixed total of **800 seats**. A majority in the combined Assembly requires **401**. The two components are parallel: PR seats are allocated independently of district victories, then added. They do not compensate for district results. The component views each have 400 seats and show their own majority threshold of 201.

PR uses **Hare quota / largest remainder** on the simulated national vote shares, with **no electoral threshold**. Multiply each party's normalized vote share by 400, assign the integer part, then award remaining seats by descending fractional remainder. Exact remainder ties follow canonical model code order (LDP, CA, SDP, CON, GRN, NF, LIB, UPL, SWP). This tie rule is separate from the requested visual display order.

The view buttons appear as Combined, Electoral Districts, and PR List. The Combined view opens by default. Switching views updates the parliament, seat totals, majority indicator, party cards, coalition tools, representation comparisons and history summaries. The overview table always shows all three seat columns. CSV exports contain all three components, and the SVG export uses the selected view. Editing party compass positions does not reorder the fixed left-to-right display.

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
| `app.js` | UI, SVG parliament, compass, history, exports and configuration |
| `python/wizlandia_election_simulator.py` | Updated standalone Python version |
| `tools/export_data.py` | Regenerate `data.js` from the Python constants |
| `tools/check_parity.py` | Compare browser calculations with Python/SciPy and refresh reference fixtures |
| `tests/model.test.js` | Model regression checks, using Node's built-in assertion library |
| `tests/python-reference.json` | Python results for 58 scenarios and ten seeded shocks |

Change **`DISTRICT_SPREAD = 0.10`** in the Python file to adjust its default district variation. To update the website's default too, run `python3 tools/export_data.py`. The browser slider supports 0.00–0.20. The geometry in `engine.js` and the Python file deliberately uses the same paired-offset algorithm.

## Verification

With Node installed:

```bash
node tests/model.test.js
```

For a fresh comparison against Python/SciPy:

```bash
python3 -m pip install numpy scipy matplotlib
python3 tools/check_parity.py
python3 python/wizlandia_election_simulator.py --self-test
```

Checks cover the calibrated district, PR and combined baselines; 400/400/800 seat totals; quota rounding and exact-remainder tie handling; the requested party order; unchanged type averages, distinct individual districts, maximum offset, all intermediate Green seat totals, zero-variation behaviour, seeded shocks, reciprocal density equality and exact district, PR and combined seat agreement across 58 Python reference scenarios. Maximum national vote-share discrepancy in those scenarios is about 0.000005 percentage points; JavaScript uses a numerical normal-CDF approximation.

The revised Python district CSV now contains one row for each of the 400 individual districts rather than one row per type.

The Python GUI also opens with Combined seats and has District, PR and Combined buttons. To start a different view from the command line, use `--component district` or `--component pr`. The election CSV includes separate `*_district_seats`, `*_pr_seats` and `*_combined_seats` columns. For compatibility with earlier Python code, `ElectionResult.seats` continues to mean district seats; explicit `district_seats`, `pr_seats` and `combined_seats` properties are available.
