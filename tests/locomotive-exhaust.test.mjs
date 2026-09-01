import assert from "node:assert/strict";
import test from "node:test";
import { createExhaustState, createExhaustMotion, stepExhaust, MAX_EXHAUST_PARTICLES } from "../app/locomotive-exhaust.ts";

const running = () => ({ ...createExhaustMotion(), paused: false, speed: 40, driverRadius: 30 });

test("puffs start at the stack tip, not a generic engine offset", () => {
  const state = createExhaustState();
  const motion = running();
  stepExhaust(state, motion, 0);
  motion.travel = 2 * Math.PI * motion.driverRadius / 4 + .001;
  stepExhaust(state, motion, .016);
  assert.equal(state.particles.length, 1);
  assert.deepEqual([state.particles[0].x, state.particles[0].y, state.particles[0].age], [0, 0, 0]);
});

test("exhaust cadence follows wheel travel at both 30 and 60 fps", () => {
  const simulate = (fps) => {
    const state = createExhaustState();
    const motion = running();
    stepExhaust(state, motion, 0);
    for (let i = 1; i <= fps; i++) {
      motion.travel = i / fps * (2 * Math.PI * motion.driverRadius + .001);
      stepExhaust(state, motion, 1 / fps);
    }
    return state;
  };
  assert.equal(simulate(30).particles.length, 4);
  assert.equal(simulate(60).particles.length, 4);
});

test("pause freezes existing puffs and resume does not burst", () => {
  const state = createExhaustState();
  const motion = running();
  stepExhaust(state, motion, 0);
  motion.travel = 50;
  stepExhaust(state, motion, .016);
  const before = structuredClone(state.particles);
  motion.paused = true;
  for (let i = 0; i < 100; i++) stepExhaust(state, motion, .016);
  assert.deepEqual(state.particles, before);
  motion.paused = false;
  stepExhaust(state, motion, .016);
  assert.equal(state.particles.length, before.length);
  assert.ok(state.particles[0].age > before[0].age);
});

test("throttle changes do not restart or change existing particle velocity", () => {
  const state = createExhaustState();
  const motion = running();
  stepExhaust(state, motion, 0);
  motion.travel = 50;
  stepExhaust(state, motion, .016);
  const first = state.particles[0];
  const velocity = [first.vx, first.vy];
  motion.load = 1;
  motion.speed = 90;
  stepExhaust(state, motion, .016);
  assert.deepEqual([first.vx, first.vy], velocity);
  assert.ok(first.age > 0 && first.x < 0 && first.y < 0);
});

test("idle exhaust rises gently; reduced motion emits less", () => {
  const idle = (reducedMotion) => {
    const state = createExhaustState();
    const motion = { ...running(), speed: 0, reducedMotion };
    for (let i = 0; i < 60; i++) stepExhaust(state, motion, 1 / 60);
    return state;
  };
  assert.ok(idle(false).particles.length > idle(true).particles.length);
  assert.ok(Math.abs(idle(false).particles[0].vx) < 10);
});

test("pool remains bounded, expires, and resets on engine replacement", () => {
  const state = createExhaustState();
  const motion = running();
  for (let i = 0; i < 300; i++) {
    motion.travel += 1000;
    stepExhaust(state, motion, 1 / 60);
    assert.ok(state.particles.length <= MAX_EXHAUST_PARTICLES);
  }
  for (let i = 0; i < 180; i++) stepExhaust(state, motion, 1 / 60);
  assert.equal(state.particles.length, 0);
  assert.equal(createExhaustState().particles.length, 0);
});
