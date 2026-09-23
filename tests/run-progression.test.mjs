import assert from "node:assert/strict";
import test from "node:test";

import {
  RUN_STATIONS,
  canCompleteRun,
  completeRun,
  completionBondPayout,
  consistRevenueMultiplier,
  createCareerProgress,
  createRunProgress,
  recordCareerCompletion,
  recordStationProgress,
  stationBondPayout,
  totalRunBonds,
} from "../app/run-progression.ts";
import {
  calculateServiceDurationSeconds,
  serviceSteamLocomotive,
  stationServiceProgress,
} from "../app/steam-operations.ts";

test("the route is a six-stop finite scheduled run with a full-service fourth stop and terminal", () => {
  assert.equal(RUN_STATIONS.length, 6);
  assert.equal(RUN_STATIONS[3].serviceKind, "full");
  assert.equal(RUN_STATIONS.at(-1).serviceKind, "full");
  assert.deepEqual(
    RUN_STATIONS.map((station) => station.name),
    ["Cinder Flats", "Copper Wash", "Saltworks", "Timberline", "Summit House", "Stillwater"],
  );
});

test("longer consists earn more but do not overwhelm progression", () => {
  const three = ["pullman", "day-coach", "baggage-mail"];
  const six = ["observation-car", "pullman", "day-coach", "dining-car", "day-coach", "baggage-mail"];

  assert.equal(consistRevenueMultiplier(three), 1);
  assert.ok(consistRevenueMultiplier(six) > 1.25);
  assert.ok(consistRevenueMultiplier(six) <= 1.38);

  const starter = stationBondPayout(500, 1, three);
  const heavy = stationBondPayout(500, 1.9, six);
  assert.equal(starter, 500);
  assert.ok(heavy > starter);
  assert.ok(heavy < 1_400);
  assert.ok(completionBondPayout(1.9, six) < 3_300);
});

test("run completion requires every scheduled stop and records persistent career totals", () => {
  let run = createRunProgress();
  for (const station of RUN_STATIONS.slice(0, 5)) {
    run = recordStationProgress(run, station.id, 300, 20);
  }
  assert.equal(canCompleteRun(run), false);
  assert.equal(completeRun(run, 1_000).completed, false);

  const terminal = RUN_STATIONS.at(-1);
  run = recordStationProgress(run, terminal.id, 600, 30);
  assert.equal(canCompleteRun(run), true);
  run = completeRun(run, 1_200);
  assert.equal(run.completed, true);
  assert.equal(totalRunBonds(run), 5 * 320 + 630 + 1_200);

  const career = recordCareerCompletion(createCareerProgress(), run);
  assert.equal(career.completedRuns, 1);
  assert.equal(career.totalStationsCleared, 6);
  assert.equal(career.lifetimeBondsEarned, totalRunBonds(run));
  assert.equal(career.bestRunBonds, totalRunBonds(run));
});

test("station service types alter only the resources that station actually provides", () => {
  const arrival = { fuel: 40, water: 25, stationsWithoutService: 3, failure: null };
  assert.deepEqual(serviceSteamLocomotive(arrival, "passenger"), arrival);
  assert.deepEqual(serviceSteamLocomotive(arrival, "water"), {
    fuel: 40,
    water: 100,
    stationsWithoutService: 3,
    failure: null,
  });
  assert.deepEqual(serviceSteamLocomotive(arrival, "full"), {
    fuel: 100,
    water: 100,
    stationsWithoutService: 0,
    failure: null,
  });

  const halfWater = stationServiceProgress(arrival, .5, "water");
  assert.equal(halfWater.fuel, 40);
  assert.equal(halfWater.water, 62.5);

  const profile = {
    fuelType: "coal",
    fuelCapacity: 20_000,
    waterCapacityGallons: 10_000,
  };
  const metrics = { carCount: 6 };
  assert.ok(
    calculateServiceDurationSeconds(arrival, metrics, profile, "full") >=
    calculateServiceDurationSeconds(arrival, metrics, profile, "passenger"),
  );
});
