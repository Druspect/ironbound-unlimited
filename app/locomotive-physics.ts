export type LocomotiveState = {
  speed: number;
  boilerLoad: number;
  heat: number;
  overloaded: boolean;
  safetyLockSeconds: number;
  distance: number;
};

export type LocomotivePhysicsConfiguration = {
  maximumSpeed?: number;
  accelerationFactor?: number;
  brakeResponseFactor?: number;
  thermalLoadFactor?: number;
  throttleResponseFactor?: number;
  adhesionFactor?: number;
  steamingCapacityFactor?: number;
  brakeRiggingFactor?: number;
};

export type AutomaticSandingState = {
  active: boolean;
  intensity: number;
  slipRisk: number;
  residualSlip: number;
  tractionMultiplier: number;
};

export const LOCOMOTIVE_MODEL = Object.freeze({
  gradePercent: 0.8,
  maximumSpeed: 92,
  heatThreshold: 90,
  heatTripLevel: 100,
  heatReleaseLevel: 30,
  boilerReleaseThreshold: 74,
  safetySpeedFraction: 0.1,
  minimumSafetyLockSeconds: 18,
  highThrottleThreshold: 82,
  startingAdhesionFadeSpeedMph: 12,
  sandingCutoutSpeedMph: 10,
  sandingThrottleThreshold: 52,
  sandingMaximumTractionBoost: 0.14,
  wheelSlipPenalty: 0.12,
  accelerationTimeConstant: 2.7,
  decelerationTimeConstant: 7.4,
  serviceBrakeTimeConstant: 2.9,
  brakeApplicationTimeConstant: 0.32,
  brakeReleaseTimeConstant: 0.24,
  brakingGradeResponsePerPercent: 0.055,
  brakingGradeTimeMinimum: 0.75,
  brakingGradeTimeMaximum: 1.25,
  thermalTimeConstant: 8.5,
  reliefTimeConstant: 3.4,
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const smoothstep = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Starting tractive effort is adhesion-limited. Engine-specific adhesion has
 * its strongest effect while lifting a consist from rest, then fades smoothly
 * to neutral by 12 MPH once wheel/rail grip is no longer the dominant launch
 * constraint.
 */
export function startingAdhesionMultiplier(speedMph: number, adhesionFactor = 1) {
  const adhesion = clamp(adhesionFactor, .75, 1.25);
  const progress = clamp(speedMph / LOCOMOTIVE_MODEL.startingAdhesionFadeSpeedMph, 0, 1);
  const lowSpeedWeight = 1 - smoothstep(progress);
  return 1 + (adhesion - 1) * lowSpeedWeight;
}

/**
 * Steam locomotives use sand on the rail when a strong low-speed application
 * approaches the available wheel/rail adhesion. The game handles that as an
 * automatic engineer action instead of another cab button: substantial steam
 * below 10 MPH opens the sanders, improving the launch while still leaving a
 * bounded residual slip penalty when demand is extreme. The entire effect is
 * gone at line speed, so sanding can never become a hidden top-speed upgrade.
 */
export function automaticSandingState(
  speedMph: number,
  throttle: number,
  gradePercent = LOCOMOTIVE_MODEL.gradePercent,
  adhesionFactor = 1,
): AutomaticSandingState {
  const speed = Math.max(0, speedMph);
  const regulator = clamp(throttle, 0, 100);
  const adhesion = clamp(adhesionFactor, .75, 1.25);
  const speedProgress = clamp(speed / LOCOMOTIVE_MODEL.sandingCutoutSpeedMph, 0, 1);
  const lowSpeedWeight = 1 - smoothstep(speedProgress);
  const throttleDemand = clamp((regulator - 35) / 65, 0, 1);
  const uphillDemand = 1 + clamp(gradePercent, 0, 3.5) * .08;
  const demand = throttleDemand * lowSpeedWeight * uphillDemand;
  const normalizedGrip = clamp((adhesion - .75) / .5, 0, 1);
  const availableGrip = .52 + normalizedGrip * .28;
  const slipRisk = clamp((demand - availableGrip) / .30, 0, 1);
  const active = speed < LOCOMOTIVE_MODEL.sandingCutoutSpeedMph &&
    regulator >= LOCOMOTIVE_MODEL.sandingThrottleThreshold &&
    demand >= .30;
  const intensity = active
    ? clamp((.38 + demand * .42 + slipRisk * .30) * lowSpeedWeight, 0, 1)
    : 0;
  const residualSlip = active ? slipRisk * (1 - intensity * .72) : slipRisk;
  const tractionMultiplier = Math.max(
    .8,
    (1 + intensity * LOCOMOTIVE_MODEL.sandingMaximumTractionBoost) *
      (1 - residualSlip * LOCOMOTIVE_MODEL.wheelSlipPenalty),
  );

  return { active, intensity, slipRisk, residualSlip, tractionMultiplier };
}

/** Fast valve response; pressure and train speed still change continuously. */
export function advanceBrakePressure(current: number, engaged: boolean, elapsedSeconds: number) {
  const dt = clamp(elapsedSeconds, 0, .1);
  const target = engaged ? 1 : 0;
  const time = engaged ? LOCOMOTIVE_MODEL.brakeApplicationTimeConstant : LOCOMOTIVE_MODEL.brakeReleaseTimeConstant;
  const pressure = clamp(current + (target - current) * (1 - Math.exp(-dt / time)), 0, 1);
  return !engaged && pressure < .001 ? 0 : pressure;
}

/**
 * Steam demand initially adds speed, but the last portion of the regulator
 * produces rapidly diminishing returns. This creates a hidden sustainable
 * maximum below 100% without placing a marked "correct answer" in the UI.
 */
export function targetSpeedForThrottle(
  throttle: number,
  overloaded: boolean,
  gradePercent = LOCOMOTIVE_MODEL.gradePercent,
  configuration: LocomotivePhysicsConfiguration = {},
) {
  const regulator = clamp(throttle, 0, 100);
  const excess = Math.max(0, regulator - LOCOMOTIVE_MODEL.highThrottleThreshold);
  const maximumSpeed = configuration.maximumSpeed ?? LOCOMOTIVE_MODEL.maximumSpeed;
  const speedScale = maximumSpeed / LOCOMOTIVE_MODEL.maximumSpeed;
  const indicatedSpeed = (regulator * 0.94 - excess * excess * 0.045) * speedScale;
  const accelerationFactor = clamp(configuration.accelerationFactor ?? 1, .45, 1.8);
  const adhesionFactor = clamp(configuration.adhesionFactor ?? 1, .75, 1.25);
  const gradePenalty = gradePercent * 4.2 / (accelerationFactor * adhesionFactor);
  const normalTarget = clamp(
    indicatedSpeed - gradePenalty,
    0,
    maximumSpeed,
  );

  // The governor closes the regulator to a strict ten percent of line speed.
  return overloaded
    ? Math.min(
      normalTarget,
        maximumSpeed * LOCOMOTIVE_MODEL.safetySpeedFraction,
      )
    : normalTarget;
}

/**
 * Boiler load is intentionally nonlinear above 82% regulator. Moderate power
 * settles safely, the low 90s demand close attention, and 100% eventually
 * crosses the safety threshold even though it looks faster moment-to-moment.
 */
export function boilerEquilibrium(
  throttle: number,
  overloaded: boolean,
  gradePercent = LOCOMOTIVE_MODEL.gradePercent,
) {
  const regulator = clamp(throttle, 0, 100);
  if (overloaded) return 30 + regulator * 0.06;

  const excess = Math.max(0, regulator - 80);
  return clamp(
    28 + regulator * 0.5 + excess * excess * 0.105 + gradePercent * 4,
    18,
    120,
  );
}

export function advanceLocomotive(
  state: LocomotiveState,
  throttle: number,
  elapsedSeconds: number,
  gradePercent = LOCOMOTIVE_MODEL.gradePercent,
  brakeApplication = 0,
  configuration: LocomotivePhysicsConfiguration = {},
): LocomotiveState {
  const dt = clamp(elapsedSeconds, 0, 0.1);
  if (dt === 0) return state;

  let overloaded = state.overloaded;
  // Defaults preserve older saves and simulations created before the heat
  // governor was added.
  let safetyLockSeconds = Math.max(0, state.safetyLockSeconds ?? 0);
  const thermalLoadFactor = clamp(configuration.thermalLoadFactor ?? 1, .75, 1.55);
  const steamingCapacityFactor = clamp(configuration.steamingCapacityFactor ?? 1, .75, 1.3);
  const thermalTarget = clamp(
    boilerEquilibrium(throttle, overloaded, gradePercent) * thermalLoadFactor / steamingCapacityFactor,
    0,
    120,
  );
  const thermalTime = overloaded
    ? LOCOMOTIVE_MODEL.reliefTimeConstant
    : LOCOMOTIVE_MODEL.thermalTimeConstant;
  const thermalBlend = 1 - Math.exp(-dt / thermalTime);
  const boilerLoad = clamp(
    state.boilerLoad + (thermalTarget - state.boilerLoad) * thermalBlend,
    0,
    100,
  );

  const heatRate = overloaded
    ? -(5 + Math.max(0, LOCOMOTIVE_MODEL.heatThreshold - boilerLoad) / 12)
    : boilerLoad > LOCOMOTIVE_MODEL.heatThreshold
      ? (boilerLoad - LOCOMOTIVE_MODEL.heatThreshold) * 0.72
      : -(1.8 + (LOCOMOTIVE_MODEL.heatThreshold - boilerLoad) / 22);
  const heat = clamp(
    (state.heat ?? 0) + heatRate * dt,
    0,
    LOCOMOTIVE_MODEL.heatTripLevel,
  );

  if (!overloaded && heat >= LOCOMOTIVE_MODEL.heatTripLevel) {
    overloaded = true;
    safetyLockSeconds = LOCOMOTIVE_MODEL.minimumSafetyLockSeconds;
  } else if (overloaded) {
    safetyLockSeconds = Math.max(0, safetyLockSeconds - dt);
  }

  if (
    overloaded &&
    safetyLockSeconds === 0 &&
    heat <= LOCOMOTIVE_MODEL.heatReleaseLevel &&
    boilerLoad <= LOCOMOTIVE_MODEL.boilerReleaseThreshold
  ) {
    overloaded = false;
  }

  const brakePressure = clamp(brakeApplication, 0, 1);
  const poweredTarget = targetSpeedForThrottle(throttle, overloaded, gradePercent, configuration);
  const targetSpeed = brakePressure > 0.001 ? 0 : poweredTarget;
  const accelerationFactor = clamp(configuration.accelerationFactor ?? 1, .45, 1.8);
  const brakeResponseFactor = clamp(configuration.brakeResponseFactor ?? 1, .8, 1.7);
  const throttleResponseFactor = clamp(configuration.throttleResponseFactor ?? 1, .65, 1.35);
  const brakeRiggingFactor = clamp(configuration.brakeRiggingFactor ?? 1, .7, 1.3);
  const sanding = automaticSandingState(state.speed, throttle, gradePercent, configuration.adhesionFactor);
  const launchAdhesion = startingAdhesionMultiplier(state.speed, configuration.adhesionFactor) * sanding.tractionMultiplier;
  // Once a service-brake application drives the powered target to zero, route
  // grade still has to influence the stop. Positive grade assists braking and
  // negative grade works against it. Expressing that gravitational effect as a
  // bounded modifier on the service-brake time constant preserves the existing
  // 0% grade calibration exactly while preventing steep route segments from
  // becoming either irrelevant or uncontrollable.
  const brakingGradeTimeFactor = brakePressure > 0.001
    ? clamp(
      1 - clamp(gradePercent, -3.5, 3.5) * LOCOMOTIVE_MODEL.brakingGradeResponsePerPercent,
      LOCOMOTIVE_MODEL.brakingGradeTimeMinimum,
      LOCOMOTIVE_MODEL.brakingGradeTimeMaximum,
    )
    : 1;
  const speedTime = targetSpeed >= state.speed
    ? LOCOMOTIVE_MODEL.accelerationTimeConstant / (accelerationFactor * throttleResponseFactor * launchAdhesion)
    : LOCOMOTIVE_MODEL.decelerationTimeConstant +
      (LOCOMOTIVE_MODEL.serviceBrakeTimeConstant * brakeResponseFactor * brakingGradeTimeFactor / brakeRiggingFactor - LOCOMOTIVE_MODEL.decelerationTimeConstant) * brakePressure;
  const speedBlend = 1 - Math.exp(-dt / speedTime);
  const rollingSpeed = clamp(
    state.speed + (targetSpeed - state.speed) * speedBlend,
    0,
    configuration.maximumSpeed ?? LOCOMOTIVE_MODEL.maximumSpeed,
  );
  // Train brakes take time to apply and bleed speed progressively. Once the
  // consist is nearly motionless, the fully set brake holds it at the platform
  // instead of leaving a permanent fractional crawl.
  const speed = brakePressure > 0.94 && rollingSpeed < 0.45 ? 0 : rollingSpeed;

  return {
    speed,
    boilerLoad,
    heat,
    overloaded,
    safetyLockSeconds,
    distance: state.distance + ((state.speed + speed) * 0.5) * dt / 3600,
  };
}