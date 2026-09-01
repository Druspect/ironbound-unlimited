# Locomotive registration and exhaust

## Current undercarriage revision

This section supersedes the historical starter-only and unchanged-diameter
notes below. The original body/tender/driver masters are retained, but all twelve
engines now use registered animation sheets and identical shop/frame-zero
assembly. Only Ironbound No. 1, Southern 4501, and Big Boy 4014 are active.
Outside-click dismissal, earned bonds, save ownership, gradual braking,
whistle controls, route motion, and safe-driving rewards are unchanged.

- Ironbound: retained red/brass driver and body assets, three driving axles,
  two actual front truck axles, cast suspension, and one common rail baseline.
  The old renderer declared front axles but never drew them; its independently
  lifted body and static shop thumbnail are no longer used. The stack outlet
  now follows the exact body transform through the generated registration.
- Southern: preserve 80px drivers, the 55px rear wheel at x=17.5%, and 40px
  pilot; add a bounded cast-frame connection above the rear truck/driver gap.
- PRR: 90px drivers at section x=32/47/62%, 54px trailing wheel at x=16%,
  36px pilot wheels; retain the frontmost pilot's previous rearward correction.
- NKP: 78px drivers with a slightly wider block and 47px trailing wheels.
- N&W 611: preserve 77px drivers; 41px pilot and 48px trailing wheels.
- UP 844: 86px drivers in an expanded block, with 49px rear truck wheels.
- N&W 1218: equal 63px driver groups, 35px pilot and 39px trailing wheels.
- Challenger: equal 64px driver groups, 33px pilot and 40px trailing wheels.
- Big Boy: preserve 57px drivers and the complete 36px tender separation.
  Add only bounded cradle/frame fill; retain the distinct rear truck.
- Articulated models use two cradle ends at crown height with a narrow seam.
  No rod or continuous rigid suspension casting spans the articulation.

All sizes above are **rendered source pixels**, not scale drawings. Whole
engines are fitted to different screen widths: equal prototype inches cannot
be imposed as equal screen pixels without rescaling the entire long articulated
locomotive. Passenger-driver hierarchy is checked at runtime scale, while
Big Boy's approved dimensions and Southern's corrected rear wheel are retained.
Gaps beneath the lower tires and between independent running-gear groups are
intentional; upper suspension connections are reinforced without solid slabs.

Prototype references checked August 28, 2026:
[Southern 4501, 63-inch drivers](https://www.tvrail.com/equipment/southern-4501/),
[PRR 1361, 80-inch drivers](https://www.railroadcity.org/rollingstock),
[UP 844, 80-inch drivers](https://www.up.com/about-us/history/steam/living-legend-844),
[Challenger, 69-inch drivers](https://www.up.com/heritage/steam/3985/), and
[Big Boy, 68-inch drivers and articulation](https://www.up.com/about-us/history/steam/big-boy-4014).
These sources guide proportions; they do not certify exact fidelity of the
existing stylized body art. The previously noted UP 844 smoke-deflector issue
remains outside this wheel/frame correction.

Validation now covers all 384 frames, starter inclusion, every tire's visible
lower arc, common rail contact, preview parity, closed loops, and articulation
rod separation. Historical validation counts below describe earlier revisions.

## Fleet review iteration

Jupiter has been removed from the catalog, profiles and selection flow. Old saves
equipped with Jupiter fall back to Ironbound No. 1. Its source art is archived,
not referenced by the game. `ACTIVE_LOCOMOTIVES` in `app/fleet-access.ts` now
limits the shop and selection flow to Ironbound No. 1, Southern 4501 and Big Boy.
The other seven models, their artwork and earned ownership remain stored for
one-at-a-time reintroduction. Saves equipped with a shelved model safely select
the starter. All three active engines are unlocked via `FLEET_REVIEW_UNLOCKED`.
This is access, not a grant of purchased ownership:
equipping during review does not spend Bonds or modify `ownedEngines`.
Turning the flag off restores normal prices and validates the saved selection
against earned ownership, falling back to the starter where necessary.

Both passenger coach bogies move 3% toward the car center: wheel left edges
are `[11, 25, 64, 78]`; rod anchors are `15.8%` and `68.8%`. Wheel diameter,
within-bogie spacing, rail height and connecting-rod width are unchanged.
Coach angular velocity uses the coach radius, independent of selected engine.

Brake application/release time constants are 0.32/0.24 seconds; the full service
brake time constant is 2.9 seconds. The pressure model reaches 54% in 250ms,
with continuous speed/distance integration and no instantaneous stop. Tests
exercise the full pressure-to-stop pipeline at 30 and 60 frames per second.

## Coordinate ownership

`scripts/build-locomotive-sprites.py` owns the purchased-engine registration.
Its `PROFILES` table names every engine individually. Do not infer shell or
stack positions from another class, DOM height, shop thumbnail, or atlas preview.

- Canvas: 960 × 340 normally; Big Boy uses 996 × 340 for its extended
  coupling. The extra 80 vertical pixels are transparent headroom.
- Rail reference height remains 260. All tires meet `rail_y = 332` on the
  sprite. CSS anchors this exact line to the coaches' 4% baseline,
  compensating for the transparent sprite margin at every responsive scale.
- Every remaining model has individually calibrated driver, leading, trailing
  and tender axle centers. The manifest includes their exact rendered pixel
  centers and diameters; TypeScript consumes these rather than a duplicate list.
- Driver spacing must exceed tire diameter by at least two source pixels.
- `body_bottom` and `tender_bottom` move shells only, not wheels.
- `stack_tip` is a measured coordinate in the original body component.
- The build transforms that point with the exact body scale and translation.
- Both `app/locomotive-registration.json` and the public `v3/profiles.json`
  are generated from that same calculation. The catalog imports the former.
- Store images and runtime sprite frames use the same assembled canvas.
- A content-hashed art revision is included in both image URLs so an older
  cached 260px sprite cannot be stretched into the new 340px canvas.
- The original starter artwork is unchanged. Its exhaust has a separate
  1280 × 552 body-local registration rectangle, with native tip (1043, 7).

The old elliptical atlas wheels and double-exposed inset-face rotation are no
longer used. New orthographic wheel masters are mechanically registered to a
square circular mask, and the complete wheel rotates about its neutral hub.
Wheels-free suspension frames and cast journal mounts connect every axle
to actual shell pixels. A bounded stationary foreground layer seats the upper
wheel crowns behind the chassis and puts outside-bearing truck frames over
their wheel faces, without hiding lower tires or driver crankpins. Each rod segment is
drawn between the exact adjacent crankpins, with separate articulated phases.

### Wheel seating refinement

The old composition drew all wheels last, in front of both body and suspension.
It hid the truck bearings and made wheels appear pasted onto the locomotive.
Its 8-pixel-wide journal strips could also satisfy a center-column contact test
despite obvious empty space beside them. This pass replaces those strips with
the retained cast suspension asset and changes only undercarriage compositing.
It does not move any axle, change any diameter, body/tender bounds, exhaust
socket, rail baseline, rod phase, or animation rate. Starter art is untouched.

`WHEEL_SEATING` owns the explicit crown depths for each model (source pixels):

| Model | Driver crown inset | Truck crown inset |
|---|---:|---:|
| Southern 4501 | 6 | 5 |
| PRR 1361 | 7 | 5 |
| NKP 765 | 6 | 5 |
| Santa Fe 3751 | 7 | 5 |
| N&W 611 | 9 | 6 |
| UP 844 | 6 | 5 |
| N&W 1218 | 5 | 4 |
| Challenger 3985 | 5 | 4 |
| Big Boy 4014 | 5 | 4 |

These are occlusion depths, not vertical wheel offsets. Only existing shell
and cast-frame pixels are reused; no new concept art replaces the locomotive.
Driver foreground stays within the top 20% of its diameter. Truck journal
faces may cover the hub, but the lower 35% of the wheel is protected. Rods stay
outside the driver faces. Natural space between articulated groups is retained;
it is not filled with a single rigid frame. The actual articulated layout is
documented by [Union Pacific](https://www.up.com/about-us/history/steam/big-boy-4014).
[Steamtown's locomotive photographs](https://www.nps.gov/stea/planyourvisit/locomotives.htm)
and [VMT's 611 reference](https://vmt.org/attractions/611) provide general visual
context, not dimensional calibration for these stylized source assets.

The regression gate checks lower tire visibility in all 144 frames, bounded
stationary occlusion, and final-frame compositing. A new negative control raises
each body by 20.8 pixels: every model must fail the **raw-shell** contact limits
before suspension is added. Supports can no longer conceal that regression.

Driver rotation is distance-derived from its measured pixel diameter. Small
wheels use the nearest integer turn rate (usually two turns per driver revolution;
Southern's enlarged rear wheel rounds to one) to
close the thirty-two-frame loop without a phase snap. This is a deliberate sprite
approximation, not exact independent small-wheel circumference simulation.

## Shell and frame review gates

Run from the checkout:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 scripts/build-locomotive-sprites.py
PYTHONDONTWRITEBYTECODE=1 python3 scripts/test-locomotive-registration.py
node --test tests/*.test.mjs
```

Pixel tests cover all nine extra models and all 144 frames. They check the
visible tire ring of EVERY axle against the finished frame, including leading,
trailing and tender wheels, not merely driver counts. They also check individual
wheel motion, circular bounds, hub stability, rail height, loop closure, and
preview/frame-zero agreement. Negative controls delete a rendered wheel while
leaving its profile intact, remove an axle declaration, restore Big Boy's
overlapping wheel diameter, and clip a stack. All must fail.

Contact values in the manifest are sampled from actual alpha silhouettes in a
narrow band around each axle. Negative values mean overlap; positive values
are gaps. The permitted maximum is zero pixels, including all small-wheel
supports. `raw_shell_gaps_px` separately records pre-suspension gaps and is
checked against per-model limits; intended suspension clearance is not itself
a defect. These tests are geometry regression checks, not a
claim of exact museum-replica fidelity. UP 844's previously documented smoke
deflectors remain a source-art limitation.

Tender axle counts follow the supplied component-pack configurations (four per
standard tender; six for Big Boy), not an assertion of exact current museum
tender configurations. Locomotive axle counts follow the declared Whyte layouts.

## Targeted axle and coupling tuning — August 28

- Southern 4501: trailing axle moved from section x=13% to 17.5%, placing
  its center near native-body x=194 inside the measured x=136..258 cab
  opening. All four main driver centers, diameters and leading axle stay
  unchanged. Raw arch clearance is 23px at the new point (25px guard limit);
  the existing outside-bearing frame bridges this intended clearance.
- PRR 1361: frontmost leading axle moved from x=96% to 94.5% (10 source
  pixels rearward). The other leading axle, drivers and trailing axle stay put.
- Big Boy: add 36 source pixels between tender and locomotive by extending
  its canvas, not squeezing either vehicle. Body, locomotive axles and rods
  translate together; tender and tender axles stay fixed. A steel drawbar
  spans the visible gap. Runtime width grows proportionally, preserving
  body scale, wheel diameter, angular speed, rail height and exhaust position.

Each profile now declares its own immutable canvas dimensions. The shop
preview and all 16 runtime frames use those dimensions. Pixel regression
tests use each frame's real width, including Big Boy's 3984×1360 sheet.
Other engines retain the previous sprites byte-for-byte.

### Southern rear-wheel sizing and focused fleet review

The rear supporting wheel previously reused the front pilot's 40px diameter.
Southern now declares an independent `trailing_size`: 55px versus its unchanged
80px drivers and 40px pilot wheel. This roughly 0.68 driver-diameter proportion
is a visual calibration against [TVRM's restoration photographs](https://www.tvrail.com/2014/01/09/southern-4501-steam-powers-resilient-icon/)
and the side drawing on pages 6–7 of the [NPS nomination](https://npgallery.nps.gov/GetAsset/d831052d-8ea7-423d-96e2-2e9bc6d682a8/),
not a claim of an exact historical trailing-wheel dimension. TVRM lists the
real locomotive's [63-inch drivers](https://www.tvrail.com/equipment/southern-4501/).
The rear axle stays at section x=17.5% and its tire remains on rail y=332.
The larger wheel reduces raw cab-arch clearance from 23px to 8px; its regression
limit tightens from 25px to 10px. Body, main drivers, rods, tender and exhaust
anchors do not move. Only Southern's preview and thirty-two-frame sheet change.

Clicking the shop backdrop returns to the railway and resumes play. Clicking
inside the panel, including a card or equip button, keeps the shop open.
The current-checkout browser pass verified exactly three cards, Southern equip
without dismissal, and backdrop dismissal. All 51 Node checks and 15 pixel/
geometry checks pass; the latter include every axle in all 144 retained frames.

## Replacement running-gear asset provenance

`public/assets/locomotive-shop/v4/source/` retains three generated masters and
their exact prompts: driver, truck wheel, and wheels-free bogie frame. One
parallel batch; no variants or retries. The generated driver has ten spokes
(the prompt asked for twelve); truck has eight. Both are neutral face-on steel.
The deterministic builder registers and circular-masks the masters, removes
low-alpha frame debris, and exports lossless WebP components. No starter asset
was changed. The new frame's actual bearing positions (12.5% / 87.5%) are used
for registration rather than the requested but unfulfilled 20% / 80% positions.

## New exhaust

`app/locomotive-exhaust.ts` is the pure particle model; the companion view draws
the generated texture. Every puff starts at locomotive-local (0, 0), registered
to the stack crown. Cadence follows four driver-revolution beats, with a gentle
idle simmer. Birth velocity and lifetime stay fixed through throttle changes.
Pause freezes simulation; reduced motion decreases cadence and turbulence;
equipping a different engine resets its plume. Only the active train mounts
the bounded 32-particle canvas. Store previews contain no smoke.

The 360 × 280 logical exhaust canvas has its outlet at (300, 260); matching CSS
translation pins this point to the stack at every responsive scale. It renders
at 1.5× resolution. Diagnostic `data-exhaust-ready` and `data-particles` attributes
make image readiness and emitter activity inspectable without game-state hooks.

## Texture provenance

One generated transparent raster asset, generation mode (not an edit), no
variants or retries. Source: `public/assets/locomotive-shop/v3/exhaust-puff-source.png`.
Runtime: `public/assets/locomotive-shop/v3/exhaust-puff.webp`, resized to 256 × 256
with alpha preserved; the canvas uses a grayscale presentation filter.

Exact generation prompt:

```text
Use case: stylized-concept
Asset type: game VFX particle sprite for animated coal exhaust in a side-view steam locomotive railway game
Primary request: ONE isolated single compact irregular billowing smoke puff, not a full plume.
Scene/backdrop: genuinely transparent background with real alpha; no opaque backdrop of any color and no checkerboard baked into the pixels.
Subject: a single connected puff of coal-exhaust smoke with a visible medium-density core, softly overlapping irregular billowing lobes, and a softly fading semitransparent wispy perimeter.
Style/medium: polished raster game VFX particle, richly textured soft volumetric smoke, readable when rendered at 24–110 pixels and animated with opacity.
Composition/framing: square canvas; puff centered; generous fully transparent padding on all sides; the entire soft perimeter remains within the canvas.
Lighting/mood: gentle diffuse lighting on gray lobes; no directional cast shadow.
Color palette: neutral warm medium-gray and charcoal, gently lit gray lobes; avoid pure black or white mass.
Constraints: genuine transparent alpha, including gradual semitransparent falloff at the edges; no hard silhouette; no ring; no hole; no train; no objects; no text; no UI; no full scene; no mockup; no full plume; no watermark.
```
