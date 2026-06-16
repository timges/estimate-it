import type { FibonacciValue, Story } from "./types";
import { FIBONACCI_VALUES } from "./types";

/** Numeric point value of a card, or null for non-numeric cards (☕). */
export function numericValue(value: FibonacciValue): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Suggested final estimate: the most common non-☕ vote. Ties resolve to the
 * higher card. Returns null when there are no numeric votes.
 */
export function suggestFinalEstimate(
  values: FibonacciValue[]
): FibonacciValue | null {
  const counts = new Map<FibonacciValue, number>();
  for (const v of values) {
    if (v === "☕") continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }

  let best: FibonacciValue | null = null;
  let bestCount = 0;
  // FIBONACCI_VALUES is ascending; >= keeps the higher card on ties.
  for (const v of FIBONACCI_VALUES) {
    if (v === "☕") continue;
    const c = counts.get(v) ?? 0;
    if (c > 0 && c >= bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

/** Totals for the session summary. */
export function summarize(stories: Story[]): {
  totalPoints: number;
  unanimousCount: number;
} {
  let totalPoints = 0;
  let unanimousCount = 0;
  for (const s of stories) {
    if (s.finalEstimate) {
      const n = numericValue(s.finalEstimate);
      if (n !== null) totalPoints += n;
    }
    if (s.unanimous) unanimousCount += 1;
  }
  return { totalPoints, unanimousCount };
}
