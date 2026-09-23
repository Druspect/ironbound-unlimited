# Ironbound: Unlimited

Ironbound: Unlimited is a cinematic browser steam-railway game focused on driving feel, locomotive identity, consist management, station work, and readable controls. The project is intentionally lightweight: gameplay runs client-side, assets are local, and historical data feeds the same operating profiles used by the simulation.

The game mixes documented locomotives with clearly labelled fictional or design-proxy equipment. Historical facts and modeled gameplay values are kept separate where necessary rather than presenting fiction as archival fact.

## Current Game Systems

- 12-locomotive steam roster with class-specific running gear and operating profiles
- throttle, progressive train brake, grades, boiler load, heat, safety-valve relief/protection, fuel, and water
- three-to-six-car passenger consists with mass-dependent acceleration, braking, resource use, and speed limits
- station berthing, progressive servicing, rewards, and a four-station service requirement
- locomotive store with sourced fact sheets and compatibility rules
- passenger carriage liveries with one coherent paint scheme across the consist
- selectable synthesized audio packs plus engine-bound exhaust cadence and five synthesized whistle families
- automatic and manual camera modes
- keyboard and pointer controls with compact-landscape and reduced-motion support
- browser-side save migration for progression and configuration

## Architecture

The production application lives under `app/`.

Key modules:

- `app/page.tsx` — game orchestration, UI, station flow, save state, and scene composition
- `app/engine-facts.ts` — sourced locomotive facts and provenance labels
- `app/steam-operations.ts` — operating profiles, consist mass, fuel/water consumption, and station service
- `app/locomotive-physics.ts` — throttle, braking, grade response, boiler load, heat, and safety behavior
- `app/locomotive-catalog.ts` — fleet catalog and runtime sprite geometry
- `app/locomotive-registration.json` — calibrated sprite/wheel registration data
- `app/locomotive-exhaust.ts` — travel-driven exhaust particle timing
- `app/engine-audio-profiles.ts` and `app/audio-packs.ts` — sound provenance, engine exhaust/whistle identity, and audio-pack behavior
- `app/carriage-compatibility.ts` — era/family carriage compatibility and save migration
- `app/train-geometry.ts` — consist/platform/camera layout calculations

Visual corrections are split into focused CSS layers. `app/production-polish.css` is the late geometry-neutral presentation layer; animation-continuity, biome-transition, and touch-orientation layers follow where their narrower responsibilities require it. Tests prevent presentation layers from redefining calibrated wheel, rail, and train geometry.

## Historical Accuracy Policy

Documented locomotives should use a primary museum, railroad, preservation organization, or government source whenever a suitable source exists. A source-backed correction belongs in `app/engine-facts.ts`; because operating profiles derive from that file, corrected mass, capacity, service role, or speed data also changes gameplay where appropriate.

The roster currently distinguishes:

- `documented` — presented as a real locomotive identity
- `documented-inspiration` — mechanically or visually grounded in a documented locomotive without claiming copied media artwork
- `fictional-proxy` — an Ironbound design informed by period practice, not a historical identity

Do not convert exceptional anecdotal or record speeds into normal operating limits. Do not label synthesized sound as an exact archival recording. Do not infer railroad ownership of generic carriage art unless the source data supports it.

## Visual and Mechanical Invariants

The following are treated as calibrated production geometry:

- wheel arrangement and axle count
- driver and truck hierarchy
- wheel-to-rail contact plane
- track gauge metadata and rail hierarchy
- locomotive sprite scale and rail inset
- consist/platform containment
- carriage truck spacing

Cosmetic work should not move these values without updating the corresponding contracts and browser geometry tests.

## Development

Prerequisites:

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout` for the bounded Sites helper scripts

Install and run locally:

```bash
npm ci
npm run dev
```

Production-style checks:

```bash
npm test
npm run lint
npm run build
```

Audio assets are generated from the checked-in deterministic generator:

```bash
npm run assets:audio
```

The project uses Vinext/Vite for the browser application and Cloudflare Sites-compatible build tooling. `.sites-runtime/` is disposable and ignored by Git.

## QA

Static and simulation contracts live in `tests/`. Browser acceptance tests live in `qa/browser/` and run through GitHub Actions.

Production gates cover, among other things:

- complete 12-engine fleet identity and Whyte notation
- fact-sheet/operating-profile reconciliation
- wheel and axle registration
- locomotive-specific handling signatures
- gradual braking, thermal safety-valve behavior, and relief-state salience
- consist mass effects
- fuel/water and station-service boundaries
- carriage compatibility and save migration
- track gauge, rail hierarchy, wheel contact, and cab clearance
- station platform containment
- compact-landscape layout
- locomotive headlight registration
- undercarriage family treatment
- carriage livery persistence
- engine-bound whistle-family coverage and smooth audio boundaries
- environment-normalized six-car performance budgets

Browser runs retain fresh PNG/video/trace evidence for human review. Deterministic geometry and behavior are the automated pass/fail gates; binary screenshots are not self-approved as baselines in CI.

## Adding a Locomotive

A production locomotive is not complete until all of these agree:

1. catalog entry in `app/locomotive-catalog.ts`
2. sourced or explicitly proxy-labelled fact sheet in `app/engine-facts.ts`
3. calibrated registration and sprite assets
4. compatible carriage family assignment
5. operating and audio provenance profiles
6. identity/geometry/static contracts
7. browser inspection at normal and compact landscape sizes

Do not duplicate another locomotive's normalized silhouette or wheel layout merely to make an asset fit.

## Adding or Changing Passenger Cars

Car definitions live in `app/steam-operations.ts`. Compatibility rules live in `app/carriage-compatibility.ts`. Keep baggage/head-end placement and observation/rear placement semantics intact unless the consist model is deliberately redesigned.

Passenger paint is a render-time livery system in `app/carriage-liveries.css`; avoid multiplying bitmap sets for color-only variants.

## Branch and Deployment Model

- `gpt/stage-d-final-reconciliation` — completed Stage D production candidate
- `gpt/stage-c-audio-realism` — published Stage C baseline
- `sites-source` — deployment source branch

Production changes are validated on the active staged-remediation branch first. `sites-source` should only be advanced when the QA branch is a clean fast-forward and the candidate has completed its release review.

## Production Principles

- fix visible errors instead of hiding them
- prefer one authoritative data path over duplicate constants
- keep historical claims sourced and narrowly worded
- preserve an older player's readability and control clarity
- avoid new dependencies for problems that can be solved with existing browser/platform capabilities
- keep visual effects subordinate to the locomotive, track, and operating feedback
- retain human-review evidence for graphics and audio because automated uniqueness is not the same as perceptual quality
