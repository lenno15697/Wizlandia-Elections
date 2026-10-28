# Compression of economically liberal district positions

The image markers are interpreted as economic coordinates **2.15** (left red origin), **5.75** (right red source bound) and **4.75** (green target bound). These are approximate readings of the hand-drawn lines.

For a baseline district economic position in [2.15,5.75], the transformation is `x_new = 2.15 + (13/18) × (x_old − 2.15)`. Positions outside that band are unchanged. This shrinks the distance from the left line by approximately **27.78%**, preserving horizontal ordering.

**180 districts** move, and the other **220** remain exactly fixed. Every cultural coordinate, district ID, legacy model index, district type, state/locality, population and map tile stays unchanged. Type counts, party coordinates (including Compass-only overrides), national voter-density mixture, independent election shocks, PR calculation and random-seed behavior are preserved. The baseline remains LDP 186, CA 170, SDP 18, CON 20 and GRN 6 district seats, with LIB 0.

The selected baseline points originally range from 2.158238 to 5.563049. They now range from 2.155950 to 4.614980, fully inside the target band.

## Libertarian district results

The comparison uses **100,000 paired elections**, seed **20261028**, default party positions and the existing independent shock distributions. Each before/after pair uses the same shocks. The fast nearest-party calculation was checked against the actual browser engine for the first 200 new elections.

| Metric | Before | After |
| --- | --- | --- |
| Mean LIB district seats | 2.41320 | 0.13149 |
| Chance of any LIB district seat | 40.978% | 3.926% |
| Chance of at least five seats | 25.364% | 1.382% |
| 95th percentile | 8.0 | 0.0 |
| 99th percentile | 14.0 | 5.0 |
| Highest count in the random sample | 39 | 17 |
| Certified maximum over all allowed shifts | 55 | 24 |

LIB wins zero district seats in **96.074%** of the revised random elections. Its average falls by **2.28171 seats** (94.55%). A leftward-only shift cannot improve LIB's relative distance against parties whose economic positions are all to its left; the matched sample also explicitly verifies that no election gains LIB district seats.

## What the best-case ceiling means

For every district, linear programming checks whether LIB can be nearest anywhere with economic and cultural shifts in [−1,+1] and variance in [0.5,2]. Squared-distance differences are affine in the two shifts and sqrt(variance), so this covers the continuous domain.

Before compression, 55 districts have a feasible LIB-winning region. Afterward, only 24 do. At the shared extreme setting **economic +1, cultural −1, variance 2**, LIB wins all of those respective feasible districts. Therefore these bounds are attained: the exact maxima are **55 before and 24 after**, under default party positions.

This follows the requested green-line compression and makes typical district victories rare. It still permits 24 seats at the most favorable extreme. A single-digit absolute ceiling would require a stronger compression than the marked target, or a further model change. Custom party coordinates can alter these bounds.

## Position generation and variance

The fixed paired source offsets are generated exactly as before. Compression is then applied to each selected economic coordinate, keeping every vertical offset intact. Economic and cultural election shifts and the variance multiplier apply afterward. The green line therefore bounds baseline positions; later election shifts may move them beyond it. The horizontal old/new difference scales by sqrt(variance).

The source type definitions remain in `sourceTypes`, while `types` publishes their actual post-compression means at the standard 0.20 spread. Most selected types are transformed wholly. Two public-employment points lie just inside the source band while the rest of that type lies outside, so its published mean is calculated from the partly transformed point group.

The dairy/livestock type lies outside the band, preserving its newly requested full 0.20 spread and cultural shift. Earlier wine/orchard and other type settings are preserved in the source definitions, with the wine/orchard economic coordinates subsequently participating in this compression. University positions remain untouched.

## PR and verification

PR vote shares and PR seat allocations remain identical for every matched scenario: the national voter distribution and party coordinates are unchanged, and this operation acts only on district medians. This can increase the difference between LIB’s national PR representation and its ability to win individual districts. All seat-winning rules and the 400+400 parallel structure remain unchanged.

Regression checks cover the exact transform for all 400 points, the 180/220 selection split, unchanged cultural coordinates and identities, default type means, source offsets, the dairy radius, earlier source-centre changes, baseline, browser/Python parity, maps, coalition summaries, History, exports and seed replay.

Reproduce the comparison with `python3 tools/analyze_economic_compression.py 100000 20261028`. The input snapshot and machine-readable results are in this analysis directory. Random percentages describe the simulator under its current default shock distributions; they are Monte Carlo estimates. The 24-seat upper bound uses the separate continuous-domain feasibility calculation.

