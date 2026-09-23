# Stage E Run Structure and Progression

Stage E begins from the published Stage D commit `428cd5ef18dac9ada56a221ae7dc6910e5e62dfb`.

## Objective

Turn Ironbound's mature driving, locomotive, consist, resource, station, and store systems into one finite and understandable game loop:

```
choose engine / consist
        ↓
run six scheduled stops
        ↓
manage speed + steam + fuel + water
        ↓
brake and berth below 3 MPH
        ↓
perform the service available at that station
        ↓
earn station + safe-driving bonds
        ↓
reach Stillwater with every stop cleared
        ↓
collect completion bonus
        ↓
buy / configure equipment
        ↓
start the next run
```

## E1 — Route and run structure

A run is now a finite six-stop westbound schedule:

1. Cinder Flats
2. Copper Wash
3. Saltworks
4. Timberline
5. Summit House
6. Stillwater

Every scheduled stop must be cleared. Stillwater only completes the run when all six station IDs are present in the run ledger. Reaching the terminal with a missed scheduled stop produces a distinct schedule-incomplete failure rather than silently awarding completion.

The route-complete state pauses the simulation, closes the regulator, reports run earnings and completion bonus, and offers explicit **OPEN STORE** and **START NEXT RUN** actions.

## E2 — Economy and career progression

Stage E adds persistent run and career ledgers:

- cleared station IDs
- station bonds
- safe-driving bonus bonds
- completion bonus
- completed-run count
- lifetime completed-route stations
- lifetime completed-route earnings
- best run earnings

Locomotive costs remain a meaningful progression ladder while the former extreme reward-multiplier curve is compressed to a controlled 1.00×–1.90× range.

Legacy saves without Stage E run metadata migrate claimed stop keys into the finite schedule so an existing save cannot become impossible to complete.

## E3 — Station gameplay

Stops now have explicit service roles instead of every station silently behaving like a full terminal:

| Stop | Service |
| --- | --- |
| Cinder Flats | passengers |
| Copper Wash | passengers + water |
| Saltworks | passengers + mail |
| Timberline | full fuel + water |
| Summit House | passengers + water |
| Stillwater | terminal full service |

This preserves the operating rule that a locomotive must receive full fuel/water service by the fourth stop. Water-only stops refill water without resetting the full-service interval. Passenger stops do not refill tender resources.

Partial service remains progressive: departing before the dwell completes retains only the service actually performed.

## E4 — Consist and reward tradeoffs

The physical penalty for additional cars remains authoritative:

- slower acceleration
- longer brake response
- greater fuel/water demand
- lower loaded speed ceiling

Stage E adds the matching upside: longer consists earn more station and completion revenue, with a capped multiplier so six-car trains are worthwhile without trivializing locomotive unlocks.

Safe-driving scoring is distance-based and now uses the active locomotive's own economical-speed band, exactly matching the target displayed to the player.

## E5 — Dad-ready game flow

The driving screen now prioritizes one immediate instruction:

- release the brake and ease on steam
- hold the locomotive's economical speed
- brake for the next station
- brake below 3 MPH
- hold stopped for the listed station work
- release the brake after the stop is complete

The mission panel shows **Stop X of 6** and a persistent route-progress bar. The station card names the actual station service and approximate payout. The intro explains the six-stop goal in plain language.

Stage E retains dedicated visual evidence for:

- `qa-artifacts/stage-e/first-run-guidance.png`
- `qa-artifacts/stage-e/route-complete.png`

## QA invariants

Stage E adds coverage for:

- six-stop schedule definition
- required-stop completion
- station service typing
- partial typed resource refill
- consist revenue limits
- career persistence
- legacy claimed-stop migration
- engine-specific economical-speed scoring
- real Stillwater terminal completion
- post-run Store handoff
- next-run reset
- terminal QA-fixture isolation
- passenger/water/full-service legibility at desktop and compact landscape sizes

All prior fleet, geometry, audio, braking, station, responsive-layout, visual-audit, and performance tests remain part of the same branch gate.

## Promotion rule

Stage E is a production candidate only after the exact branch tip passes the complete GitHub Actions suite, including browser journeys and evidence upload. `sites-source` remains on Stage D until Stage E is deliberately published.
