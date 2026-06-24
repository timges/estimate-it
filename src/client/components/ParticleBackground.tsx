import { useEffect, useRef } from "react";
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

function drawStaticGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#0a0a0a");
  gradient.addColorStop(1, "#050505");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const particleCount = 120;
    const maxMouseLinks = 5;

    const particles: Particle[] = [];
    const mouse: Mouse = { x: 0, y: 0, active: false };
    let rafId: number | null = null;

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = Math.floor(innerWidth * DPR);
      canvas.height = Math.floor(innerHeight * DPR);
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    const initParticles = () => {
      const { innerWidth, innerHeight } = window;
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * innerWidth,
          y: Math.random() * innerHeight,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          radius: 1 + Math.random() * 1.8,
        });
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

    const drawParticle = (p: Particle) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fill();
    };

    const drawLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      alpha: number,
      width = 1,
    ) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = width;
      ctx.stroke();
    };

    const frame = () => {
      const { innerWidth, innerHeight } = window;
      ctx.clearRect(0, 0, innerWidth, innerHeight);

      drawStaticGradient(ctx, innerWidth, innerHeight);

      // Update particle motion
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -10) p.x = innerWidth + 10;
        if (p.x > innerWidth + 10) p.x = -10;
        if (p.y < -10) p.y = innerHeight + 10;
        if (p.y > innerHeight + 10) p.y = -10;
      }

      // Draw particle-to-particle links
      const linkDistance = 110;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < linkDistance) {
            drawLine(
              a.x,
              a.y,
              b.x,
              b.y,
              (1 - dist / linkDistance) * 0.08,
            );
          }
        }
      }

      // Mouse interaction: connect the 5 closest particles to the cursor
      if (mouse.active) {
        const nearest = particles
          .map((p) => ({
            p,
            d: Math.hypot(p.x - mouse.x, p.y - mouse.y),
          }))
          .sort((a, b) => a.d - b.d)
          .slice(0, maxMouseLinks);

        for (const { p, d } of nearest) {
          const maxDist = 220;
          const alpha = Math.max(0, 1 - d / maxDist);
          const lineWidth = 1 + alpha * 1.6;
          drawLine(mouse.x, mouse.y, p.x, p.y, alpha * 0.45, lineWidth);
        }

        // Cursor glow
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fill();
      }

      // Draw particles on top
      for (const p of particles) drawParticle(p);

      rafId = requestAnimationFrame(frame);
    };

    const startAnimation = () => {
      resize();
      initParticles();
      frame();
    };

    const stopAnimation = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const renderStatic = () => {
      resize();
      const { innerWidth, innerHeight } = window;
      drawStaticGradient(ctx, innerWidth, innerHeight);
    };

    // Initial render based on motion preference
    if (motionQuery.matches) {
      renderStatic();
    } else {
      startAnimation();
    }

    const onMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        stopAnimation();
        renderStatic();
      } else {
        startAnimation();
      }
    };

    motionQuery.addEventListener("change", onMotionChange);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);

    return () => {
      stopAnimation();
      motionQuery.removeEventListener("change", onMotionChange);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.background} />;
}