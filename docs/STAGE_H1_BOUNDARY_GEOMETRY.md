# Stage H1 Boundary Geometry

## Scope

H1 changes only horizontal consist geometry. It does not redesign locomotive art, coach art, coupler appearance, hoses, drawbars, or slack animation.

## Authoritative scale

Ironbound already defines an 80 ft heavyweight passenger coach as 190 world pixels. H1 uses that existing scale rather than introducing arbitrary connector pixels.

- World scale: 2.375 px/ft
- Coach-to-coach reserved clearance: 3.25 ft = 7.71875 world px
- Final coach-to-tender reserved clearance: 4.0 ft = 9.5 world px

These are Ironbound design baselines chosen to produce a close-coupled passenger consist while guaranteeing visible mechanical space. They are not presented as a universal railroad standard.

## Geometry invariants

For every valid 3-6 car consist:

1. Coach artwork width remains exactly 190 world px.
2. Each adjacent coach boundary contains exactly one coach coupling clearance.
3. The final coach-to-tender boundary contains exactly one engine coupling clearance.
4. Fleet-specific engine+tender width remains unchanged.
5. Total train width includes every body and reserved boundary once, with no overlap and no double-counting.
6. Passenger span used by platform and camera logic includes coach-to-coach clearances.
7. Wheel, rail-contact, body baseline, and locomotive sprite calibration are untouched.

## Validation matrix

H1 geometry tests cover:

- all 12 active locomotives;
- 3, 4, 5, and 6 passenger cars;
- automatic, close, standard, and wide camera modes;
- viewport widths from 320 through 2560 px;
- malformed inputs, which must fail rather than silently normalize.

H1 is complete only when this matrix passes and the existing build/lint/browser suite remains green.
