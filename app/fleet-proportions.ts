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
  sourceUrl?: string;
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
  "nkp-765": {
    engineAndTenderLengthFeet: 100,
    basis: "documented",
    note: "Fort Wayne Railroad Historical Society publishes an overall length of 100 ft.",
    sourceUrl: "https://fortwaynerailroad.org/nickel-plate-road-no-765/",
  },
  "atsf-3751": {
    engineAndTenderLengthFeet: 108 + 7 / 12,
    basis: "documented",
    note: "San Bernardino Railroad Historical Society lists engine+tender length as 108 ft 7 in.",
    sourceUrl: "https://www.sbrhs.org/equipment/santa-fe-3751/specifications.html",
  },
  "nw-611": {
    engineAndTenderLengthFeet: 110,
    basis: "documented",
    note: "Virginia DHR documents N&W 611 at 110 ft overall with tender.",
    sourceUrl: "https://www.dhr.virginia.gov/historic-registers/128-6479/",
  },
  "up-844": {
    engineAndTenderLengthFeet: 114 + 2.625 / 12,
    basis: "documented",
    note: "Union Pacific lists engine+tender length as 114 ft 2 5/8 in.",
    sourceUrl: "https://www.up.com/about-us/history/steam/living-legend-844",
  },
  "nw-1218": {
    engineAndTenderLengthFeet: 121,
    basis: "documented",
    note: "Virginia DHR documents N&W 1218 at 121 ft total length.",
    sourceUrl: "https://www.dhr.virginia.gov/historic-registers/128-6655/",
  },
  "challenger-3985": {
    engineAndTenderLengthFeet: 121 + 10.875 / 12,
    basis: "documented",
    note: "Union Pacific lists engine+tender length as 121 ft 10 7/8 in.",
    sourceUrl: "https://www.up.com/heritage/steam/3985/",
  },
  "big-boy-4014": {
    engineAndTenderLengthFeet: 132 + 9.875 / 12,
    basis: "documented",
    note: "Union Pacific lists engine+tender length as 132 ft 9 7/8 in.",
    sourceUrl: "https://www.up.com/about-us/history/steam/big-boy-4014",
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
