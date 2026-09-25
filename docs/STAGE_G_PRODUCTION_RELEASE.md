# Stage G Production Release

Stage G begins from the published Stage F commit `74521442c03c6e742d2d902cbb5337a871ed6ebd`.

## Objective

Finish Ironbound as a dependable Dad-demo/release candidate without adding another gameplay system. Stage G concentrates on return-visit clarity, save recovery, input/accessibility correctness, supportable release metadata, and an end-to-end production audit.

## Passes

### G1 — Resume and save clarity
- distinguish fresh, in-progress, failed, and completed runs on the main menu
- preserve the existing save automatically
- recover safely from malformed local save JSON instead of leaving the menu in an ambiguous state

### G2 — Input and accessibility hardening
- Escape must never start a run from the main menu
- retain explicit hydration gates on menu actions
- strengthen keyboard focus visibility and disabled-state feedback

### G3 — Release diagnostics
- expose a small release/build identifier for support and QA
- keep save schema visible in release metadata
- do not couple release metadata to gameplay behavior

### G4 — Production journey audit
- validate fresh launch, resume, damaged-save recovery, Store entry, run controls, and menu semantics
- retain the existing broad production-state screenshot audit

### G5 — Final reconciliation
- complete production-state evidence
- verify Stage G does not alter calibrated art/geometry/physics/economy/audio/content
- exact-tip QA before any promotion


## Completion status

All five Stage G passes are implemented:

- G1 resume and save clarity — complete
- G2 input and accessibility hardening — complete
- G3 release diagnostics — complete
- G4 production journey audit — complete
- G5 final reconciliation — complete

The release audit corrected three concrete edge cases:

- Escape no longer starts a run from the main menu.
- Existing in-progress saves are labelled **CONTINUE RUN** instead of looking like a new run.
- Malformed local save JSON is discarded and immediately replaced by a clean valid save while showing a recovery notice.

GitHub Actions run **#278** passed the complete integrated suite at commit `e4b1fc1885146088eb7e761c15579ca616e0cbc7`, including build/unit/lint and all 59 Chromium journeys.

The final Stage G candidate passed the exact-tip suite in GitHub Actions run **#280** at commit `8ee0671fe986d7a40148e376a363e88fb5c77203`. Stage G is therefore a completed production candidate.


## Publication status

Stage G is the intended published production baseline. After this documentation-only closeout tip passes the exact QA suite, `sites-source` is to be fast-forwarded to the same commit without force.


## Repository closeout

The Stage G publication cleanup also normalizes the repository itself for v1.0.0:

- package and lockfile identity now match `ironbound-unlimited` v1.0.0
- release metadata now identifies **Stage G • Production Release**, not a release candidate
- generated `tsconfig.tsbuildinfo` is removed and ignored
- QA workflow targets the canonical `main`, `sites-source`, and Stage G release refs
- README documents the final branch/deployment policy
- `docs/BRANCH_HISTORY.md` records that every legacy remediation ref checked has zero unique commits outside Stage G

The exact repository-cleanup tip must pass the full Ironbound QA suite before `main` and `sites-source` are advanced to it.
