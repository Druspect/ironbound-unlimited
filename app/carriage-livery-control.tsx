"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ironbound-carriage-livery";

const LIVERIES = [
  { id: "pullman-green", name: "Pullman Green" },
  { id: "tuscan-red", name: "Tuscan Red" },
  { id: "coach-brown", name: "Coach Brown" },
  { id: "midnight-blue", name: "Midnight Blue" },
  { id: "oxide-red", name: "Oxide Red" },
  { id: "silver-gray", name: "Silver Gray" },
] as const;

type CarriageLiveryId = (typeof LIVERIES)[number]["id"];

const DEFAULT_LIVERY: CarriageLiveryId = "pullman-green";

const isCarriageLiveryId = (value: string | null): value is CarriageLiveryId =>
  LIVERIES.some((livery) => livery.id === value);

const applyLivery = (livery: CarriageLiveryId) => {
  document.documentElement.dataset.carriageLivery = livery;
};

export default function CarriageLiveryControl() {
  const [livery, setLivery] = useState<CarriageLiveryId>(DEFAULT_LIVERY);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const restored = isCarriageLiveryId(saved) ? saved : DEFAULT_LIVERY;
    applyLivery(restored);
    const frame = window.requestAnimationFrame(() => setLivery(restored));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const changeLivery = (next: CarriageLiveryId) => {
    setLivery(next);
    applyLivery(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <aside className="carriage-livery-control" aria-label="Passenger carriage livery">
      <span>PASSENGER CAR COLOR</span>
      <select
        aria-label="Passenger carriage color"
        value={livery}
        onChange={(event) => changeLivery(event.target.value as CarriageLiveryId)}
      >
        {LIVERIES.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
      <small>One coherent paint scheme is applied across the consist.</small>
    </aside>
  );
}
