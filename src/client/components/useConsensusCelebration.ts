import { useEffect, useRef, type RefObject } from "react";
import confetti from "canvas-confetti";

// Brand voice only: Signal Blue, Signal Violet, Consensus Green. No rainbow.
const BRAND_COLORS = ["#3b82f6", "#8b5cf6", "#4ade80"];

function computeOrigin(el: HTMLElement | null): { x: number; y: number } {
  if (!el || typeof window === "undefined") return { x: 0.5, y: 0.5 };
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: 0.5, y: 0.5 };
  return {
    x: (rect.left + rect.width / 2) / window.innerWidth,
    y: (rect.top + rect.height / 2) / window.innerHeight,
  };
}

/**
 * Fires a single, brief, brand-colored confetti burst from the agreed cards
 * when the reveal lands on consensus. The burst is origin-locked to `originRef`
 * so it reads as bursting from the cards, not generic top-of-screen.
 *
 * Honors reduced motion twice over: it never schedules the burst when `enabled`
 * is false, and canvas-confetti's own `disableForReducedMotion` is a backstop.
 */
export function useConsensusCelebration(
  active: boolean,
  originRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  delayMs: number,
): void {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      firedRef.current = false;
      return;
    }
    if (!enabled || firedRef.current) return;
    firedRef.current = true;

    const timer = window.setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 90,
        startVelocity: 38,
        gravity: 1,
        ticks: 130,
        scalar: 0.9,
        origin: computeOrigin(originRef.current),
        colors: BRAND_COLORS,
        disableForReducedMotion: true,
        zIndex: 60,
      });
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [active, enabled, originRef, delayMs]);
}
