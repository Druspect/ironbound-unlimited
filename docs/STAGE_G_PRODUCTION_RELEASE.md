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
