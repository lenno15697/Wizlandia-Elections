# Applied Senate swaps and corrected History labels

District permutation version 11. All three additional swaps are applied to complete profiles:

- NX-43 ↔ AX-49
- NX-95 ↔ ET-32
- QL-10 ↔ WT-10

The earlier LQ-13/EW-24 swap and all other requested changes remain composed into the map. District IDs, state membership, population, locality and map geometry stay fixed. All 50 district-type counts and national model generation order stay the same. Consequently national district results, national PR votes and seats, and national Assembly totals are identical for matched scenarios, including the deterministic tie rule. State and individual district results can change. All twelve baseline Senate winners remain unchanged.

## Updated Senate History

The nine historical shock scenarios were retained. Each of their twelve statewide winners was recomputed from the new map, together with the year-0 baseline. Five of the 120 checkmarks change, all from CA to LDP:

| Year | State | Before | After |
| --- | --- | --- | --- |
| -4 | QL | CA | LDP |
| -8 | QL | CA | LDP |
| -10 | NX | CA | LDP |
| -12 | QL | CA | LDP |
| -16 | QL | CA | LDP |

The starting Senate is now **LDP 56, CA 54, CON 10**. `senate_history_after_three.csv` contains every winner, and `senate_three_swaps_results.json` retains their settings, before/after changes, totals and model hashes. Checkmarks remain editable.

## Label display

Row headers now show the coloured dot, bold abbreviation, and full name separated by a bullet, for example **LDP • Liberal Democratic Party**. Full names use normal capitalization, letter spacing and muted text. Below the existing 480px breakpoint the full name and its separator are hidden together, leaving a clean abbreviation and colour dot. The Party column header retains its existing heading style.

## Long-run check

The applied map was rechecked with 10,000,000 election cohorts, grouped into 1,000,000 independent full Senates, seed 314159265. The app’s existing independent economic, cultural and variance distributions were used, with common national shocks across states and independent draws across election years.

| Party | Average seats | Chance of 61+ seats |
| --- | ---: | ---: |
| LDP | 60.32 | 52.18% |
| CA | 50.76 | 3.65% |
| CON | 8.92 | 0.00% |

LDP finishes ahead of CA in 84.16% of Senates. Its 95% Monte Carlo confidence interval for the average is 60.308–60.324, above the target of 60.00. This long-run average is distinct from the fixed initial historical Senate.

## Verification

All 14 JavaScript test suites pass, including 58 Python reference model scenarios. Tests verify the composed permutation, all geographic/type-count restrictions, all ten sets of History checkmarks, rollover and Assembly freeze behaviour, and the visible party-label separator. The national profile sequence is exactly unchanged; 100 additional full-engine comparisons confirm identical national district, PR and Assembly outcomes before and after these three swaps. Browser inspection confirms the corrected History row labels in the table.

Reproduce the current results with `node tools/verify_three_senate_swaps.js`. The historical apply script requires input version 10 and stops on the current version 11, preventing accidental reapplication. Earlier analysis reports and their recorded source hashes are retained as historical snapshots.
