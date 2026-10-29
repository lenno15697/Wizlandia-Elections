# Repeated batch draw correction

The repeated totals were caused by the batch click handler constructing a new `Mulberry32` instance from the visible seed on every click. This replayed the first N random elections regardless of how many elections had already been drawn. For example, seed 20261029 and three successive 20-draw batches all ended with LDP 60, CA 54 and CON 6, with identical final generator states and final shock settings.

The batch now uses the existing generator shared with individual random draws. The seed stays visible and editable. An explicit seed change restarts the sequence, and saved configurations retain the current random state.

The regression test verifies the exact complete Senate cohort and held-Assembly timeline, rather than requiring seat totals to differ on every batch. Equal totals remain possible by chance.

Verified cases:

- Three successive batches of 20 match sixty uninterrupted seeded draws.
- Two batches of 20 match one batch of 40.
- A single random draw between batches consumes the next draw correctly.
- Saving and loading a configuration preserves the next batch exactly.
- Explicitly setting a seed replays its original sequence.
- Senate seats remain 120; cohorts expire correctly; Senate-only elections retain the previous Assembly.

For seed 20261029, corrected consecutive batches end with LDP/CA/CON 60/54/6, 63/46/11 and 55/60/5. In the live browser, seed 20261030 gives 57/55/8, 62/50/8 and 64/48/8, matching the direct reference sequence and final shock values exactly.

All 15 JavaScript test suites pass. The election model, shock distributions, district mapping, and chosen 60/50/10 default History are unchanged. Twenty elections advance forty years; a full Senate contains the last ten two-year cohorts.

Reproduce with `node tests/batch-sequence.test.js`.
