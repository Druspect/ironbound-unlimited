# Branch History

Ironbound remediation is complete at Stage G / v1.0.0.

## Canonical branches

- `main` — canonical GitHub/default branch
- `sites-source` — deployment source
- `gpt/stage-g-production-release` — validated Stage G release and remediation audit trail

At release closeout, these refs are intended to point to the same validated production commit.

## Historical remediation refs

The following branches were explicitly compared against Stage G during repository cleanup. Each was confirmed to have **zero commits unique from Stage G**: its work is fully contained in the production history.

- `gpt/animation-continuity`
- `gpt/audio-ground-truth`
- `gpt/automatic-sanding`
- `gpt/biome-transition-continuity`
- `gpt/brake-trainline-propagation`
- `gpt/consist-brake-authority-reconciliation`
- `gpt/cylinder-clearing-events`
- `gpt/engine-operability-ground-truth`
- `gpt/exhaust-audio-ground-truth`
- `gpt/fix-runtime-brake-cylinder-continuity`
- `gpt/fleet-proportion-stage-a`
- `gpt/grade-aware-braking`
- `gpt/production-remediation-four-pack`
- `gpt/production-remediation-four-pack-v2`
- `gpt/production-visual-state-audit`
- `gpt/qa-hardening-six-pack`
- `gpt/review-published-baseline`
- `gpt/runtime-trainline-continuity-fix`
- `gpt/safety-lock-salience`
- `gpt/safety-lock-visual-salience`
- `gpt/sanding-grade-reconciliation`
- `gpt/stage-b-station-foreground`
- `gpt/stage-c-audio-realism`
- `gpt/stage-d-final-reconciliation`
- `gpt/stage-e-run-progression`
- `gpt/stage-f-route-content`
- `gpt/starter-track-ground-truth`
- `gpt/starting-adhesion`
- `gpt/station-service-legibility`
- `gpt/touch-portrait-orientation-lock`
- `gpt/track-wheel-coupler-rebuild`

These refs are retained only as historical checkpoints. New development must not branch from them.

## Temporary refs

- `tmp/ignore`
- `tmp/ignore2`

Both temporary refs were also verified to contain no work unique from Stage G. They are deprecated and should never be used as development bases.

## Policy

1. Start new work from current `main`.
2. Keep `main` and `sites-source` aligned at published releases.
3. Validate release candidates through the Ironbound QA workflow before promotion.
4. Do not revive historical remediation branches; create a new focused branch from current production instead.
5. Historical refs may be deleted later without losing unique remediation work because Stage G contains their complete ancestry.
