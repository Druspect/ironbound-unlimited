"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { createExhaustState, stepExhaust } from "./locomotive-exhaust";
import type { ExhaustMotion } from "./locomotive-exhaust";

export function ExhaustSmoke({ motion }: { motion: RefObject<ExhaustMotion> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const texture = new Image();
    let ready = false;
    texture.onload = () => { ready = true; canvas.dataset.exhaustReady = "true"; };
    texture.onerror = () => { canvas.dataset.exhaustReady = "false"; };
    texture.src = "/assets/locomotive-shop/v3/exhaust-puff.webp";
    const state = createExhaustState();
    let frame = 0;
    let previous = performance.now();
    const draw = (now: number) => {
      stepExhaust(state, motion.current, (now - previous) / 1000);
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
    return () => { cancelAnimationFrame(frame); texture.onload = null; texture.onerror = null; };
  }, [motion]);
  return <canvas className="exhaust-smoke" width={540} height={420} ref={canvasRef} aria-hidden="true" />;
}
