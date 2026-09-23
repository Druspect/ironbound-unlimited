# Stage C Reconciliation

Stage C is the consolidated production-remediation baseline for Ironbound: Unlimited.

The reconciliation preserves the newest Stage C implementations while absorbing valid work from legacy branches instead of overwriting current code with older snapshots.

## Reconciled legacy branches

- `gpt/consist-brake-authority-reconciliation` — carried forward consist-aware locomotive brake authority and regression coverage.
- `gpt/station-service-legibility` — carried forward service-stage readability and compact-landscape coverage.
- `gpt/safety-lock-salience` — retained the newer Stage C safety treatment and added the missing cab/vignette peripheral cues plus a Stage-C-native contract.
- `gpt/production-visual-state-audit` — retained the newer production-state audit and restored touch-portrait evidence using the current orientation-lock behavior.
- `gpt/production-remediation-four-pack` — its current brake persistence, platform overspeed, station approach, and store fact-sheet coverage already exists in Stage C; newer Stage C versions are authoritative where they differ.
- `gpt/review-published-baseline` — workflow-only historical review state is superseded by the current Stage C QA workflow.

## Additional Stage C repair

The whistle ownership contract was updated so it validates the complete equipped-engine audio effect after readiness instrumentation was added, rather than assuming the dependency array appears within a fixed source-character window.

## Gate

Stage C is publishable only after the full GitHub Actions hardening job passes:

- build
- unit and contract tests
- lint
- Chromium browser journeys
- visual/regression budgets
- evidence upload
