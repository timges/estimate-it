import { useEffect, useRef, type ReactElement } from "react";
import styles from "./ParticleBackground.module.css";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Mouse {
  x: number;
  y: number;
  active: boolean;
}

const CONFIG = {
  PARTICLE_COUNT: 120,
  MAX_MOUSE_LINKS: 5,
  VELOCITY_SCALE: 0.35,
  RADIUS_MIN: 1,
  RADIUS_MAX: 2.8,
  LINK_DISTANCE: 110,
  LINK_ALPHA_SCALE: 0.08,
  MOUSE_LINK_DISTANCE: 220,
  MOUSE_LINE_WIDTH_SCALE: 1.6,
  MOUSE_ALPHA_SCALE: 0.45,
  CURSOR_GLOW_RADIUS: 3.5,
  WRAP_MARGIN: 10,
  MAX_DPR: 2,
  GRADIENT_START: "#0a0a0a",
  GRADIENT_END: "#050505",
} as const;

function drawStaticGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, CONFIG.GRADIENT_START);
  gradient.addColorStop(1, CONFIG.GRADIENT_END);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fill();
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  alpha: number,
  width = 1,
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = width;
  ctx.stroke();
}

function initParticles(particles: Particle[]) {
  const { innerWidth, innerHeight } = window;
  particles.length = 0;
  for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      vx: (Math.random() - 0.5) * CONFIG.VELOCITY_SCALE,
      vy: (Math.random() - 0.5) * CONFIG.VELOCITY_SCALE,
      radius:
        CONFIG.RADIUS_MIN +
        Math.random() * (CONFIG.RADIUS_MAX - CONFIG.RADIUS_MIN),
    });
  }
}

function updateParticles(particles: Particle[]) {
  const { innerWidth, innerHeight } = window;
  const margin = CONFIG.WRAP_MARGIN;
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < -margin) p.x = innerWidth + margin;
    if (p.x > innerWidth + margin) p.x = -margin;
    if (p.y < -margin) p.y = innerHeight + margin;
    if (p.y > innerHeight + margin) p.y = -margin;
  }
}

function drawLinks(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  const distSq = CONFIG.LINK_DISTANCE * CONFIG.LINK_DISTANCE;
  for (let i = 0; i < particles.length; i++) {
    const a = particles[i];
    for (let j = i + 1; j < particles.length; j++) {
      const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (dx * dx + dy * dy < distSq) {
        const dist = Math.hypot(dx, dy);
        drawLine(
          ctx,
          a.x,
          a.y,
          b.x,
          b.y,
          (1 - dist / CONFIG.LINK_DISTANCE) * CONFIG.LINK_ALPHA_SCALE,
        );
      }
    }
  }
}

function drawMouseInteraction(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  mouse: Mouse,
  nearby: { p: Particle; d: number }[],
) {
  if (!mouse.active) return;

  // Fill pre-allocated buffer with all particles + distances, then
  // partial-sort to keep only the N closest without full-sort allocation.
  nearby.length = 0;
  for (const p of particles) {
    nearby.push({ p, d: Math.hypot(p.x - mouse.x, p.y - mouse.y) });
  }
  nearby.sort((a, b) => a.d - b.d);
  const nearest = nearby.slice(0, CONFIG.MAX_MOUSE_LINKS);

  for (const { p, d } of nearest) {
    const alpha = Math.max(0, 1 - d / CONFIG.MOUSE_LINK_DISTANCE);
    drawLine(
      ctx,
      mouse.x,
      mouse.y,
      p.x,
      p.y,
      alpha * CONFIG.MOUSE_ALPHA_SCALE,
      1 + alpha * CONFIG.MOUSE_LINE_WIDTH_SCALE,
    );
  }

  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, CONFIG.CURSOR_GLOW_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fill();
}

export default function ParticleBackground(): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const particles: Particle[] = [];
    const mouse: Mouse = { x: 0, y: 0, active: false };
    const nearby: { p: Particle; d: number }[] = [];
    let rafId: number | null = null;
    let running = false;

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.MAX_DPR);
      canvas.width = Math.floor(innerWidth * dpr);
      canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (motionQuery.matches) {
        drawStaticGradient(ctx, innerWidth, innerHeight);
      }
    };

    const frame = () => {
      const { innerWidth, innerHeight } = window;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      drawStaticGradient(ctx, innerWidth, innerHeight);

      updateParticles(particles);
      drawLinks(ctx, particles);
      drawMouseInteraction(ctx, particles, mouse, nearby);
      for (const p of particles) drawParticle(ctx, p);

      rafId = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      resize();
      if (particles.length === 0) initParticles(particles);
      frame();
    };

    const stop = () => {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const onPointerLeave = () => {
      mouse.active = false;
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else if (!motionQuery.matches) {
        start();
      }
    };

    const onMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        stop();
        resize();
      } else {
        start();
      }
    };

    if (motionQuery.matches) {
      resize();
    } else {
      start();
    }

    motionQuery.addEventListener("change", onMotionChange);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      motionQuery.removeEventListener("change", onMotionChange);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className={styles.background} aria-hidden="true" />
  );
}