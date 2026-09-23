import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../app/production-polish.css", import.meta.url), "utf8");

const ruleBody = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `missing rule block for ${selector}`);
  return match[1];
};

test("overheat state strengthens cab telemetry and peripheral warning cues", () => {
  for (const selector of [
    ".experience.is-overloaded .cab",
    ".experience.is-overloaded .speed-card",
    ".experience.is-overloaded .status-line",
    ".experience.is-overloaded .heat-monitor",
    ".experience.is-overloaded .vignette",
  ]) assert.ok(css.includes(selector), `missing ${selector}`);
});

test("safety salience remains geometry-neutral", () => {
  for (const selector of [
    ".experience.is-overloaded .cab",
    ".experience.is-overloaded .speed-card",
    ".experience.is-overloaded .vignette",
  ]) {
    assert.doesNotMatch(
      ruleBody(selector),
      /\b(?:position|left|right|top|bottom|width|height|transform)\s*:/,
      `${selector} must not move or resize the established composition`,
    );
  }
});

test("safety emphasis respects reduced-motion operation", () => {
  assert.match(css, /@keyframes production-safety-pulse/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.status-line i\s*\{[\s\S]*animation:\s*none !important;/);
});
