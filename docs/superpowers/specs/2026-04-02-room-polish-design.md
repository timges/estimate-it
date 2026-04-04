# Room Polish — Design Spec

Date: 2026-04-02

## Overview

Five improvements based on manual testing feedback. Mix of bug fixes, missing features, and UX improvements.

## Changes

### 1. Join should fail if room doesn't exist

**Problem:** Entering any code in "Join" creates a room. No way to tell if a room is real.

**Fix:**
- Add `roomExists()` RPC to Room DO — checks `SELECT 1 FROM room` WITHOUT calling `ensureRoomExists()`
- Worker checks before WebSocket upgrade: if room doesn't exist, return 404 JSON
- Client shows error "Room not found" when WS fails to connect
- "Create" flow adds a `create` message type to ClientMessage — server calls `ensureRoomExists()` only on `create`, not on `join`
- Landing page "Create" button sends `{ type: "create" }` as first message; "Join" sends `{ type: "join" }`

**Files:**
- `src/worker/room.ts` — add `roomExists()`, split `join()` into create+join
- `src/worker/index.ts` — pre-upgrade room existence check
- `src/shared/types.ts` — add `create` to ClientMessage
- `src/client/pages/Room.tsx` — error handling on WS close (404 → "Room not found")
- `src/client/pages/Landing.tsx` — send create vs join first message

### 2. Next story must reset revealed state (BUG)

**Bug:** `store.ts` `story_changed` handler updates story objects but doesn't reset `revealed`, `estimates`, `consensus`, `myEstimate`, `currentEstimates`, or participant `hasEstimated`.

**Fix:** In the `story_changed` handler, reset all voting state (same as `re_vote_started` handler).

**Files:**
- `src/client/store/room.ts` — fix `story_changed` handler

### 3. Story list panel

**Missing:** Can only see the active story. No way to see pending/done/revealed stories.

**Fix:** Add `StoryList` component in sidebar below ParticipantList. Shows all stories grouped by status:
- Active (highlighted)
- Pending (position order)
- Done (with estimate result)
- Each item shows title + status badge + result if done

**Files:**
- `src/client/components/StoryList.tsx` (new)
- `src/client/components/StoryList.module.css` (new)
- `src/client/pages/Room.tsx` — add StoryList to sidebar
- `src/client/pages/Room.module.css` — sidebar layout

### 4. Change display name

**Missing:** Name is set once in localStorage, no way to change.

**Fix:**
- Add `rename` RPC to Room DO — updates `display_name` in participant table
- Add `rename` and `participant_renamed` to message types
- Click on your own name in ParticipantList → inline rename input
- Store handles rename in participants array

**Files:**
- `src/worker/room.ts` — add `rename()` RPC
- `src/shared/types.ts` — add `rename` ClientMessage, `participant_renamed` ServerMessage
- `src/client/components/ParticipantList.tsx` — click-to-rename on own name
- `src/client/components/ParticipantList.module.css` — rename input styles
- `src/client/store/room.ts` — handle `participant_renamed`
- `src/client/pages/Room.tsx` — wire rename handler

### 5. Replace consensus with stats

**Problem:** "Consensus" (most popular value) is misleading.

**Fix:** New `EstimateStats` type replacing `Consensus`:

```typescript
interface EstimateStats {
  median: FibonacciValue;
  min: FibonacciValue;
  max: FibonacciValue;
  distribution: { value: FibonacciValue; count: number }[];
}
```

- Server computes stats in `reveal()`, replaces `consensus` field
- `RevealBoard` shows distribution bar chart + range (min–max) + median
- Drop `Consensus` type from shared types

**Files:**
- `src/shared/types.ts` — add `EstimateStats`, remove `Consensus`
- `src/worker/room.ts` — compute stats in `reveal()`
- `src/client/components/RevealBoard.tsx` — replace consensus UI with stats
- `src/client/components/RevealBoard.module.css` — distribution bar styles
- `src/client/store/room.ts` — `consensus` → `stats`
