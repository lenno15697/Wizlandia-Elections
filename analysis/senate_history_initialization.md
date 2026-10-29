# Default Senate History: 60 LDP, 50 CA, 10 CON

The starting checkmarks are generated from a chosen fictional sequence of moderate nationwide election settings. Each cohort elects exactly one senator in each state using the unchanged coordinate-median rule. Year 0 retains the original baseline. The past settings are selected to give the requested stock of 120 seats, rather than presented as an unconditional random draw.

The history has sustained party strongholds and multi-election waves. In chronological order, CA improves at years −16 and −14; LDP strengthens across −10, −8 and −6; CA recovers toward −2; year 0 returns to the baseline. Neolexia and Quelor are the principal LDP–CA swing states. A culturally traditional election at year −8 gives Conservatives an additional Laxburg seat; a more progressive and concentrated election at year −12 lets CA win Illixium. These two exceptions balance, giving Conservatives ten senators overall.

Economic shifts stay between −0.32 and +0.30, cultural shifts between −0.22 and +0.25, and variance between 0.90 and 1.18. These are modest settings relative to the simulator's allowed ranges and random-shock standard deviations. Five states remain LDP strongholds throughout, while Avax, Ethuarica and Wittaria stay CA throughout.

| Year | Economic shift | Cultural shift | Variance | LDP | CA | CON |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | +0.00 | +0.00 | 1.00 | 6 | 5 | 1 |
| -2 | -0.30 | -0.05 | 0.96 | 5 | 6 | 1 |
| -4 | -0.22 | -0.08 | 0.98 | 6 | 5 | 1 |
| -6 | +0.08 | +0.08 | 1.02 | 7 | 4 | 1 |
| -8 | +0.30 | +0.25 | 1.18 | 7 | 3 | 2 |
| -10 | +0.12 | +0.02 | 1.04 | 7 | 4 | 1 |
| -12 | -0.10 | -0.22 | 0.90 | 6 | 6 | 0 |
| -14 | -0.32 | -0.08 | 0.98 | 5 | 6 | 1 |
| -16 | -0.28 | +0.08 | 1.00 | 5 | 6 | 1 |
| -18 | -0.10 | +0.08 | 1.04 | 6 | 5 | 1 |
| **Total** | | | | **60** | **50** | **10** |

All 120 checkmarks are verified against statewide median calculations. The resulting history remains editable. Opening or resetting the simulator uses the new defaults; saved configurations retain their own stored history. Only initialization changes: future random-election distributions, the district map, Assembly calculations, party positions and the baseline cohort stay unchanged. The previously measured long-run LDP average of approximately 60.32 seats is unaffected.

The complete state-by-state winners and settings are in `senate_history_initialization.csv` and `.json`. Run `node tools/verify_senate_history.js` to reproduce the totals and checks. Earlier reports retain their earlier historical initialization; this file describes the current defaults.
