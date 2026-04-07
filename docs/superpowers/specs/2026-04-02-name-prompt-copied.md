# Name Prompt Modal & Copied Feedback

Date: 2026-04-02

## Overview

Two small UI features: name prompt for users opening a room link without a saved display name, and "copied" feedback when clicking the room code.

## 1. Name Prompt Modal

**Problem:** Opening `/room/{code}` directly without prior Landing visit joins as "Anonymous".

**Design:**
- On Room mount, check `localStorage.getItem("displayName")`
- If null/empty: show a centered modal overlay
  - Dark backdrop (rgba(0,0,0,0.7))
  - Card with: room code, name input, "Join" button
  - Button disabled until name is entered
  - Input focused automatically
- Modal prevents interaction behind it
- On submit: save name to localStorage, dismiss modal, connect WebSocket + send `join`
- If name exists: skip modal, connect immediately (current flow)

**No backend changes.**

**Files:**
- `src/client/components/NamePrompt.tsx` (new) — modal component
- `src/client/components/NamePrompt.module.css` (new) — modal styles
- `src/client/pages/Room.tsx` — conditional render before WebSocket connect
- `test/components/name-prompt.test.tsx` (new) — component tests

## 2. "Copied!" Feedback

**Problem:** `handleRoomClick` copies to clipboard with no visual feedback.

**Design:**
- Add `copied` boolean state, set `true` on click, auto-reset after 1.5s
- Small label "copied" appears next to room code button
- Fade in/out with CSS transition
- Styled subtly: small font, muted color

**Files:**
- `src/client/pages/Room.tsx` — `copied` state, label render
- `src/client/pages/Room.module.css` — label styles
