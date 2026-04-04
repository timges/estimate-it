# Room Polish — Stats Redesign & Bug Fixes

Date: 2026-04-02

## Overview

Three changes: stats widget redesign, join bug fix, rename UX improvement.

## 1. Stats Widget Redesign

**Replace current stats (median, min/max range, distribution bars) with:**

### Reveal layout (top to bottom):
1. **Participant cards** — each person's name + voted value, color-coded. Height proportional to value. This naturally shows disagreement (different heights = disagreement).
2. **Average** — large number, mean of numeric values (exclude ☕). Don't show if all votes are ☕.
3. **Distribution** — compact horizontal stacked bar segments, one per voted value. Each segment proportional to count. Fibonacci label on each segment.
4. **Consensus indicator** — "🎉 All agree!" replaces distribution when all votes match.

### Drop:
- Min/max range
- Median
- Separate consensus value/count

### Server changes:
- Replace `EstimateStats` with `RevealResult`:
  ```typescript
  interface RevealResult {
    average: number | null;
    distribution: { value: FibonacciValue; count: number }[];
    allAgree: boolean;
  }
  ```
- Return `RevealResult` from `reveal()` instead of `EstimateStats`

### Files:
- `src/shared/types.ts` — replace `EstimateStats` with `RevealResult`
- `src/worker/room.ts` — compute average + allAgree in `reveal()`
- `src/client/store/room.ts` — `stats` → `revealResult`
- `src/client/components/RevealBoard.tsx` — new layout
- `src/client/components/RevealBoard.module.css` — new styles
- `src/client/pages/Room.tsx` — pass `revealResult` prop

## 2. Join Bug Fix

**Problem:** Server sends `{ type: "error", message: "Room not found" }` but store only logs to console — no UI feedback.

**Fix:**
- Add `error: string | null` to store state
- Set error on `error` message type
- Room.tsx shows error screen with "Room not found" + link back to landing
- Clear error on navigate away

### Files:
- `src/client/store/room.ts` — add `error` state, set on error message
- `src/client/pages/Room.tsx` — error screen UI

## 3. Rename Pencil Icon

**Problem:** No discoverability — user doesn't know they can click their name.

**Fix:**
- Small pencil SVG icon next to own name in ParticipantList
- Always visible next to your own name (not just on hover)

### Files:
- `src/client/components/ParticipantList.tsx` — add pencil icon for own participant
- `src/client/components/ParticipantList.module.css` — icon styles
