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
  accelerationTimeConstant: 2.7,
  decelerationTimeConstant: 7.4,
  serviceBrakeTimeConstant: 2.9,
  brakeApplicationTimeConstant: 0.32,
  brakeReleaseTimeConstant: 0.24,
  thermalTimeConstant: 8.5,
  reliefTimeConstant: 3.4,
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

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
  const speedTime = targetSpeed >= state.speed
    ? LOCOMOTIVE_MODEL.accelerationTimeConstant / (accelerationFactor * throttleResponseFactor)
    : LOCOMOTIVE_MODEL.decelerationTimeConstant +
      (LOCOMOTIVE_MODEL.serviceBrakeTimeConstant * brakeResponseFactor / brakeRiggingFactor - LOCOMOTIVE_MODEL.decelerationTimeConstant) * brakePressure;
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
