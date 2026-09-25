# Stage H Coupling Realism Remediation

## Objective

Restore mechanical continuity between locomotive, tender, and passenger cars without changing the approved locomotive or carriage artwork.

The production defect was not primarily an art defect. Vehicle boxes were positioned edge-to-edge, while transparent artwork margins varied by asset. Existing coupler overlays therefore had no guaranteed visible world-space and could disappear into the neighboring sprite. Stage H makes coupling geometry authoritative.

## H1 Boundary Geometry

- Reserve 14 px of world-space between adjacent passenger cars.
- Reserve 18 px between the final passenger car and the engine/tender sprite unit.
- Include all coupling gaps in passenger width, train width, camera fitting, and platform coverage.
- Keep wheel, rail, body baseline, and locomotive calibration unchanged.

Exit gate: 3-6 car consists preserve explicit positive boundary gaps at every supported viewport.

## H2 Passenger Draft Gear

- Render knuckle faces at both sides of every passenger-car boundary.
- Keep the draft bar visible above carriage artwork.
- Retain a compact end diaphragm on passenger-to-passenger boundaries.
- Add a hanging automatic-brake hose and a secondary steam-heat line.

Exit gate: every coach-to-coach boundary visibly bridges the reserved gap.

## H3 Tender Interfaces

- Give the final coach-to-tender boundary its own dedicated coupling span.
- Register tender-to-locomotive drawgear to each engine sprite's tender junction.
- Increase drawbar salience without altering tender or locomotive sprite geometry.
- Preserve the special starter locomotive registration.

Exit gate: no engine in the active fleet visually floats away from its tender or passenger consist.

## H4 Slack Dynamics

- Model a small visual draft-slack cue from throttle and train-brake state.
- Power produces a restrained stretched-train cue.
- Braking produces a restrained compressed-train cue.
- Clamp motion to +/-2.4 px and never move wheels, bodies, or rail contact geometry.
- Disable decorative slack movement for reduced-motion users.

Exit gate: connectors communicate tension/compression without changing consist dimensions or wheel alignment.

## H5 QA and Release Gate

Automated checks cover:

- coupling gap math for 3, 4, 5, and 6 cars;
- coach coupler count and visible gap bridging;
- final coach-to-tender gap bridging;
- bounded draft slack;
- required trainline hardware in the render contract;
- unchanged camera containment and platform geometry through the existing train geometry suite.

Human review should inspect at minimum:

1. three-car and six-car consists;
2. starter locomotive, a large articulated engine, and one mid-size road engine;
3. desktop and compact-landscape views;
4. power, coasting, and braking states.

Stage H is complete only when the train reads as one mechanically connected consist rather than several adjacent sprites.
