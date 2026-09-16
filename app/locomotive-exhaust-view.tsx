"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { engineAudioProfileFor } from "./engine-audio-profiles";
import {
  createExhaustAudioState,
  exhaustBeatGain,
  exhaustOneShotAsset,
  stepExhaustAudio,
} from "./exhaust-audio";
import { createExhaustState, stepExhaust } from "./locomotive-exhaust";
import type { ExhaustMotion } from "./locomotive-exhaust";

function persistedSoundEnabled() {
  try {
    const raw = window.localStorage.getItem("ironbound-save-v4");
    if (!raw) return true;
    const save = JSON.parse(raw);
    return save?.settings?.sound !== false;
  } catch {
    return true;
  }
}

export function ExhaustSmoke({ motion }: { motion: RefObject<ExhaustMotion> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const engineId = canvas.closest<HTMLElement>("[data-engine-sprite]")?.dataset.engineSprite ?? "tom-thumb";
    const audioProfile = engineAudioProfileFor(engineId);
    canvas.dataset.exhaustCharacter = audioProfile.exhaustCharacter;
    canvas.dataset.exhaustBeatsPerRevolution = String(audioProfile.beatsPerDriverRevolution);

    const texture = new Image();
    let ready = false;
    texture.onload = () => { ready = true; canvas.dataset.exhaustReady = "true"; };
    texture.onerror = () => { canvas.dataset.exhaustReady = "false"; };
    texture.src = "/assets/locomotive-shop/v3/exhaust-puff.webp";

    const exhaustAsset = exhaustOneShotAsset(audioProfile);
    const voices = Array.from({ length: 4 }, () => {
      const voice = new Audio(exhaustAsset);
      voice.preload = "auto";
      return voice;
    });
    let voiceIndex = 0;
    let mechanicalEvents = 0;
    let cachedSoundEnabled = true;
    let lastSoundCheck = -Infinity;

    const state = createExhaustState();
    const audioState = createExhaustAudioState();
    let frame = 0;
    let previous = performance.now();

    const draw = (now: number) => {
      const currentMotion: ExhaustMotion = {
        ...motion.current,
        beatsPerRevolution: audioProfile.beatsPerDriverRevolution,
      };
      stepExhaust(state, currentMotion, (now - previous) / 1000);
      const beatEvents = stepExhaustAudio(audioState, currentMotion, audioProfile.beatsPerDriverRevolution);
      if (beatEvents > 0) {
        mechanicalEvents += beatEvents;
        canvas.dataset.exhaustAudioEvents = String(mechanicalEvents);
        if (now - lastSoundCheck > 200) {
          cachedSoundEnabled = persistedSoundEnabled();
          lastSoundCheck = now;
        }
        if (cachedSoundEnabled && document.visibilityState === "visible") {
          for (let event = 0; event < beatEvents; event += 1) {
            const voice = voices[voiceIndex % voices.length];
            voiceIndex += 1;
            voice.pause();
            voice.currentTime = 0;
            voice.playbackRate = 1;
            voice.volume = exhaustBeatGain(audioProfile, currentMotion);
            void voice.play().catch(() => undefined);
          }
        }
      }

      const count = String(state.particles.length);
      if (canvas.dataset.particles !== count) canvas.dataset.particles = count;
      previous = now;
      context.clearRect(0, 0, 540, 420);
      context.save();
      context.scale(1.5, 1.5);
      for (const puff of state.particles) {
        if (!ready) break;
        const progress = puff.age / puff.life;
        const size = puff.size + progress * 72;
        context.save();
        context.translate(300 + puff.x, 260 + puff.y - size * .16);
        context.rotate(puff.rotation + progress * .25);
        context.globalAlpha = puff.opacity * Math.pow(1 - progress, 1.2);
        context.drawImage(texture, -size / 2, -size / 2, size, size);
        context.restore();
      }
      context.restore();
      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      texture.onload = null;
      texture.onerror = null;
      for (const voice of voices) {
        voice.pause();
        voice.removeAttribute("src");
        voice.load();
      }
    };
  }, [motion]);
  return <canvas className="exhaust-smoke" width={540} height={420} ref={canvasRef} aria-hidden="true" />;
}
