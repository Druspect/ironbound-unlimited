"use client";

import { useEffect, useRef, useState } from "react";

const isTouchCapable = () =>
  navigator.maxTouchPoints > 0 || window.matchMedia("(any-pointer: coarse)").matches;

export default function TouchOrientationGuard() {
  const [blocked, setBlocked] = useState(false);
  const wasBlockedRef = useRef(false);

  useEffect(() => {
    const portraitQuery = window.matchMedia("(orientation: portrait)");
    const coarsePointerQuery = window.matchMedia("(any-pointer: coarse)");

    const update = () => {
      const nextBlocked = isTouchCapable() && portraitQuery.matches;
      const enteringBlockedState = nextBlocked && !wasBlockedRef.current;
      wasBlockedRef.current = nextBlocked;

      if (enteringBlockedState && !document.querySelector(".game-shell")) {
        const optionsButton = Array.from(document.querySelectorAll<HTMLButtonElement>(".top-actions button"))
          .find((button) => button.textContent?.trim() === "OPTIONS");
        optionsButton?.click();
      }

      const experience = document.querySelector<HTMLElement>(".experience");
      if (nextBlocked) {
        experience?.setAttribute("inert", "");
        experience?.setAttribute("aria-hidden", "true");
        document.documentElement.classList.add("touch-portrait-blocked");
      } else {
        experience?.removeAttribute("inert");
        experience?.removeAttribute("aria-hidden");
        document.documentElement.classList.remove("touch-portrait-blocked");
      }
      setBlocked(nextBlocked);
    };

    update();
    portraitQuery.addEventListener("change", update);
    coarsePointerQuery.addEventListener("change", update);
    window.addEventListener("resize", update, { passive: true });

    return () => {
      portraitQuery.removeEventListener("change", update);
      coarsePointerQuery.removeEventListener("change", update);
      window.removeEventListener("resize", update);
      document.documentElement.classList.remove("touch-portrait-blocked");
      const experience = document.querySelector<HTMLElement>(".experience");
      experience?.removeAttribute("inert");
      experience?.removeAttribute("aria-hidden");
    };
  }, []);

  if (!blocked) return null;

  return (
    <aside
      className="touch-orientation-guard"
      data-orientation-guard="blocked"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="orientation-guard-title"
      aria-describedby="orientation-guard-detail"
    >
      <div className="orientation-guard-mark" aria-hidden="true"><span /></div>
      <span className="orientation-guard-kicker">IRONBOUND UNLIMITED</span>
      <h1 id="orientation-guard-title">Rotate to landscape</h1>
      <p id="orientation-guard-detail">This railway is designed for a wide cab view. Turn your device sideways to continue.</p>
      <div className="orientation-guard-hint" aria-hidden="true"><i /> LANDSCAPE REQUIRED</div>
    </aside>
  );
}
