# Ironbound graphics acquisition standard

## Best source order

1. Commission or make original orthographic photography with a written game-art licence.
2. Request high-resolution reference files directly from the owning railroad, museum, or archive. Record the identity, date, rights contact, licence, and source URL before download.
3. Use clearly marked public-domain or permissively licensed archive material, saving the licence page and required attribution beside the asset.
4. Use ordinary web photographs only as private design references. Do not ship, trace, texture-map, or redistribute them.

Random image scraping is the weakest option: identity is often wrong, compression is poor, and usage rights are unclear. Automated collection should only follow an archive's terms, rate limits, and robots policy. Protected endpoints, paywalls, watermarks, and access controls are hard stops.

## Reference intake gate

- Confirm the exact locomotive number or carriage type from an authoritative roster.
- Prefer a long edge of at least 2,000 pixels, a near side elevation, visible running gear, and neutral daylight.
- Keep two views when possible: a clean side view for proportions and a three-quarter view for depth and hardware.
- Record proxy status explicitly for fictional engines. A proxy informs period design; it does not become a historical fact.
- Store references under `references/gfx-origin/` with a manifest entry. Nothing in that directory may be imported by game code.

## Original-art production gate

- Work on a transparent 900×348 carriage canvas and the registered locomotive canvases.
- Separate body, wheels, rods, smoke, and lights so animation is mechanically coherent.
- Match rail height and scale to the registration profile; do not stretch one undercarriage across unrelated wheel arrangements.
- Remove painted wheel faces from body layers. Wheels and rods must be driven from accumulated rail distance.
- Generate or illustrate multiple candidates, then reconcile silhouette, doors, window rhythm, roofline, tender type, and axle count against the fact sheet.

## Integration gate

- Optimize shipping art to alpha WebP and inspect it over both light and dark backgrounds.
- Require exact dimensions, unique paths, bounded file size, real alpha, and no reference-photo filenames in `public/`.
- Run unit boundaries, deterministic simulation tests, production build, desktop browser QA, and narrow-viewport QA.
- Reject an asset if its identity is ambiguous, its source cannot be traced, its licence is unclear, its wheels duplicate animated wheels, or its scale breaks the platform berth.

The current photographs are origin points only. The four shipping carriage bodies are original Ironbound assets derived from the project's visual language, not redistributed source photos.
