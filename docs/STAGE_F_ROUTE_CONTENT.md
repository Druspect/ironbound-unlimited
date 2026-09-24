# Stage F Route, Biome, and Station Content Expansion

Stage F begins from the published Stage E commit `311bc230491004ca4fb51b4be315a87ea48a4a51`.

## Objective

Make the six-stop westbound run feel like a real journey through distinct places without reopening the calibrated locomotive, track, braking, or progression systems.

## Passes

### F1 — Route content backbone
- move biome identity into one authoritative route-content module
- attach line-side landmarks to route tiles so scenery travels with the existing route transform
- keep landmarks subordinate to track, train, stations, and controls
- preserve the existing five-tile-per-biome pacing and Stage E schedule

### F2 — Biome identity and transitions
- strengthen differences in foreground vegetation, industrial detail, weathering, and atmospheric treatment
- keep blends continuous rather than hard scene swaps
- validate desktop and compact landscape composition

### F3 — Station individuality
- give all six scheduled stops stronger local identity and approach cues
- preserve existing service roles and platform geometry
- make terminal Stillwater visually read as the end of the run

### F4 — Line-side events and route variety
- introduce restrained non-blocking route events and scenery beats
- avoid random gameplay penalties; events should enrich the ride without confusing the driver
- keep deterministic QA staging available

### F5 — Content reconciliation
- full route evidence sweep
- verify readability for the production audience
- verify no regressions to Stage A–E geometry, audio, braking, progression, or performance
- prepare a clean production candidate

## F1 implementation

The first pass creates `app/route-content.ts` as the source of truth for the six biome identities and their scenery assets. Twelve line-side landmarks are distributed across the route and rendered inside the existing route tiles, so they remain phase-locked to the scenery transform and cannot move train or track geometry.


## F2 implementation

Biome identity now includes numeric sky, ground, haze, and foreground-scrub theme values. The live scene interpolates those values with the existing biome blend scalar, so atmosphere changes continuously through seams rather than snapping when the biome index changes. The original background assets, grade survey, tile pacing, and route transform are unchanged.

## F3 implementation

Each Stage E station now has presentation-only route metadata: district, approach cue, local identity, and role. Station signs and terminal treatment use this metadata while the existing stop positions, service kinds, reward values, dwell logic, and platform geometry remain authoritative. Stillwater receives an explicit terminal visual treatment without changing its gameplay contract.


## F4 implementation

Seven deterministic line-side events now punctuate the route: cattle and a section crew on the plains, telegraph infrastructure through Red Mesa, salt hoppers on a siding, a logging camp, a stored summit snow plow, and a river work barge. These are decorative route-tile children only. They do not block the train, change physics, add random penalties, alter rewards, or require player input.
