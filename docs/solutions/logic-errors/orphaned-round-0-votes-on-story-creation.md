---
title: "Votes lost on reveal when participants vote before a story exists"
date: "2026-06-23"
category: logic-errors
module: room-durable-object
problem_type: logic_error
component: service_object
severity: high
symptoms:
  - "All participants show checkmarks but reveal displays only a subset of votes"
  - "currentEstimates counter shows more estimates than reveal returns"
  - "Votes cast before the first story is added are silently orphaned"
root_cause: scope_issue
resolution_type: code_fix
tags:
  - orphaned-votes
  - round-0-migration
  - state-synchronization
  - durable-objects
  - planning-poker
---

# Votes lost on reveal when participants vote before a story exists

## Problem

Votes stored at `story_id = 0` (the "no story" round) become invisible to `reveal()` when the first story is added and auto-activates. The server's `getActiveStoryId()` shifts from `null` (falling back to round 0) to the new story's ID, but the votes remain at round 0. Client-side checkmarks persist because `estimate_received` messages carry no story context, creating a mismatch: all participants appear to have voted, but reveal returns fewer estimates.

## Symptoms

- Participants vote before any story exists. All show "Picking..." then "Estimated" checkmarks.
- Someone adds the first story. The story auto-activates.
- More participants vote. All show checkmarks.
- Reveal returns only votes cast AFTER the story was added. The pre-story votes are silently lost.
- The `currentEstimates` counter on the client can also drift when disconnected participants are cleaned up (secondary bug: `participant_left` didn't decrement the counter).

## What Didn't Work

- **Initial hypothesis: WebSocket reconnection loses votes.** Investigated the 15-second disconnect grace period, heartbeat ping/pong, and reconnection flow. Votes are correctly preserved across reconnections within the grace window. This was a red herring.
- **Hypothesis: race condition between estimate and reveal.** Durable Objects are single-threaded; no race is possible within a single DO. Messages from different sockets are processed sequentially.
- **Hypothesis: story_id changes between vote and reveal.** This turned out to be correct, but not due to explicit story switching — it was caused by the implicit auto-activation of the first story.

The key insight came from tracing `getActiveStoryId() ?? 0` through all three code paths (`estimate()`, `reveal()`, `getParticipants()`). They all use the same fallback, but the fallback value changes when the first story is created.

## Solution

### Fix 1: Migrate orphaned round-0 estimates on auto-activation

When `addStory()` auto-activates the first story, migrate any existing votes from `story_id = 0` to the new story's ID:

```typescript
// src/worker/room.ts — addStory()
if (autoActivated && !Number.isNaN(story.id)) {
  this.ctx.storage.sql.exec(
    `INSERT INTO estimate (story_id, participant_id, value, created_at)
     SELECT ?, participant_id, value, created_at FROM estimate WHERE story_id = 0
     ON CONFLICT(story_id, participant_id) DO UPDATE SET
       value = excluded.value, created_at = excluded.created_at`,
    story.id
  );
  this.ctx.storage.sql.exec("DELETE FROM estimate WHERE story_id = 0");
}
```

The `ON CONFLICT` clause handles the edge case where a participant somehow has votes at both round 0 and the new story (shouldn't happen in normal flow, but defensive).

### Fix 2: Broadcast `story_changed` with migration metadata

When the first story auto-activates, broadcast `story_changed` so clients reset their stale estimate state. Include `estimatedParticipantIds` so the client can preserve `myEstimate` and `hasEstimated` for migrated participants:

```typescript
// src/worker/room.ts — add_story handler
if (story.status === "active") {
  const estimatedIds = this.ctx.storage.sql
    .exec("SELECT participant_id FROM estimate WHERE story_id = ?", story.id)
    .toArray()
    .map((row) => String(row["participant_id"]));
  this.broadcast({
    type: "story_changed",
    story,
    estimateCount: this.getEstimateCount(),
    estimatedParticipantIds: estimatedIds.length > 0 ? estimatedIds : undefined,
  });
}
```

Without `estimatedParticipantIds`, the `story_changed` handler clears `myEstimate` and all `hasEstimated` flags — undoing the migration on the UI side.

### Fix 3: Client preserves state for migrated participants

The `story_changed` store handler checks `estimatedParticipantIds` before clearing state:

```typescript
// src/client/store/room.ts
case "story_changed":
  set((s) => {
    const migratedIds = new Set(msg.estimatedParticipantIds ?? []);
    const hasMigrated = migratedIds.size > 0;
    return {
      // ... story update, revealed reset ...
      myEstimate: hasMigrated && migratedIds.has(s.myParticipantId ?? "")
        ? s.myEstimate : null,
      currentEstimates: msg.estimateCount ?? 0,
      participants: s.participants.map((p) => ({
        ...p,
        hasEstimated: hasMigrated ? migratedIds.has(p.id) : false,
      })),
    };
  });
```

### Fix 4: Defensive counter management

- `participant_left` handler decrements `currentEstimates` when the leaving participant had `hasEstimated: true`
- `estimate_cleared` handler guards on `hasEstimated` before decrementing (prevents double-decrement)
- `removeParticipant` scoped to current round only (not all stories)
- Extracted `NO_STORY_ROUND_ID` constant replacing 7 magic `0` sentinels

## Why This Works

The root cause is a **scope mismatch**: votes were written in one scope (round 0 / no story) but read in another (the active story's ID). The `getActiveStoryId() ?? 0` pattern is consistent across all three code paths, but the value it returns changes when the first story is created.

The fix preserves votes across scope transitions by explicitly migrating them when the scope changes. The `estimatedParticipantIds` field ensures the client-side state stays in sync with the server-side migration, preventing the UI from clearing checkmarks that the server still has.

The secondary counter drift bug was caused by `participant_left` not accounting for the removed participant's vote. The `hasEstimated` guard ensures the counter only decrements when a vote actually existed.

## Prevention

- **Test round-0 → story transitions explicitly.** Any feature that changes `getActiveStoryId()` must account for existing votes at round 0.
- **Include story context in estimate messages.** The `estimate_received` and `estimate_cleared` messages currently carry only `participantId`. Adding `storyId` would let clients detect stale estimates and self-correct.
- **Named constants over magic values.** The `NO_STORY_ROUND_ID` constant makes the "no story" round explicit and searchable.
- **Counter sync: decrement on removal, not just on clear.** Any code path that removes a participant or their votes must update the counter.

## Related Issues

- Commit `292a41a`: introduced round-0 voting (the feature that created the orphaning path)
- Commit `4153471`: prior fix for ghost votes from disconnects (same counter-drift pattern)
- This is the first `docs/solutions/` entry in the project
