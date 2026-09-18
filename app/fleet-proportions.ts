/**
 * Fleet proportion contract
 * -------------------------
 * Running stock shares one world scale. The generic heavyweight coach is the
 * yardstick: 80 ft over the body with 36 in passenger-truck wheels. Documented
 * locomotives use engine+tender overall length; fictional/proxy art is marked
 * explicitly so a design estimate is never presented as historical fact.
 *
 * Stage A migration is intentionally gated. Engines without a profile retain
 * their previous render width until their review wave.
 */

export const CANONICAL_COACH_LENGTH_FEET = 80;
export const CANONICAL_COACH_WHEEL_DIAMETER_INCHES = 36;
export const CANONICAL_COACH_RENDER_WIDTH = 190;
export const CANONICAL_COACH_WHEEL_DIAMETER_RATIO =
  CANONICAL_COACH_WHEEL_DIAMETER_INCHES / (CANONICAL_COACH_LENGTH_FEET * 12);

export type FleetScaleBasis = "documented" | "visual-proxy";

export type FleetProportionProfile = {
  engineAndTenderLengthFeet: number;
  basis: FleetScaleBasis;
  note: string;
};

export const FLEET_PROPORTIONS: Readonly<Record<string, FleetProportionProfile>> = Object.freeze({
  "tom-thumb": {
    engineAndTenderLengthFeet: 76,
    basis: "visual-proxy",
    note: "Ironbound No. 1 is fictional; 76 ft is the house-road visual baseline against an 80 ft heavyweight coach.",
  },
  "southern-4501": {
    engineAndTenderLengthFeet: 77,
    basis: "documented",
    note: "Historic Southern 4501 overall engine+tender length baseline.",
  },
  "prr-1361": {
    engineAndTenderLengthFeet: 83,
    basis: "documented",
    note: "PRR K4s No. 1361 overall engine+tender length baseline.",
  },
});

const LEGACY_ENGINE_RENDER_BASE_WIDTH = 420;

export function legacyEngineRenderWidth(registeredTotalWidth = 50) {
  return LEGACY_ENGINE_RENDER_BASE_WIDTH * (registeredTotalWidth / 50);
}

export function engineRenderWidth(engineId: string, registeredTotalWidth = 50) {
  const profile = FLEET_PROPORTIONS[engineId];
  if (!profile) return legacyEngineRenderWidth(registeredTotalWidth);
  return CANONICAL_COACH_RENDER_WIDTH *
    (profile.engineAndTenderLengthFeet / CANONICAL_COACH_LENGTH_FEET);
}
