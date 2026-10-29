# Senate results after LQ-13 ↔ EW-24

29 October 2026 · district permutation version 10

## Implemented changes

The authorized LQ-13/EW-24 permutation exchanges their complete political profiles: type, full type name, family, original model ID, economic and cultural coordinates, and derived baseline winner. LQ-13 now has the established middle-income homeowner profile; EW-24 has the older, settled middle-class suburb profile. IDs, state memberships, localities, populations, physical map geometry and all earlier transfers remain intact. Both are in the Suburban / exurban family, so their family-map colors stay the same.

Luqur’s baseline economic median rises from 2.06609 to 2.52400 and its cultural median changes from −0.18855 to −0.28986. Erewen’s economic median stays 2.88775, while its cultural median changes from −0.07478 to −0.02592. All twelve baseline Senate winners remain unchanged. National Assembly totals, district type counts, PR votes and PR seats remain unchanged for matched scenarios. Baseline district winners change at the two exchanged IDs: LQ-13 becomes LDP and EW-24 becomes CA.

The Senate hemicycle has six compact concentric arcs (12, 15, 18, 22, 25 and 28 seats) and 10.8-unit dot radii, versus the previous 6.1. Its drawing area is capped at 560 pixels wide and 330 pixels tall. The Assembly hemicycle geometry is unchanged. The state selector buttons in both final Senate map tabs now follow EX, EW, NX, AX, ET, KR, QL, AK, LQ, IL, LX, WT. Other state lists retain their current order.

## Simulation method

10,000,000 matched Senate election draws were made before and after the implemented swap, with seed 20261030. Each annual draw elects twelve senators, one per state. Grouping consecutive draws into ten-cohort blocks yields 1,000,000 independent complete 120-seat Senates per map. National shocks are shared by every state in an election, retaining cross-state correlation. Different election years are independent, matching the app’s random-draw model.

The app’s drawShocks function is used directly. Economic shifts are Normal(0,0.35²), rejected outside [−1,1], then rounded to 0.01. Cultural shifts are Normal(0,0.25²), similarly rejected and rounded. Variance is exp(Normal(0.04,0.20²)), rejected outside [0.5,2] and not rounded internally. All three shocks are independent. All nine model party positions and existing within-type district offsets remain fixed. The Compass-only display positions do not enter the election calculation.

The coordinate-wise median commutes with the positive affine transformation used for national shifts and variance, making a direct state-median calculation exactly equivalent to transforming all districts and taking their medians. This optimization was checked against 1,000 official engine evaluations, with matching winners and maximum coordinate error 8.881784197001252e-16.

## Before and after

| Map | LDP | CA | CON | Mean CA−LDP gap | P(CA ahead) | P(LDP ahead) |
| --- | --- | --- | --- | --- | --- | --- |
| Before swap | 51.47 | 59.60 | 8.93 | 8.13 | 80.26% | 16.48% |
| Updated map | 55.07 | 56.00 | 8.93 | 0.93 | 48.09% | 46.73% |

| Party | Updated mean | Monte Carlo 95% CI for mean | Central 95% outcome range | P(61+ seats) |
| --- | --- | --- | --- | --- |
| LDP | 55.07 | 55.063–55.077 | 47–61 | 2.68% |
| CA | 56.00 | 55.994–56.011 | 49–65 | 14.67% |
| CON | 8.93 | 8.922–8.929 | 6–12 | 0.00% |

The new map reduces CA’s expected lead from 8.13 to 0.93 seats, a reduction of 88.5%. CA and LDP tie in 5.18% of full Senates. The mean estimates have roughly ±0.01-seat Monte Carlo uncertainty at the 95% level. Ordinary election variation is much larger, as shown by the outcome ranges.

Near equality of average seats does not imply equal chances of sole majorities. CA still has the more favorable upper tail. A favorable common shock can transfer several baseline LDP states to CA and can also transfer Illixium from Conservatives to CA. Equivalent LDP-favorable shocks seldom transfer the safest CA states, while Conservatives remain competitive in culturally traditional states.

## State-level results on the updated map

| State | Economic median | Cultural median | P(LDP) | P(CA) | P(CON) |
| --- | --- | --- | --- | --- | --- |
| Neolexia | 2.140 | -0.684 | 66.00% | 34.00% | 0.00% |
| Erewen | 2.888 | -0.026 | 99.62% | 0.38% | 0.00% |
| Avax | 0.955 | -0.236 | 0.04% | 99.96% | 0.00% |
| Ethuarica | 1.019 | -0.022 | 0.12% | 99.88% | 0.00% |
| Extary | 2.487 | -0.123 | 92.29% | 7.71% | 0.00% |
| Kroana | 2.526 | -0.748 | 93.81% | 6.19% | 0.00% |
| Laxburg | 1.231 | 1.465 | 0.93% | 89.24% | 9.83% |
| Luqur | 2.524 | -0.290 | 93.73% | 6.27% | 0.00% |
| Wittaria | 0.866 | -0.108 | 0.01% | 99.99% | 0.00% |
| Akro | 4.087 | -1.818 | 99.98% | 0.00% | 0.00% |
| Quelor | 1.408 | -0.010 | 4.18% | 95.82% | 0.00% |
| Illixium | 0.340 | 2.504 | 0.00% | 20.57% | 79.43% |

Luqur now elects LDP in about 93.73% of random elections, versus roughly 57.7% before the swap. Neolexia remains the main LDP–CA marginal state, electing LDP about 66.0% of the time. Libertarians have extremely rare Akro wins; their average Senate representation is about 0.0016 seats. Other parties had no Senate victories in the main sample. This last statement describes the sample and is not a mathematical impossibility claim.

## Starting history

The earlier fixed historical shock scenarios were retained. Recalculating them with the new map produces a starting Senate of **LDP 51, CA 59, CON 10**. This is a particular initial history, distinct from long-run expectations. Holding year 0 at baseline and drawing the preceding nine elections randomly gives expected initial totals **LDP 55.56, CA 55.40, CON 9.03**. The slight initial LDP edge in this latter experiment comes from keeping the baseline cohort, which has six LDP senators, five CA and one Conservative. The fixed older cohorts rotate out over subsequent elections.

## Additional permutations tested, not applied

A preliminary screen used 20,000 draws, seed 20261030, to identify small single swaps. Screening required the same district family; compass distance no greater than 1.10; cultural-coordinate difference no greater than 0.65; metropolitan-share difference no greater than 0.30; unchanged baseline Senate winners; and no reversal of the newly authorized LQ-13/EW-24 swap. Protected university, farming, manufacturing, public-employment and other specialised types could exchange only with the same type. This produced 89 positive-LDP candidate swaps under the screening sample. These constraints are a practical definition of a small disruption, rather than an exhaustive test of every possible fictional settlement preference.

The representative options below were then confirmed using 1,000,000 fresh matched election draws with independent seed 20261031, grouped into 100,000 full Senates per option. This separate sample avoids reporting the candidate-screen estimate as its own confirmation.

| Additional swap | LDP | CA | CON | CA−LDP gap | P(LDP majority) | P(CA majority) |
| --- | --- | --- | --- | --- | --- | --- |
| Current map: LQ-13/EW-24 already applied | 55.07 | 56.00 | 8.93 | 0.93 | 2.66% | 14.77% |
| Additional NX-43 / AX-49 | 55.27 | 55.81 | 8.93 | 0.54 | 3.10% | 13.88% |
| Additional NX-95 / ET-32 | 56.08 | 54.99 | 8.93 | -1.09 | 5.60% | 10.55% |
| Additional NX-95 / EW-53 | 56.08 | 54.99 | 8.93 | -1.09 | 5.60% | 10.55% |
| Additional QL-10 / WT-10 | 59.28 | 51.79 | 8.93 | -7.49 | 41.97% | 5.42% |

### 1. Tiny adjustment: NX-43 ↔ AX-49

Both remain capital-city public-employment districts and remain baseline LDP districts. This swaps only their individual offsets within the same type. The compass distance between the profiles is approximately 0.083, and their metropolitan shares differ by just 0.008. Neolexia’s economic median rises from 2.14019 to 2.15862; Avax’s median remains unchanged. The expected change is about +0.20 LDP seats and −0.20 CA seats. CA retains a small mean edge of about 0.54 seats. All baseline Assembly district winners remain the same.

### 2. Modest LDP edge: NX-95 ↔ ET-32

NX-95 in West Cape is a skilled-trade and contractor suburb; ET-32 in East Cape is a rapid-growth outer suburb. Both share the Suburban / exurban family, their metropolitan shares differ by only 0.00122, and their cultural coordinates are close (0.630 and 0.547). Their total compass separation is about 0.562. Swapping them raises Neolexia’s economic median from 2.14019 to 2.24149 without changing Ethuarica’s statewide medians. Expected long-run seats become LDP 56.08, CA 54.99 and CON 8.93.

This produces the same Senate effect as the previously suggested NX-95/EW-53 exchange, with a smaller compass change (0.562 rather than 0.756). NX-95’s baseline district winner becomes LDP and ET-32’s becomes CA; national Assembly results stay unchanged. The twelve baseline Senate winners remain the same. This is the preferred additional swap if the goal is a modest LDP advantage. CA still has a greater sole-majority probability, 10.55% versus 5.60% for LDP, despite LDP’s greater mean.

### 3. Larger effect, unchanged baseline district winners: QL-10 ↔ WT-10

QL-10 in Atlantis is a mixed-income commuter suburb; WT-10 in East Harbour is a diverse first-home buyer suburb. Both are Suburban / exurban districts and both elect CA at baseline. Their metropolitan shares differ by only 0.00063. The profile separation is about 1.018 compass units. The swap raises Quelor’s economic median from 1.40794 to 1.96881 while leaving Wittaria’s statewide medians unchanged. Quelor becomes much more competitive for LDP. All 400 baseline Assembly district winners and all twelve baseline Senate winners stay unchanged.

Despite involving only two similar suburban profiles, the median effect is large because Quelor has thirteen districts. Expected Senate totals become LDP 59.28, CA 51.79 and CON 8.93, a substantial LDP advantage of about 7.49 seats. It also reverses the majority-probability advantage: about 41.97% for LDP and 5.42% for CA. This is a stronger political recalibration than the modest option above.

Each option preserves the national profile generation order as well as its coordinate multiset, retaining the exact district tie rule. The complete official engine was instantiated for each alternative geography; all 500 comparisons of national district seats, PR votes, PR seats and Assembly totals passed, including 250 with changed party positions. Existing university placements, farming restrictions and capital public-employment counts were checked. No additional candidate has been applied to the delivered model.

## Verification and reproduction

All 14 existing JavaScript test suites pass, including the updated permutation audit, exact diagram seat counts and non-overlap, state-button order, Senate rollover and Assembly freeze behaviour. Python/SciPy parity passes across the existing 58 reference scenarios. Browser QA confirmed the compact 120-dot hemicycle and the requested button order in both final tabs. The Senate layout was visually inspected in the browser; no actual iPhone device test was performed.

Run `node tools/analyze_senate_map.js` to reproduce the main and confirmation samples. Run `node tools/screen_senate_permutations.js` to reproduce candidate screening, then `python3 tools/build_senate_map_report.py` to regenerate this report. Analysis scripts are read-only and do not apply extra district permutations. The historical apply script requires input permutation version 9 and deliberately stops on the current version 10 to avoid applying the same swap twice.

The JSON results contain complete party histograms, state probabilities, candidate audits, validation metadata, random seeds and source hashes. CSV summaries and the run log are included beside this report.
