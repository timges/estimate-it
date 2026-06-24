---
title: "Ambient Canvas Backgrounds — Visual Stacking Beats Event Detection"
date: 2026-06-24
category: design-patterns
module: src/client/components
problem_type: design_pattern
component: frontend_stimulus
severity: low
applies_when:
  - "Adding a fixed canvas background that must not block pointer events on UI above it"
  - "Ambient motion that should show through gaps between opaque UI surfaces"
  - "Decorative canvases that must respect prefers-reduced-motion"
  - "Background layers that should pause in inactive tabs"
tags:
  - canvas
  - particle-background
  - z-index
  - pointer-events
  - prefers-reduced-motion
  - accessibility
  - react
  - layering
---

# Ambient Canvas Backgrounds — Visual Stacking Beats Event Detection

## Context

A real-time planning-poker app needed an ambient, "alive" background — drifting particles with inter-particle connection lines and a soft cursor-reactive glow — without compromising the interactivity of the UI above it. The naive approach (a fixed canvas listening for mouse events, then deciding what to do based on which DOM element was under the cursor) turned into a tar pit of cross-browser inconsistencies and brittle DOM walks. The pattern that actually shipped is dramatically simpler: put the canvas behind everything, give it `pointer-events: none`, and let opaque UI surfaces occlude it visually. No detection, no tree-walking, no z-index wrappers.

## Guidance

### 1. Core layering

Render a fixed canvas at the document root with a negative `z-index` and `pointer-events: none`. The browser's own paint order — combined with opaque backgrounds on the UI — does the right thing automatically.

```css
.particleCanvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  pointer-events: none;
}
```

```tsx
<canvas
  ref={canvasRef}
  className={styles.particleCanvas}
  aria-hidden="true"
/>
```

`aria-hidden="true"` is non-negotiable — the canvas is decorative, and screen readers should ignore it.

### 2. Make UI surfaces explicitly opaque

The canvas being *behind* the UI only matters where the UI is *opaque*. Add real backgrounds (not `transparent`) to every container that should fully hide particles in its bounds:

```css
.header,
.sidebar,
.summary,
.stat,
.homeLink {
  background: var(--bg-tertiary);
}
```

Gaps between these surfaces naturally let particles show through, which is exactly the desired effect. Do **not** try to detect "is the cursor over a UI element?" — just paint the UI on top.

### 3. Centralize tunables

Particle counts, speeds, and connection distances belong in a single `CONFIG` object so they can be tuned in one place:

```ts
const CONFIG = {
  PARTICLE_COUNT: 120,
  VELOCITY_SCALE: 0.35,
  LINK_DISTANCE: 110,
  MAX_MOUSE_LINKS: 5,
  DPR_CAP: 2, // hard ceiling, not a tuning knob
} as const;
```

### 4. Respect motion preference natively

Use the raw `matchMedia` API and listen for changes — don't pull in `framer-motion`'s `useReducedMotion` for this single use case (the rest of the codebase uses `useReducedMotion` for component-level animations, but canvas rAF needs its own JS guard since the CSS kill-switch only affects CSS animations):

```ts
const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

const onMotionChange = (e: MediaQueryListEvent) => {
  // swap render mode: animated particles ↔ static gradient
};

mq.addEventListener("change", onMotionChange);

return () => mq.removeEventListener("change", onMotionChange);
```

A static gradient drawn on the canvas itself is the perfect reduced-motion fallback — zero animation cost.

### 5. Pause when the tab is hidden

`requestAnimationFrame` already throttles in background tabs, but listening to `visibilitychange` lets you skip work entirely:

```ts
document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancelAnimationFrame(rafId);
});
```

### 6. DPR-aware sizing, capped

Render at device-pixel resolution but cap the multiplier so high-DPI phones don't melt:

```ts
const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.DPR_CAP);
canvas.width = cssWidth * dpr;
canvas.height = cssHeight * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

## Why This Matters

**Detection-based occlusion is a losing game.** Three independent attempted approaches failed before the layering solution landed:

1. **`document.elementFromPoint()` + `getComputedStyle`** — Unreliable across browsers; computed background values come back in inconsistent formats (`rgba(...)`, `none`, gradients), and some browsers report `transparent` for elements that *do* paint opaquely.

2. **DOM tree-walking for ancestor backgrounds** — Brittle. `document.body` always has a background, so any walk that doesn't carefully prune it returns wrong answers. Nested transparency rules (`rgba(0,0,0,0.5)` over an opaque parent) compound the ambiguity.

3. **Wrapping the app in a z-index layer above the canvas** — This *does* solve layering, but the wrapper element captures pointer events and breaks clicks on everything inside it. Fixing that requires `pointer-events: none` on the wrapper, which collapses back into the layering solution anyway.

The reason the layering approach works is a fundamental property of the browser's paint order: **opaque pixels at a higher stacking context always cover lower ones**, with zero cooperation from JavaScript. Treating the canvas as "ambient backdrop" rather than "interactive layer" maps the responsibility to the right place — the browser, not the app.

It also avoids a class of subtle bugs around event delegation, focus traps, and `aria-hidden` confusion that arises when JS tries to selectively route events around a full-viewport canvas.

## When to Apply

- Adding a fixed-position decorative canvas (particles, auroras, animated gradients, starfields) that must not block clicks, hovers, or focus.
- Any background layer that should be occluded by opaque UI surfaces without JS coordination.
- Ambient motion that should respond to OS-level `prefers-reduced-motion` and tab visibility.
- Projects where adding a dependency (e.g. `framer-motion` for one hook) is more cost than benefit.
- Mobile / high-DPI targets where uncapped DPR scaling would tank performance.

**Do not apply** when:
- The canvas needs to be *interactive* itself (e.g. drawing tools, signature pads, game surfaces) — those need positive `z-index` and full pointer events.
- UI surfaces are intentionally translucent and the background should show through them — in that case, do not add opaque backgrounds to the UI.

## Examples

### Pointer-event handling — wrong way vs. right way

**Bad — `elementFromPoint` + computed-style sniffing:**

```ts
// `canvas` is the ParticleBackground's canvas ref
function isOverOpaqueUI(x: number, y: number): boolean {
  const el = document.elementFromPoint(x, y);
  if (!el || el === canvas) return false;
  const bg = getComputedStyle(el).backgroundColor;
  return bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
}
```

Breaks on elements with gradient backgrounds, and on stacked transparency. Maintenance cost is high; payoff is zero once layering does the job.

**Good — let paint order handle it:**

```css
.particleCanvas { z-index: -1; pointer-events: none; }
.header, .sidebar, .summary, .stat, .homeLink { background: var(--surface); }
```

No JS. No detection. Works identically on every browser.

### Wrapping the app above the canvas — broken vs. fixed

**Bad — wrapper above canvas:**

```tsx
<div style={{ position: "relative", zIndex: 1 }}>
  <App />
</div>
<ParticleCanvas style={{ position: "fixed", zIndex: 0 }} />
```

The wrapper blocks every click and hover on the app. Adding `pointer-events: none` to the wrapper defeats the purpose of the wrapper.

**Good — canvas below, UI naturally on top:**

```tsx
<ParticleCanvas style={{ position: "fixed", zIndex: -1, pointerEvents: "none" }} />
<App />
```

The DOM order already places UI after the canvas; with `z-index: -1` on the canvas, normal flow paints UI above it. No wrapper needed.

### Reduced-motion handling — heavy vs. light

**Heavy — `framer-motion` for one hook:**

```ts
import { useReducedMotion } from "framer-motion";
const reduced = useReducedMotion();
```

Adds a dependency, a bundle, and a context provider for one boolean.

**Light — native `matchMedia`:**

```ts
const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
mq.addEventListener("change", /* ... */);
```

Zero dependencies, same behavior, full control over cleanup.

## Related

- `src/client/components/ParticleBackground.tsx` — reference implementation
- `src/client/components/ParticleBackground.module.css` — z-index and `pointer-events` setup
- `docs/brainstorms/2026-06-24-particle-background-requirements.md` — source requirements
- `docs/plans/2026-06-24-001-feat-particle-background-plan.md` — implementation plan
- MDN: [Stacking context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context)
- MDN: [`pointer-events`](https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events)
- MDN: [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)