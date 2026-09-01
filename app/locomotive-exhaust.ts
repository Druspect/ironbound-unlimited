/** Locomotive-local coordinates: every particle is born at the stack's (0, 0). */
export type ExhaustMotion = {
  travel: number;
  driverRadius: number;
  speed: number;
  load: number;
  paused: boolean;
  reducedMotion: boolean;
};
export type ExhaustParticle = {
  age: number; life: number; x: number; y: number;
  vx: number; vy: number; size: number; opacity: number; rotation: number;
};
export type ExhaustState = {
  particles: ExhaustParticle[];
  previousTravel: number | null;
  beats: number;
  idle: number;
  seed: number;
};
export const MAX_EXHAUST_PARTICLES = 32;
export const createExhaustState = (): ExhaustState => ({ particles: [], previousTravel: null, beats: 0, idle: 0, seed: 17 });
export const createExhaustMotion = (): ExhaustMotion => ({ travel: 0, driverRadius: 40, speed: 0, load: .5, paused: true, reducedMotion: false });

function random(state: ExhaustState) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

export function stepExhaust(state: ExhaustState, motion: ExhaustMotion, elapsed: number) {
  const deltaTravel = state.previousTravel === null ? 0 : Math.max(0, motion.travel - state.previousTravel);
  state.previousTravel = motion.travel;
  if (motion.paused) return;
  const dt = Math.min(.05, Math.max(0, elapsed));
  const gentle = motion.reducedMotion;
  for (const particle of state.particles) {
    particle.age += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
  }
  state.particles = state.particles.filter((particle) => particle.age < particle.life);
  // Four exhaust beats per driving-wheel revolution; reduced motion keeps two.
  state.beats += deltaTravel / (2 * Math.PI * Math.max(1, motion.driverRadius)) * (gentle ? 2 : 4);
  const moving = motion.speed > 2;
  state.idle = moving ? 0 : state.idle + dt;
  let births = Math.floor(state.beats);
  state.beats -= births;
  if (!moving && state.idle >= (gentle ? .8 : .4)) {
    births++;
    state.idle = 0;
  }
  // Catch-up after a suspended tab must not create a giant burst.
  births = Math.min(3, births);
  for (let i = 0; i < births; i++) {
    const load = Math.max(0, Math.min(1, motion.load));
    state.particles.push({
      age: 0, life: 2.2 + random(state) * .6, x: 0, y: 0,
      vx: -(7 + Math.min(100, motion.speed) * .58) * (.88 + random(state) * .24),
      vy: -(37 + random(state) * 12) * (gentle ? .8 : 1),
      size: 10 + random(state) * 5,
      opacity: (moving ? .57 + load * .28 : .45) * (gentle ? .7 : 1),
      rotation: (random(state) - .5) * .7,
    });
  }
  if (state.particles.length > MAX_EXHAUST_PARTICLES) state.particles.splice(0, state.particles.length - MAX_EXHAUST_PARTICLES);
}
