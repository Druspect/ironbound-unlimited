import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CONSIST_CAR_TYPES,
  DEFAULT_CONSIST,
  addConsistCar,
  removeAddedConsistCar,
} from "../app/steam-operations.ts";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("one store owns engines, carriages, and audio packs", () => {
  assert.match(page, />ENGINES<\/button>/);
  assert.match(page, />CARRIAGES<\/button>/);
  assert.match(page, />AUDIO PACKS<\/button>/);
  assert.match(page, /useState<"engines" \| "carriages" \| "audio">/);
  assert.doesNotMatch(page, />ENGINE SHOP<|>TRAIN CARS<|openScreen\("consist"\)/);
});

test("engine profiles expose sourced fact sheets without pretending proxies are historical", () => {
  assert.match(page, /<summary>FACT SHEET<\/summary>/);
  assert.match(page, /SOURCE \/ DESIGN REFERENCE/);
  assert.match(page, /fact\.accuracy !== "documented"/);
  assert.match(page, /Design proxy/);
});

test("all carriage types have unique production art and declared mass", () => {
  assert.equal(CONSIST_CAR_TYPES.length, 5);
  assert.equal(new Set(CONSIST_CAR_TYPES.map(({ art }) => art)).size, CONSIST_CAR_TYPES.length);
  for (const car of CONSIST_CAR_TYPES) {
    assert.match(car.art, /^\/assets\/carriages\/v1\/[a-z-]+\.webp$/);
    assert.ok(car.loadedTons > car.emptyTons);
    assert.ok(car.loadedTons - car.emptyTons >= 7);
  }
  assert.match(page, /src=\{car\.art\}/);
  assert.match(page, /src=\{selectedCar\.art\}/);
  assert.ok(CONSIST_CAR_TYPES.some(({ id, name }) => id === "observation-car" && name === "Observation Parlor"));
});

test("consist expansion stays varied and preserves head-end baggage", () => {
  const four = addConsistCar(DEFAULT_CONSIST);
  const five = addConsistCar(four);
  const six = addConsistCar(five);
  assert.deepEqual(four, ["pullman", "day-coach", "dining-car", "baggage-mail"]);
  assert.deepEqual(five, ["pullman", "day-coach", "dining-car", "day-coach", "baggage-mail"]);
  assert.deepEqual(six, ["observation-car", "pullman", "day-coach", "dining-car", "day-coach", "baggage-mail"]);
  assert.equal(new Set(six).size, 5, "the six-car default must show every researched body");
  assert.deepEqual(removeAddedConsistCar(six), five);
  assert.deepEqual(removeAddedConsistCar(five), four);
  assert.deepEqual(removeAddedConsistCar(four), [...DEFAULT_CONSIST]);
});

test("station service is visibly staged and remains safe under reduced motion", () => {
  assert.match(page, /assets\/stations\/service\/v1\/\$\{station\.serviceArt\}\.webp/);
  assert.doesNotMatch(page, /station-service-activity\.webp/);
  assert.match(page, /data-service-active=/);
  assert.match(page, /qaService/);
  assert.match(page, />BOARD<\/span>/);
  assert.match(page, />WATER<\/span>/);
  assert.match(css, /\.station-world\.service-active \.station-service-activity/);
  assert.match(css, /\.reduced-motion \.station-world\.service-active \.station-service-activity\s*\{[^}]*animation:\s*none/s);
  assert.match(page, /stationServiceProgress\(dwellRef\.current\.arrivalResources, serviceProgress\)/);
  assert.match(page, /latestMissedStationSequence\(/);
});

test("audio packs are selectable systems rather than disabled promises", () => {
  const audioPanel = page.slice(page.indexOf('{storeTab === "audio"'), page.indexOf('{screen === "options"'));
  assert.match(page, /AUDIO_PACKS\.map/);
  assert.match(page, /setSelectedAudioPack\(pack\.id\)/);
  assert.match(page, /soundscapeMix\(selectedAudioPackRef\.current/);
  assert.match(page, /selectedAudioPack,/);
  assert.doesNotMatch(audioPanel, /COMING SOON|IN PRODUCTION|<button disabled>COMING SOON<\/button>/);
});

test("the page carries an executable browser acceptance journey", () => {
  assert.match(page, /qaSuite/);
  assert.match(page, /P1 BROWSER ACCEPTANCE/);
  assert.match(page, /full visible platform coverage/);
  assert.match(page, /audio pack selection/);
  assert.match(page, /station-specific service art/);
  assert.match(page, /visible station service/);
  assert.match(page, /station\.dataset\.serviceActive === "true"/);
  assert.match(page, /data-browser-acceptance/);
});

test("a restarted run returns to a closed regulator with the train brake set", () => {
  const restart = page.slice(page.indexOf("const restartRun"), page.indexOf("const failureCopy"));
  assert.match(restart, /throttleRef\.current = 0/);
  assert.match(restart, /brakeRef\.current = true/);
  assert.match(restart, /setThrottle\(0\)/);
  assert.match(restart, /setBrakeEngaged\(true\)/);
  assert.doesNotMatch(restart, /setThrottle\(42\)|brakeRef\.current = false/);
});

test("store previews use one normalized comparison stage", () => {
  assert.match(css, /\.engine-preview\s*\{[^}]*height:\s*124px/s);
  assert.match(css, /\.engine-preview > img\s*\{[^}]*width:\s*94%[^}]*height:\s*86%[^}]*object-fit:\s*contain/s);
  assert.match(css, /\.engine-card:has\(\.engine-fact-sheet\[open\]\)\s*\{[^}]*grid-column:\s*1 \/ -1/s);
  assert.match(css, /\.engine-card:has\(\.engine-fact-sheet\[open\]\) \.engine-preview\s*\{[^}]*width:\s*min\(420px, 34%\)/s);
});

test("version-four persistence migrates earlier saves and includes reward and service continuity", () => {
  assert.match(page, /ironbound-save-v4/);
  assert.match(page, /ironbound-save-v3/);
  assert.match(page, /\?\? localStorage\.getItem\("ironbound-save-v2"\)/);
  assert.match(page, /\?\? localStorage\.getItem\("ironbound-save-v1"\)/);
  for (const field of ["throttle", "speed", "boilerLoad", "heat", "distance", "visualTravel", "brakeEngaged", "fuel", "water", "stationsWithoutService", "failure", "claimedStops", "servicedStationSequence"]) {
    assert.match(page, new RegExp(`\\b${field}\\b`));
  }
  assert.match(page, /parsed\.run\.fuel \?\? parsed\.run\.coal/);
  assert.match(page, /runFailureRef\.current = restoredFailure/);
  assert.match(page, /setRunFailure\(restoredFailure\)/);
  assert.match(page, /claimedStopsRef\.current = new Set/);
  assert.match(page, /servicedStationRef\.current = Math\.max/);
});

test("camera defaults to automatic fit and refits when the consist changes", () => {
  assert.match(page, /useState<CameraMode>\("auto"\)/);
  assert.match(page, /calculateTrainSceneGeometry\(viewportWidth, passengerWorldWidth, trainWorldWidth, cameraZoom\)/);
  assert.ok((page.match(/setCameraZoom\("auto"\)/g) ?? []).length >= 3);
});

test("the platform and carriage center share the same forty-percent world anchor", () => {
  assert.match(page, /viewportWidth \* 0\.40 \+ signedDistance/);
  assert.match(page, /const trainAnchor = passengerWorldWidth \/ 2/);
  assert.match(css, /\.train-wrap\s*\{[^}]*left:\s*40vw[^}]*translateX\(calc\(-1 \* var\(--train-anchor\)\)\)/s);
});

test("rail bed uses tapered ballast, perspective sleepers, and unequal rails", () => {
  assert.match(css, /\.track::before\s*\{[^}]*clip-path:\s*polygon/s);
  assert.match(css, /\.sleepers\s*\{[^}]*perspective\(480px\)[^}]*rotateX\(58deg\)/s);
  assert.match(css, /\.rail-far\s*\{[^}]*height:\s*2px[^}]*rotate\(\.38deg\)/s);
  assert.match(css, /\.rail-near\s*\{[^}]*height:\s*6px[^}]*rotate\(\.14deg\)/s);
});

test("oil and coal failures have fuel-correct language", () => {
  assert.match(page, /title: "Oil exhausted"/);
  assert.match(page, /title: "Coal exhausted"/);
  assert.match(page, /runFailure === "fuel"/);
  assert.doesNotMatch(page, /runFailure === "coal"/);
});
