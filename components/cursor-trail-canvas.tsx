"use client";

import { useEffect, useRef } from "react";

/**
 * Draws the visitor's own pointer movement back at them.
 *
 * This is the visual half of the observation idea. "14.32 m of cursor travel"
 * is a fact; a glowing line in the shape of how you actually moved is a
 * picture of *you*, and that's the part someone wants to show a friend.
 *
 * Positions are normalised to the viewport, so the drawing is a scaled map of
 * where the pointer has been on the page. Only the most recent stretch is
 * kept — the full history becomes scribble within a minute, while a decaying
 * tail stays legible and feels alive.
 *
 * Runs only while the panel is open, so a collapsed panel costs nothing.
 */

const MAX_POINTS = 190;
const DPR_CAP = 2;

export const CursorTrailCanvas = ({
  className = "",
  paused = false,
}: {
  className?: string;
  paused?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || paused) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e: PointerEvent) => {
      points.current.push({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
      if (points.current.length > MAX_POINTS) points.current.shift();
    };

    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      points.current.push({
        x: t.clientX / window.innerWidth,
        y: t.clientY / window.innerHeight,
      });
      if (points.current.length > MAX_POINTS) points.current.shift();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });

    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const pts = points.current;
      if (pts.length < 2) return;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Drawn as individual segments rather than one path so each can carry
      // its own alpha — that's what produces the comet tail.
      for (let i = 1; i < pts.length; i++) {
        const t = i / pts.length; // 0 = oldest, 1 = newest
        const a = pts[i - 1];
        const b = pts[i];

        ctx.beginPath();
        ctx.moveTo(a.x * w, a.y * h);
        ctx.lineTo(b.x * w, b.y * h);
        ctx.strokeStyle = `rgba(125, 211, 252, ${(t * 0.85).toFixed(3)})`;
        ctx.lineWidth = (0.6 + t * 2.1) * dpr;
        ctx.stroke();
      }

      // The head: a small bright dot where the pointer is right now.
      const head = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(head.x * w, head.y * h, 2.4 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(186, 230, 253, 0.95)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(head.x * w, head.y * h, 6.5 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(125, 211, 252, 0.16)";
      ctx.fill();
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("touchmove", onTouch);
    };
  }, [paused]);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
};
