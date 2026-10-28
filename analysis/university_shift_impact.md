# University district economic-position change — impact analysis

The economic centre of Major university and student districts (type 8) moves from **−1.94 to −0.05**, a **+1.89** shift. Regional university and college towns (type 28) already have economic centre −0.05. The major-university cultural centre remains **−3.976810123046975**, compared with **−2.4368101230469748** for regional university towns: major universities remain 1.54 units more progressive culturally.

All six university districts move horizontally. Their cultural coordinates, individual paired offsets, IDs, state/locality assignments, populations, map tiles, type counts and family colours remain unchanged. The other 394 district positions and the other 49 district types are unchanged.

## The six districts

| District | City | Old economic position | New economic position | Cultural position |
| --- | --- | --- | --- | --- |
| NX-04 | Wizlandia City | -1.782861 | 0.107139 | -4.041675 |
| NX-31 | Ravenna | -2.097139 | -0.207139 | -3.911946 |
| NX-53 | Lorenvia | -2.024769 | -0.134769 | -3.795663 |
| EW-38 | Erewenton | -1.808495 | 0.081505 | -3.928785 |
| AX-45 | Southport | -2.071505 | -0.181505 | -4.024836 |
| AK-08 | Akropolis | -1.855231 | 0.034769 | -4.157957 |

The simulator scales positions around its fixed national median by sqrt(variance). Consequently, the old/new economic-coordinate difference is **1.89 × sqrt(variance)**: about 1.34 at variance 0.50, 1.89 at 1.00, and 2.67 at 2.00. The old/new cultural-coordinate difference remains zero at every setting.

The unweighted average economic coordinate of all 400 district medians rises by **0.02835** at baseline (6 × 1.89 / 400). This statistic is separate from the model’s unchanged national voter-distribution median.

## What stays fixed

The baseline election is unchanged. All six university districts still elect the Greens. Baseline district seats remain LDP 186, CA 170, SDP 18, CON 20 and GRN 6. Baseline PR seats remain LDP 124, CA 100, SDP 44, CON 40, GRN 32, NF 28, LIB 16, UPL 12 and SWP 4. Combined seats remain LDP 310, CA 270, SDP 62, CON 60, GRN 38, NF 28, LIB 16, UPL 12 and SWP 4.

The national Gaussian voter mixture and its median, party model coordinates, Compass-only presentation overrides, shock distributions and independence, fresh seed generation, PR integration, Hare allocation and coalition viability rules are unchanged. PR is a separate national layer: changing district medians does not modify this mixture. Therefore PR vote shares and PR seats are exactly identical before and after for any matched scenario and party configuration. Every Combined seat change equals the district-seat change.

## Matched random-election comparison

**100,000 paired elections**, using seed **20261028**, the current independent shock distributions, fixed 0.20 within-type variation and default party coordinates. Each pair uses identical economic, cultural and variance shocks. The current full election engine calculates each new result; its six university winners are replaced with winners from the saved pre-change positions to reconstruct the old result. The original engine was additionally checked directly against the new engine for 1,000 matched scenarios: PR outputs and all other district records were identical. The optimized coalition ranking was checked against the actual UI ranking for the first 1,000 pairs.

### Average nationwide district seats

| Party | Before | After | Change |
| --- | --- | --- | --- |
| LDP | 187.62161 | 187.62161 | +0.00000 |
| CA | 159.42225 | 159.42515 | +0.00290 |
| SDP | 15.63306 | 14.83996 | -0.79310 |
| CON | 19.26489 | 19.26489 | +0.00000 |
| GRN | 15.64487 | 16.43519 | +0.79032 |
| NF | 0.00000 | 0.00000 | +0.00000 |
| LIB | 2.41320 | 2.41320 | +0.00000 |
| UPL | 0.00012 | 0.00000 | -0.00012 |
| SWP | 0.00000 | 0.00000 | +0.00000 |

The main transfer is from the SDP to the Greens. CA gains very slightly. Rare old UPL university victories also transfer to the Greens. PR averages stay identical, so these changes also apply to average Combined seats. These are random-election averages, rather than baseline seat allocations.

### Individual university win probabilities

| District | City | Green before | Green after | SDP before | SDP after | CA after |
| --- | --- | --- | --- | --- | --- | --- |
| EW-38 | Erewenton | 92.560% | 99.864% | 7.334% | 0.000% | 0.136% |
| AX-45 | Southport | 85.153% | 99.923% | 14.791% | 0.000% | 0.077% |
| NX-31 | Ravenna | 76.252% | 99.849% | 23.665% | 0.000% | 0.151% |
| NX-04 | Wizlandia City | 96.294% | 99.932% | 3.651% | 0.000% | 0.068% |
| AK-08 | Akropolis | 97.090% | 99.963% | 2.878% | 0.000% | 0.037% |
| NX-53 | Lorenvia | 72.831% | 99.681% | 26.991% | 0.000% | 0.319% |

Across all six districts, the Greens' share of university victories rises from 86.697% to 99.869%. CA wins the remaining 0.131% in the new sample. All six old Green winners remain Green; observed changes are SDP → GRN (79,020 district-election outcomes), SDP → CA (290), and UPL → GRN (12).

At least one district changes winner in **27.014%** of elections. The average is **0.79322** changed district seats per election. All six change in **2.875%**. Changes are bounded by the six affected seats: 1.5% of district seats or 0.75% of all 800 seats.

| Changed university winners | Elections | Share |
| --- | --- | --- |
| 0 | 72,986 | 72.986% |
| 1 | 3,356 | 3.356% |
| 2 | 8,871 | 8.871% |
| 3 | 7,450 | 7.450% |
| 4 | 3,686 | 3.686% |
| 5 | 776 | 0.776% |
| 6 | 2,875 | 2.875% |

### When the change matters

Economic shock / setting:

| Band | Matched elections | At least one winner changes |
| --- | --- | --- |
| <−0.35 | 15,212 | 82.455% |
| −0.35–0.35 | 68,850 | 20.963% |
| ≥0.35 | 15,938 | 0.238% |

Cultural shock / setting:

| Band | Matched elections | At least one winner changes |
| --- | --- | --- |
| <−0.25 | 15,324 | 3.635% |
| −0.25–0.25 | 68,336 | 23.905% |
| ≥0.25 | 16,340 | 61.940% |

Variance shock / setting:

| Band | Matched elections | At least one winner changes |
| --- | --- | --- |
| <0.8 | 9,310 | 21.794% |
| 0.8–1.0 | 32,656 | 24.216% |
| 1.0–1.2 | 34,292 | 27.942% |
| ≥1.2 | 23,742 | 31.569% |

The effect is especially pronounced in economic-left or culturally more traditional elections, when the former university positions could favour the SDP. Moving the economic centre toward the Greens removes that vulnerability. Higher variance scales up the horizontal difference, while the cultural coordinate remains unchanged.

## Overall parliament and coalition effects

The largest Combined party changes in **0/100,000** matched elections. Single-party Combined majority status changes in **0/100,000**. Both are zero in this sample; this is a Monte Carlo finding, not a claim that every possible custom election has identical outcomes. Hung parliaments occur in 99.930% both before and after. CA's district-only majority count rises from 6,473 to 6,477 in this sample; its Combined-majority count is unchanged.

The top-ranked option in **Most Viable Coalition** changes in **1.152%** of paired elections (1,152 of 100,000). Selected top-option frequencies include:

| Top-ranked coalition | Before | After | Change (percentage points) |
| --- | --- | --- | --- |
| LDP + CA | 22.774% | 23.235% | +0.461 |
| CA + SDP + CON | 21.880% | 21.565% | -0.315 |
| LDP + CON + LIB | 18.451% | 18.467% | +0.016 |
| LDP + CON | 14.904% | 14.904% | +0.000 |
| LDP + GRN + LIB | 9.986% | 9.986% | +0.000 |
| CA + SDP + GRN | 5.837% | 6.095% | +0.258 |
| LDP + GRN | 3.400% | 3.400% | +0.000 |
| CA + SDP | 2.367% | 1.902% | -0.465 |
| CA + CON | 0.320% | 0.365% | +0.045 |

These describe the top option under the existing viability ordering and 401-seat threshold, rather than every mathematically winning coalition. Small seat transfers can remove one minimal winning option and promote another. Coalitions containing both SDP and GRN mostly retain their aggregate strength; the main difference is which of those parties supplies the seats.

## Full-domain competitiveness check

A separate linear-programming check covers economic and cultural shifts throughout [−1,+1] and variance throughout [0.5,2.0], with default party coordinates. Squared-distance differences are affine in the two shifts and sqrt(variance), so this covers the continuous domain rather than only the random sample. The maximum attainable advantage is strictly negative for every excluded party, including the SDP.

Before the edit, each of the six university districts has a feasible winning region for CA, SDP, GRN and UPL. After the edit, only **GRN and CA** have feasible winning regions. Thus this edit makes the seats substantially safer for the Greens and removes them as SDP targets within the permitted controls. The type is more economically centrist, while its strong cultural progressiveness still puts it much closer to the Greens than to LDP or LIB. Custom party coordinates can change this conclusion.

At variance 1.00, all six revised university districts remain Green throughout the allowed economic and cultural shift ranges. Even cultural shift +1.00 leaves their cultural coordinates below the CA/GRN boundary at −2.75. CA victories require enough variance contraction combined with a more traditional cultural shift. Regional university towns retain their less progressive cultural centre and therefore remain a distinct type.

## Concrete examples

| Economic | Cultural | Variance | Old university result | New university result |
| --- | --- | --- | --- | --- |
| +0.00 | +0.00 | 1.00 | GRN 6 | GRN 6 |
| +0.00 | +0.50 | 1.00 | SDP 3, GRN 3 | GRN 6 |
| +0.00 | +0.00 | 0.80 | GRN 6 | GRN 6 |
| +0.00 | +0.50 | 0.80 | SDP 3, GRN 3 | GRN 6 |
| -0.50 | +0.00 | 1.00 | SDP 3, GRN 3 | GRN 6 |
| +0.50 | +0.00 | 1.00 | GRN 6 | GRN 6 |
| +0.00 | +0.00 | 1.50 | GRN 6 | GRN 6 |
| +0.00 | +1.00 | 1.00 | SDP 6 | GRN 6 |

## Reproduction and limits

Run `node tools/analyze_university_shift.js 100000 20261028` to reproduce the matched comparison. Run `python3 tools/check_university_feasibility.py` to reproduce the full-domain nearest-party check. Machine-readable results, before/after positions and the complete pre-change model constants are in this analysis directory.

Random-election percentages are Monte Carlo estimates under the current shock distributions and default parties. They describe the simulator, not observed election data or a calibrated real-world forecast. The isolated edit preserves all district permutations and geography. Meaningful regression checks cover unchanged model inputs, six exact horizontal shifts, cultural offsets, baseline, Python/browser parity and the updated transition path.

