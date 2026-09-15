import registration from "./locomotive-registration.json" with { type: "json" };
import { ENGINE_FACT_SHEETS, wheelAxleCounts } from "./engine-facts.ts";
import { LOCOMOTIVES } from "./locomotive-catalog.ts";

export type NormalizedSilhouette = {
  engineId: string;
  wheelArrangement: string;
  bodyWidthRatio: number;
  bodyHeightRatio: number;
  tenderWidthRatio: number;
  tenderHeightRatio: number;
  driverDiameterRatio: number;
  stackXRatio: number;
  stackYRatio: number;
  driverAxles: number;
  leadingAxles: number;
  trailingAxles: number;
  tenderAxles: number;
  fingerprint: string;
};

export type IdentityValidationResult = {
  errors: string[];
  warnings: string[];
  silhouettes: Readonly<Record<string, NormalizedSilhouette>>;
};

const round = (value: number, places = 4) => Number(value.toFixed(places));

function silhouetteFor(engineId: string): NormalizedSilhouette {
  const profile = registration.profiles[engineId as keyof typeof registration.profiles];
  const facts = ENGINE_FACT_SHEETS[engineId];
  if (!profile || !facts) throw new Error(`Incomplete identity registration for ${engineId}`);

  const driverAxles = profile.axles.filter((axle) => axle.kind === "driver").length;
  const leadingAxles = profile.axles.filter((axle) => axle.kind === "leading").length;
  const trailingAxles = profile.axles.filter((axle) => axle.kind === "trailing").length;
  const tenderAxles = profile.axles.filter((axle) => axle.kind === "tender").length;
  const driverDiameters = profile.axles.filter((axle) => axle.kind === "driver").map((axle) => axle.diameter);
  const meanDriverDiameter = driverDiameters.reduce((sum, value) => sum + value, 0) / Math.max(1, driverDiameters.length);

  const bodyWidthRatio = profile.body_bounds.width / profile.canvas.width;
  const bodyHeightRatio = profile.body_bounds.height / profile.canvas.height;
  const tenderWidthRatio = profile.tender_bounds.width / profile.canvas.width;
  const tenderHeightRatio = profile.tender_bounds.height / profile.canvas.height;
  const driverDiameterRatio = meanDriverDiameter / profile.canvas.height;
  const stackXRatio = profile.smoke_socket.x / 100;
  const stackYRatio = profile.smoke_socket.y / 100;

  const normalized = [
    bodyWidthRatio,
    bodyHeightRatio,
    tenderWidthRatio,
    tenderHeightRatio,
    driverDiameterRatio,
    stackXRatio,
    stackYRatio,
  ].map((value) => round(value, 3));

  return {
    engineId,
    wheelArrangement: facts.wheelArrangement,
    bodyWidthRatio: round(bodyWidthRatio),
    bodyHeightRatio: round(bodyHeightRatio),
    tenderWidthRatio: round(tenderWidthRatio),
    tenderHeightRatio: round(tenderHeightRatio),
    driverDiameterRatio: round(driverDiameterRatio),
    stackXRatio: round(stackXRatio),
    stackYRatio: round(stackYRatio),
    driverAxles,
    leadingAxles,
    trailingAxles,
    tenderAxles,
    fingerprint: `${facts.wheelArrangement}|${normalized.join("|")}|${driverAxles}/${leadingAxles}/${trailingAxles}/${tenderAxles}`,
  };
}

export function normalizedFleetSilhouettes(): Readonly<Record<string, NormalizedSilhouette>> {
  return Object.freeze(Object.fromEntries(LOCOMOTIVES.map((engine) => [engine.id, silhouetteFor(engine.id)])));
}

export function validateLocomotiveIdentity(): IdentityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const catalogIds = LOCOMOTIVES.map((engine) => engine.id).sort();
  const factIds = Object.keys(ENGINE_FACT_SHEETS).sort();
  const registrationIds = Object.keys(registration.profiles).sort();

  if (catalogIds.join("|") !== factIds.join("|")) errors.push("Catalog and fact-sheet engine IDs diverge");
  if (catalogIds.join("|") !== registrationIds.join("|")) errors.push("Catalog and registration engine IDs diverge");

  const silhouettes = normalizedFleetSilhouettes();
  for (const engineId of catalogIds) {
    const facts = ENGINE_FACT_SHEETS[engineId];
    const profile = registration.profiles[engineId as keyof typeof registration.profiles];
    const silhouette = silhouettes[engineId];
    if (!facts || !profile || !silhouette) {
      errors.push(`${engineId}: missing catalog/facts/registration identity source`);
      continue;
    }

    if (profile.wheel_arrangement !== facts.wheelArrangement) {
      errors.push(`${engineId}: wheel arrangement ${profile.wheel_arrangement} disagrees with ${facts.wheelArrangement}`);
    }

    const expected = wheelAxleCounts(facts.wheelArrangement);
    if (silhouette.driverAxles !== expected.drivers) errors.push(`${engineId}: ${silhouette.driverAxles} registered driver axles, expected ${expected.drivers}`);
    if (silhouette.leadingAxles !== expected.leading) errors.push(`${engineId}: ${silhouette.leadingAxles} registered leading axles, expected ${expected.leading}`);
    if (silhouette.trailingAxles !== expected.trailing) errors.push(`${engineId}: ${silhouette.trailingAxles} registered trailing axles, expected ${expected.trailing}`);
    if (silhouette.tenderAxles < 2) errors.push(`${engineId}: tender registration has fewer than two axles`);

    if (silhouette.bodyWidthRatio < 0.45 || silhouette.bodyWidthRatio > 1.05) errors.push(`${engineId}: body width ratio ${silhouette.bodyWidthRatio} is outside the normalized silhouette envelope`);
    if (silhouette.bodyHeightRatio < 0.35 || silhouette.bodyHeightRatio > 1.05) errors.push(`${engineId}: body height ratio ${silhouette.bodyHeightRatio} is outside the normalized silhouette envelope`);
    if (silhouette.driverDiameterRatio < 0.12 || silhouette.driverDiameterRatio > 0.48) errors.push(`${engineId}: driver diameter ratio ${silhouette.driverDiameterRatio} is outside the normalized silhouette envelope`);
    if (silhouette.stackXRatio < 0.45 || silhouette.stackXRatio > 1.02) errors.push(`${engineId}: smoke-stack X ratio ${silhouette.stackXRatio} is outside the locomotive body envelope`);
    if (silhouette.stackYRatio < -0.02 || silhouette.stackYRatio > 0.45) errors.push(`${engineId}: smoke-stack Y ratio ${silhouette.stackYRatio} is outside the expected upper silhouette`);
  }

  const fingerprintGroups = new Map<string, string[]>();
  for (const silhouette of Object.values(silhouettes)) {
    const group = fingerprintGroups.get(silhouette.fingerprint) ?? [];
    group.push(silhouette.engineId);
    fingerprintGroups.set(silhouette.fingerprint, group);
  }
  for (const engineIds of fingerprintGroups.values()) {
    if (engineIds.length > 1) warnings.push(`Indistinguishable normalized silhouettes: ${engineIds.join(", ")}`);
  }

  return { errors, warnings, silhouettes };
}
