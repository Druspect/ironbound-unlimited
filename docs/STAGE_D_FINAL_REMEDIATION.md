# Stage D Final Remediation

Stage D begins from the published Stage C commit `f586aae8004c8bbc7ba414fe6c241a411748cb46`.

## Objective

Prove that the fully reconciled systems remain coherent during real in-session transitions rather than only in isolated fresh-page fixtures.

## First gate: live locomotive handoff

The first Stage D browser journey cycles all 12 locomotives in one `reviewFleet` session and validates that every selection updates together:

- equipped locomotive sprite
- exhaust character
- exhaust beats per driver revolution
- exhaust audio readiness
- whistle asset family
- whistle audio readiness
- review mode remains non-purchasing

This specifically guards against stale cross-engine runtime state, including the historical class of failure where one engine worked while later selections inherited or lost another engine's behavior.

## Next Stage D passes

1. live consist/engine compatibility handoff
2. resource and braking continuity across store transitions
3. audio-pack switching under an active locomotive
4. desktop/compact-landscape final evidence sweep
5. final publish-candidate review
