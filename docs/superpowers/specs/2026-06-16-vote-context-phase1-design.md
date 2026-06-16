# Vote Context — Phase 1: A Complete Local Session

**Date:** 2026-06-16
**Status:** Approved design, ready for implementation planning

## Summary

estimate-it lets teams estimate stories, but the story experience is currently
dormant: the backend models stories (title, description, status, per-story
estimates) and the components exist (`StoryCard`, `StoryList`, `AddStory`), yet
`StoryCard` and `AddStory` are commented out in `Room.tsx`. There is no way to
add stories from the UI, no story context shown while voting, and no record of
what a story was finally estimated at.

This phase activates and properly designs the story workflow so a team can run a
whole planning meeting end to end — bring in a batch of issues, vote on each
with its context in view, and walk away with a summary — **with no external
services**.

This is the first of three phases. Phase 2 (GitHub import) and Phase 3 (Jira +
round-trip) will be designed separately and build on the "add issues" surface
and story model established here.

## Goals

1. **Bulk entry** — paste a list of issues (one per line) that all become
   pending stories at once.
2. **Story spotlight** — show the current story (title + description)
   prominently while voting and through the reveal.
3. **Edit & delete stories** — fix mistakes from a paste, remove unwanted items,
   correct titles/descriptions.
4. **Recorded final estimate** — after each reveal, capture the team's agreed
   number per story.
5. **Session summary** — once every story is done, show a clean recap of each
   story → its agreed estimate, with totals and copy-to-clipboard.

## Non-Goals (explicitly out of scope for Phase 1)

- GitHub / Jira import (Phase 2/3).
- Pushing estimates back to an external issue tracker.
- Reordering stories (drag/drop).
- Timers, voting history across sessions, per-participant analytics.
- A host/facilitator role. Consistent with the existing design, **anyone can
  reveal, set the final estimate, edit, and delete** — the tool stays low-ceremony.

## Design Principles Honored

- **Calm during the vote.** The spotlight is informative but quiet; long
  descriptions collapse so the cards keep center stage.
- **The reveal is the moment.** The final-estimate step rides on the existing
  reveal animation rather than competing with it.
- **Frictionless entry.** Bulk paste turns "18 issues" into one action.

---

## Data Model

### `story` table (Durable Object SQLite)

Add a nullable column:

```sql
final_estimate TEXT  -- a FibonacciValue, or NULL if never recorded
```

Migrated in via the existing `PRAGMA table_info(story)` check pattern already
used for the `participant` table's `client_id` / `disconnected_at` columns.

### `Story` type (`src/shared/types.ts`)

```ts
export interface Story {
  id: number;
  title: string;
  description: string;
  position: number;
  status: "pending" | "active" | "revealed" | "done";
  finalEstimate: FibonacciValue | null; // NEW
}
```

`getStories()` in `room.ts` reads and maps the new column.

---

## WebSocket Protocol Changes

### Client → Server (new)

```ts
| { type: "set_final_estimate"; value: FibonacciValue | null }
| { type: "edit_story"; id: number; title: string; description: string }
| { type: "delete_story"; id: number }
```

(`add_stories` already exists and is reused for bulk paste.)

### Server → Client (new)

```ts
| { type: "story_updated"; story: Story }   // patch one story, NO reveal reset
| { type: "story_deleted"; storyId: number }
```

**Critical distinction:** the existing `story_changed` handler in the store
resets the round (`revealed: false`, clears estimates, etc.) because it is used
for "next story" transitions. Edits and final-estimate updates must NOT reset
the round, so they use the **new** `story_updated` message, which only replaces
the matching story in the list. `story_changed` semantics are left untouched and
remain reserved for round transitions (`next_story`).

---

## Backend (`src/worker/room.ts`)

New/changed RPC methods (public instance methods, testable):

- **`setFinalEstimate(value: FibonacciValue | null)`** — updates the active
  (status `active` or `revealed`) story's `final_estimate`. No-op if there is no
  active story (ad-hoc voting). Broadcasts `story_updated` with the refreshed
  story.
- **`editStory(id, title, description)`** — updates title/description, broadcasts
  `story_updated`.
- **`deleteStory(id)`** — deletes the story **and its estimates**
  (`DELETE FROM estimate WHERE story_id = ?`). If the deleted story was the
  active/revealed one, the room returns to a no-active-story state (no
  auto-advance). Broadcasts `story_deleted`.
- **`getStories()`** — include `finalEstimate`.
- **`addStory()`** — unchanged; bulk paste calls it once per line with an empty
  description (already wired via `add_stories`).

The `message` switch in `webSocketMessage` gains `set_final_estimate`,
`edit_story`, and `delete_story` cases.

---

## Client

### Store (`src/client/store/room.ts`)

- `story_updated` → replace the matching story in `stories`; **do not** touch
  reveal/vote state.
- `story_deleted` → remove the story from `stories`; if it was the active story
  and the room is `revealed`, reset reveal state (`revealed:false`, clear
  estimates/result/myEstimate/currentEstimates).
- `story_added` and `story_changed` handlers stay as they are.

### Voting view (`src/client/pages/Room.tsx`)

Render state machine for the content area:

1. **Session summary** when `stories.length > 0` and no story is `active` or
   `pending` (all `done`) → render `SessionSummary`.
2. Otherwise **reveal** (`revealed === true`) → `RevealBoard`.
3. Otherwise **voting** → `StorySpotlight` + `CardGrid` + Reveal button.

`StorySpotlight` also renders above `RevealBoard` so context persists through the
reveal. The ad-hoc path (no stories at all) keeps working: spotlight shows its
"No Story" state and the summary never triggers.

### `StorySpotlight` (new component, evolves `StoryCard`)

- Panel above the card grid using the navy deck palette.
- Shows: progress pill (`{position-among-non-done} / {total}` — see Open Detail
  below), bold title, description.
- Description **clamps after ~3 lines** with a **show more / less** toggle;
  defaults collapsed when the text exceeds the clamp. Respects
  `prefers-reduced-motion` if the expand is animated.
- "No Story" state preserved for ad-hoc voting.

### Adding stories (`AddStory`, wired into the sidebar by `StoryList`)

Two modes in one component:

- **Single** (today's behavior): title + optional description.
- **Paste list**: a textarea. On submit, split on newlines; for each non-empty
  line, strip a leading bullet/number (`-`, `*`, `+`, `1.`, `1)`) and surrounding
  whitespace; send all via `add_stories` (title only, empty description).

### Edit & delete (in `StoryList`)

- Each story row gets edit and delete affordances (e.g. revealed on hover/focus,
  keyboard-accessible).
- **Edit** opens an inline form (reusing the `AddStory` single-mode fields)
  pre-filled with the story; submit sends `edit_story`.
- **Delete** uses a lightweight inline confirm (e.g. the row swaps to
  "Delete? ✓ ✕") — **never** a `window.confirm` dialog. Confirm sends
  `delete_story`.

### Final estimate (`RevealBoard`)

- After reveal, a **Final estimate** control appears (a compact card row or
  select), pre-filled with a smart default:
  - **Suggestion = the most common non-`☕` vote.** Ties break to the **higher**
    value. Pure consensus → that value.
- Anyone can change it; the choice syncs live via `set_final_estimate` →
  `story_updated`, so all clients see the agreed number update.
- **Next Story** advances as today; the story keeps its recorded
  `final_estimate`. If no final is chosen, it stays `null` and the summary shows
  `—`.
- Only shown when there is an active story (ad-hoc reveals have nowhere to record
  a final).

### `SessionSummary` (new component)

- Minimal recap (chosen design): per-story `title → final estimate`; stories with
  a non-consensus result tinted with the warning color; `null` finals show `—`.
- **Totals:** sum of numeric finals (`☕` and `null` excluded) as "total points";
  count of unanimous stories.
- **Copy summary** writes a markdown list to the clipboard, e.g.:

  ```
  - Add OAuth login — 5
  - Export to CSV — 3
  - Rate limiting — 13
  Total: 42 points across 6 stories
  ```

- Adding a new story (sidebar remains available) creates a `pending` story and
  resumes the voting flow.

---

## Components Summary

| Unit | Change | Responsibility |
|------|--------|----------------|
| `room.ts` | changed | migration, `setFinalEstimate`/`editStory`/`deleteStory`, story shape |
| `types.ts` | changed | `Story.finalEstimate`, 3 new client + 2 new server messages |
| `store/room.ts` | changed | `story_updated` (patch), `story_deleted` (remove + maybe reset) |
| `Room.tsx` | changed | state machine, wire add/edit/delete, spotlight, summary |
| `StorySpotlight` | new (from `StoryCard`) | current-story panel, collapsible description |
| `AddStory` | changed | single + paste-list modes; reused for edit |
| `StoryList` | changed | edit/delete affordances + inline confirm |
| `RevealBoard` | changed | final-estimate picker with smart default |
| `SessionSummary` | new | recap, totals, copy-to-markdown |

## Testing

Following the existing three-project Vitest setup:

- **Worker/unit (`test/unit/room.test.ts`)**: `final_estimate` persists and
  survives migration; `set_final_estimate` no-ops without an active story; bulk
  `add_stories`; `delete_story` removes the story and its estimates and resets an
  active round; `edit_story` updates fields.
- **Unit**: final-estimate suggestion math (mode, tie → higher, consensus);
  paste-list parser (bullet stripping, blank-line handling); summary totals
  (sum excludes `☕`/`null`, unanimous count).
- **Component (`test/components/`)**: spotlight clamp / show-more; bulk paste
  parsing through the form; edit + delete inline-confirm flow; `SessionSummary`
  render and copy payload.
- **VRT**: spotlight in the room view; session summary view.

## Open Details (decide during implementation, low risk)

- **Progress pill numerator**: "3 / 18" should count the current story's place in
  the run. Simplest correct definition: `(# done) + 1` of `total`. Confirm during
  implementation against the StoryList ordering.
- **Copy format**: markdown list (above). Plain enough to paste into GitHub/Jira/
  Slack.
