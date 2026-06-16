# Vote Context — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate and properly design estimate-it's story workflow so a team can paste in a batch of issues, vote on each with its context in view, edit/delete stories, record an agreed estimate per story, and end with a copyable session summary — all with no external services.

**Architecture:** Pure helper modules in `src/shared/` (parsing, estimate math) keep logic testable in the plain unit project. The Durable Object (`room.ts`) gains a `final_estimate` and `unanimous` column on `story`, three new RPC methods, and three new WebSocket message cases. The client gains two new store handlers, a `StorySpotlight` panel, a bulk-paste mode + edit/delete on the story sidebar, a final-estimate picker on the reveal board, and a `SessionSummary` view, wired together by a small render state-machine in `Room.tsx`.

**Tech Stack:** Cloudflare Workers + Durable Objects (SQLite), Hono, React 19, Zustand, Vite, TypeScript strict, Vitest (3 projects: cf/unit/components), Testing Library.

---

## Spec Reference

`docs/superpowers/specs/2026-06-16-vote-context-phase1-design.md`

## Implementation note (mechanism added beyond the prose spec)

The summary shows a "unanimous" count and tints non-unanimous stories. The client only receives the current reveal's estimates, so per-story agreement must be persisted. We add a nullable `unanimous` flag to `story`, written during `reveal()` from the value already computed as `allAgree`. This is the minimal mechanism for the approved summary design.

## File Structure

| File | Create/Modify | Responsibility |
|------|---------------|----------------|
| `src/shared/parse-stories.ts` | Create | Parse pasted text into story titles |
| `src/shared/estimates.ts` | Create | Final-estimate suggestion, points/summary math, markdown |
| `src/shared/types.ts` | Modify | `Story` fields; new client/server messages |
| `src/worker/room.ts` | Modify | Migration, `rowToStory`, `setFinalEstimate`/`editStory`/`deleteStory`, reveal writes `unanimous`, WS cases |
| `src/client/store/room.ts` | Modify | `story_updated` / `story_deleted` handlers |
| `src/client/components/StorySpotlight.tsx` (+`.module.css`) | Create | Current-story panel with collapsible description |
| `src/client/components/AddStory.tsx` (+`.module.css`) | Modify | Single + paste-list modes; reused for edit |
| `src/client/components/StoryList.tsx` (+`.module.css`) | Modify | Edit/delete affordances + inline delete confirm |
| `src/client/components/RevealBoard.tsx` (+`.module.css`) | Modify | Final-estimate picker with smart default |
| `src/client/components/SessionSummary.tsx` (+`.module.css`) | Create | Recap, totals, copy-to-markdown |
| `src/client/pages/Room.tsx` | Modify | Render state-machine; wire add/edit/delete/setFinal |
| `vitest.config.unit.ts` | Modify | Add new unit test files to `include` |

---

## Task 1: Story-line paste parser

**Files:**
- Create: `src/shared/parse-stories.ts`
- Test: `test/unit/parse-stories.test.ts`
- Modify: `vitest.config.unit.ts`

- [ ] **Step 1: Add the new test file to the unit project's include list**

In `vitest.config.unit.ts`, change the `include` array to:

```ts
include: [
  "test/unit/store.test.ts",
  "test/unit/dictionary.test.ts",
  "test/unit/parse-stories.test.ts",
  "test/unit/estimates.test.ts",
],
```

- [ ] **Step 2: Write the failing test**

Create `test/unit/parse-stories.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseStoryLines } from "../../src/shared/parse-stories";

describe("parseStoryLines", () => {
  it("returns one title per non-empty line", () => {
    expect(parseStoryLines("Add login\nExport CSV")).toEqual([
      "Add login",
      "Export CSV",
    ]);
  });

  it("ignores blank lines and trims whitespace", () => {
    expect(parseStoryLines("  Add login  \n\n\n  Export CSV\n")).toEqual([
      "Add login",
      "Export CSV",
    ]);
  });

  it("strips dash/star/plus bullet prefixes", () => {
    expect(parseStoryLines("- Add login\n* Export CSV\n+ Fix bug")).toEqual([
      "Add login",
      "Export CSV",
      "Fix bug",
    ]);
  });

  it("strips numbered list prefixes", () => {
    expect(parseStoryLines("1. Add login\n2) Export CSV")).toEqual([
      "Add login",
      "Export CSV",
    ]);
  });

  it("handles CRLF newlines", () => {
    expect(parseStoryLines("Add login\r\nExport CSV")).toEqual([
      "Add login",
      "Export CSV",
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseStoryLines("   \n\n")).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm vitest run test/unit/parse-stories.test.ts`
Expected: FAIL — cannot find module `parse-stories`.

- [ ] **Step 4: Write the implementation**

Create `src/shared/parse-stories.ts`:

```ts
// Matches a leading list marker: "- ", "* ", "+ ", "1. ", "1) " (with surrounding space).
const BULLET_PREFIX = /^\s*(?:[-*+]|\d+[.)])\s+/;

/**
 * Split pasted text into story titles: one per non-empty line, list markers
 * and surrounding whitespace removed.
 */
export function parseStoryLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(BULLET_PREFIX, "").trim())
    .filter((line) => line.length > 0);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run test/unit/parse-stories.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/shared/parse-stories.ts test/unit/parse-stories.test.ts vitest.config.unit.ts
git commit -m "feat: add story-line paste parser"
```

---

## Task 2: Estimate math (suggestion, totals, markdown)

**Files:**
- Create: `src/shared/estimates.ts`
- Test: `test/unit/estimates.test.ts`

> Depends on `Story.finalEstimate` and `Story.unanimous`, which are added to the type in this task's implementation step (Step 3) so the helpers compile. The full `Story` shape is finalized in Task 3.

- [ ] **Step 1: Add `finalEstimate` and `unanimous` to the `Story` interface**

In `src/shared/types.ts`, change the `Story` interface to:

```ts
export interface Story {
  id: number;
  title: string;
  description: string;
  position: number;
  status: "pending" | "active" | "revealed" | "done";
  finalEstimate: FibonacciValue | null;
  unanimous: boolean | null;
}
```

- [ ] **Step 2: Write the failing test**

Create `test/unit/estimates.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Story, FibonacciValue } from "../../src/shared/types";
import {
  suggestFinalEstimate,
  summarize,
  summaryMarkdown,
} from "../../src/shared/estimates";

function story(partial: Partial<Story>): Story {
  return {
    id: 1,
    title: "Story",
    description: "",
    position: 1,
    status: "done",
    finalEstimate: null,
    unanimous: null,
    ...partial,
  };
}

describe("suggestFinalEstimate", () => {
  it("returns the most common vote", () => {
    const values: FibonacciValue[] = ["3", "3", "5"];
    expect(suggestFinalEstimate(values)).toBe("3");
  });

  it("breaks ties toward the higher card", () => {
    const values: FibonacciValue[] = ["3", "8"];
    expect(suggestFinalEstimate(values)).toBe("8");
  });

  it("ignores coffee votes", () => {
    const values: FibonacciValue[] = ["5", "☕", "☕"];
    expect(suggestFinalEstimate(values)).toBe("5");
  });

  it("returns null when only coffee was voted", () => {
    const values: FibonacciValue[] = ["☕"];
    expect(suggestFinalEstimate(values)).toBeNull();
  });

  it("returns null for no votes", () => {
    expect(suggestFinalEstimate([])).toBeNull();
  });
});

describe("summarize", () => {
  it("sums numeric final estimates and counts unanimous stories", () => {
    const stories = [
      story({ finalEstimate: "5", unanimous: true }),
      story({ finalEstimate: "8", unanimous: false }),
      story({ finalEstimate: "☕", unanimous: false }),
      story({ finalEstimate: null, unanimous: null }),
    ];
    expect(summarize(stories)).toEqual({ totalPoints: 13, unanimousCount: 1 });
  });
});

describe("summaryMarkdown", () => {
  it("renders a list with a totals line", () => {
    const stories = [
      story({ id: 1, title: "Add login", finalEstimate: "5" }),
      story({ id: 2, title: "Export CSV", finalEstimate: null }),
    ];
    expect(summaryMarkdown(stories)).toBe(
      "- Add login — 5\n- Export CSV — —\nTotal: 5 points across 2 stories"
    );
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm vitest run test/unit/estimates.test.ts`
Expected: FAIL — cannot find module `estimates`.

- [ ] **Step 4: Write the implementation**

Create `src/shared/estimates.ts`:

```ts
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

/** Markdown recap suitable for pasting into GitHub/Jira/Slack. */
export function summaryMarkdown(stories: Story[]): string {
  const lines = stories.map((s) => `- ${s.title} — ${s.finalEstimate ?? "—"}`);
  const { totalPoints } = summarize(stories);
  lines.push(`Total: ${totalPoints} points across ${stories.length} stories`);
  return lines.join("\n");
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run test/unit/estimates.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/estimates.ts src/shared/types.ts test/unit/estimates.test.ts
git commit -m "feat: add estimate suggestion and summary math"
```

---

## Task 3: Story column migration, `unanimous` at reveal, and `setFinalEstimate`

**Files:**
- Modify: `src/shared/types.ts` (messages)
- Modify: `src/worker/room.ts`
- Test: `test/unit/room.test.ts`

- [ ] **Step 1: Add the new message types**

In `src/shared/types.ts`, add to the `ClientMessage` union:

```ts
  | { type: "set_final_estimate"; value: FibonacciValue | null }
```

And add to the `ServerMessage` union:

```ts
  | { type: "story_updated"; story: Story }
```

- [ ] **Step 2: Write the failing tests**

Add to `test/unit/room.test.ts` (inside the top-level `describe("Room", ...)`):

```ts
describe("setFinalEstimate", () => {
  it("records a final estimate on the active story", async () => {
    const stub = getStub("final-1");
    await runInDurableObject(stub, async (instance: Room) => {
      instance.createRoom();
      const story = instance.addStory("Story A", "");
      instance.nextStory(); // make it active
      const updated = instance.setFinalEstimate("8");
      expect(updated?.id).toBe(story.id);
      expect(updated?.finalEstimate).toBe("8");
      expect(instance.getRoomState().stories[0].finalEstimate).toBe("8");
    });
  });

  it("returns null when there is no active story", async () => {
    const stub = getStub("final-2");
    await runInDurableObject(stub, async (instance: Room) => {
      instance.createRoom();
      expect(instance.setFinalEstimate("5")).toBeNull();
    });
  });
});

describe("reveal unanimity", () => {
  it("marks the story unanimous when all non-coffee votes agree", async () => {
    const stub = getStub("unanimous-1");
    await runInDurableObject(stub, async (instance: Room) => {
      instance.createRoom();
      const a = instance.join("Alice");
      const b = instance.join("Bob");
      instance.addStory("Story A", "");
      instance.nextStory();
      instance.estimate(a.participant.id, "5");
      instance.estimate(b.participant.id, "5");
      instance.reveal();
      expect(instance.getRoomState().stories[0].unanimous).toBe(true);
    });
  });

  it("marks the story not unanimous when votes differ", async () => {
    const stub = getStub("unanimous-2");
    await runInDurableObject(stub, async (instance: Room) => {
      instance.createRoom();
      const a = instance.join("Alice");
      const b = instance.join("Bob");
      instance.addStory("Story A", "");
      instance.nextStory();
      instance.estimate(a.participant.id, "5");
      instance.estimate(b.participant.id, "8");
      instance.reveal();
      expect(instance.getRoomState().stories[0].unanimous).toBe(false);
    });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm vitest run test/unit/room.test.ts -t "setFinalEstimate"`
Expected: FAIL — `instance.setFinalEstimate is not a function`.

- [ ] **Step 4: Add the column migration**

In `src/worker/room.ts`, inside the `blockConcurrencyWhile` block, immediately after the `CREATE TABLE IF NOT EXISTS story (...)` statement, add:

```ts
      // Migrate story rows created before the result columns existed.
      const storyColumns = this.ctx.storage.sql
        .exec("PRAGMA table_info(story)")
        .toArray()
        .map((row) => String(row["name"]));
      if (!storyColumns.includes("final_estimate")) {
        this.ctx.storage.sql.exec(
          "ALTER TABLE story ADD COLUMN final_estimate TEXT"
        );
      }
      if (!storyColumns.includes("unanimous")) {
        this.ctx.storage.sql.exec(
          "ALTER TABLE story ADD COLUMN unanimous INTEGER"
        );
      }
```

- [ ] **Step 5: Add a `rowToStory` helper and use it in `getStories`/`addStory`**

In `src/worker/room.ts`, add this private helper (near the other private helpers):

```ts
  private rowToStory(row: Record<string, SqlStorageValue>): Story {
    const finalEstimate = row["final_estimate"];
    const unanimous = row["unanimous"];
    return {
      id: Number(row["id"]),
      title: String(row["title"]),
      description: String(row["description"]),
      position: Number(row["position"]),
      status: String(row["status"]) as Story["status"],
      finalEstimate:
        finalEstimate === null || finalEstimate === undefined
          ? null
          : (String(finalEstimate) as FibonacciValue),
      unanimous:
        unanimous === null || unanimous === undefined
          ? null
          : Number(unanimous) === 1,
    };
  }

  private getStoryById(id: number): Story | null {
    const rows = this.ctx.storage.sql
      .exec(
        "SELECT id, title, description, position, status, final_estimate, unanimous FROM story WHERE id = ?",
        id
      )
      .toArray();
    return rows.length > 0 ? this.rowToStory(rows[0]) : null;
  }
```

Replace the body of `getStories` with:

```ts
  private getStories(): Story[] {
    return this.ctx.storage.sql
      .exec(
        "SELECT id, title, description, position, status, final_estimate, unanimous FROM story ORDER BY position ASC"
      )
      .toArray()
      .map((row) => this.rowToStory(row));
  }
```

Replace the `return { ... }` at the end of `addStory` with:

```ts
    return this.rowToStory(row);
```

(The `SELECT` in `addStory` must also include the new columns. Change its query to:)

```ts
    const row = this.ctx.storage.sql
      .exec(
        "SELECT id, title, description, position, status, final_estimate, unanimous FROM story WHERE id = last_insert_rowid()"
      )
      .one();
```

> `SqlStorageValue` is the Cloudflare type for SQLite cell values; it is available from the `cloudflare:workers` ambient types already used in this file. If TypeScript cannot resolve it, type the parameter as `Record<string, string | number | null>` instead.

- [ ] **Step 6: Write `unanimous` during `reveal()`**

In `src/worker/room.ts`, in `reveal()`, both places that run `UPDATE story SET status = 'revealed' WHERE id = ?` must also write `unanimous`.

In the empty-estimates branch:

```ts
      const activeStoryId = this.getActiveStoryId();
      if (activeStoryId) {
        this.ctx.storage.sql.exec(
          "UPDATE story SET status = 'revealed', unanimous = 0 WHERE id = ?",
          activeStoryId
        );
      }
      return { estimates: [], revealResult: null };
```

In the main branch (after `allAgree` is computed):

```ts
    const activeStoryId = this.getActiveStoryId();
    if (activeStoryId) {
      this.ctx.storage.sql.exec(
        "UPDATE story SET status = 'revealed', unanimous = ? WHERE id = ?",
        allAgree ? 1 : 0,
        activeStoryId
      );
    }
```

- [ ] **Step 7: Add the `setFinalEstimate` RPC method**

In `src/worker/room.ts`, add (near `reVote`):

```ts
  setFinalEstimate(value: FibonacciValue | null): Story | null {
    const activeStoryId = this.getActiveStoryId();
    if (!activeStoryId) return null;
    this.ctx.storage.sql.exec(
      "UPDATE story SET final_estimate = ? WHERE id = ?",
      value,
      activeStoryId
    );
    return this.getStoryById(activeStoryId);
  }
```

- [ ] **Step 8: Wire the WebSocket case**

In `webSocketMessage`'s `switch`, add:

```ts
      case "set_final_estimate": {
        const story = this.setFinalEstimate(msg.value);
        if (story) this.broadcast({ type: "story_updated", story });
        break;
      }
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `pnpm vitest run test/unit/room.test.ts -t "setFinalEstimate"` then `pnpm vitest run test/unit/room.test.ts -t "reveal unanimity"`
Expected: PASS.

- [ ] **Step 10: Type-check and commit**

```bash
pnpm lint
git add src/shared/types.ts src/worker/room.ts test/unit/room.test.ts
git commit -m "feat: persist final estimate and unanimity on stories"
```

---

## Task 4: `editStory` and `deleteStory` RPC + WS cases

**Files:**
- Modify: `src/shared/types.ts` (messages)
- Modify: `src/worker/room.ts`
- Test: `test/unit/room.test.ts`

- [ ] **Step 1: Add the message types**

In `src/shared/types.ts`, add to `ClientMessage`:

```ts
  | { type: "edit_story"; id: number; title: string; description: string }
  | { type: "delete_story"; id: number }
```

And add to `ServerMessage`:

```ts
  | { type: "story_deleted"; storyId: number }
```

- [ ] **Step 2: Write the failing tests**

Add to `test/unit/room.test.ts`:

```ts
describe("editStory", () => {
  it("updates title and description", async () => {
    const stub = getStub("edit-1");
    await runInDurableObject(stub, async (instance: Room) => {
      instance.createRoom();
      const s = instance.addStory("Old", "old desc");
      const updated = instance.editStory(s.id, "New", "new desc");
      expect(updated?.title).toBe("New");
      expect(updated?.description).toBe("new desc");
    });
  });
});

describe("deleteStory", () => {
  it("removes the story and its estimates", async () => {
    const stub = getStub("delete-1");
    await runInDurableObject(stub, async (instance: Room) => {
      instance.createRoom();
      const a = instance.join("Alice");
      const s = instance.addStory("Story A", "");
      instance.nextStory();
      instance.estimate(a.participant.id, "5");
      instance.deleteStory(s.id);
      const state = instance.getRoomState();
      expect(state.stories).toHaveLength(0);
      expect(state.currentEstimates).toBe(0);
    });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm vitest run test/unit/room.test.ts -t "editStory"`
Expected: FAIL — `instance.editStory is not a function`.

- [ ] **Step 4: Add the RPC methods**

In `src/worker/room.ts`, add (near `addStory`):

```ts
  editStory(id: number, title: string, description: string): Story | null {
    this.ctx.storage.sql.exec(
      "UPDATE story SET title = ?, description = ? WHERE id = ?",
      title,
      description,
      id
    );
    return this.getStoryById(id);
  }

  deleteStory(id: number): void {
    this.ctx.storage.sql.exec("DELETE FROM estimate WHERE story_id = ?", id);
    this.ctx.storage.sql.exec("DELETE FROM story WHERE id = ?", id);
  }
```

- [ ] **Step 5: Wire the WebSocket cases**

In `webSocketMessage`'s `switch`, add:

```ts
      case "edit_story": {
        const story = this.editStory(msg.id, msg.title, msg.description);
        if (story) this.broadcast({ type: "story_updated", story });
        break;
      }
      case "delete_story": {
        this.deleteStory(msg.id);
        this.broadcast({ type: "story_deleted", storyId: msg.id });
        break;
      }
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run test/unit/room.test.ts -t "editStory"` then `pnpm vitest run test/unit/room.test.ts -t "deleteStory"`
Expected: PASS.

- [ ] **Step 7: Type-check and commit**

```bash
pnpm lint
git add src/shared/types.ts src/worker/room.ts test/unit/room.test.ts
git commit -m "feat: add edit and delete story RPC"
```

---

## Task 5: Client store handlers for `story_updated` and `story_deleted`

**Files:**
- Modify: `src/client/store/room.ts`
- Test: `test/unit/store.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `test/unit/store.test.ts` (follow the existing pattern in that file — `useRoomStore.getState().handleMessage(...)` then assert on `useRoomStore.getState()`). Use this block:

```ts
describe("story_updated / story_deleted", () => {
  const baseStory = {
    id: 1,
    title: "A",
    description: "",
    position: 1,
    status: "revealed" as const,
    finalEstimate: null,
    unanimous: null,
  };

  it("story_updated patches the story without resetting the reveal", () => {
    useRoomStore.setState({
      stories: [baseStory],
      revealed: true,
      estimates: [{ participantId: "p1", value: "5" }],
    });
    useRoomStore.getState().handleMessage({
      type: "story_updated",
      story: { ...baseStory, finalEstimate: "8" },
    });
    const state = useRoomStore.getState();
    expect(state.stories[0].finalEstimate).toBe("8");
    expect(state.revealed).toBe(true);
    expect(state.estimates).toHaveLength(1);
  });

  it("story_deleted removes the story", () => {
    useRoomStore.setState({
      stories: [{ ...baseStory, status: "pending" }],
      revealed: false,
    });
    useRoomStore.getState().handleMessage({ type: "story_deleted", storyId: 1 });
    expect(useRoomStore.getState().stories).toHaveLength(0);
  });

  it("story_deleted resets the reveal when the active story is removed", () => {
    useRoomStore.setState({
      stories: [baseStory],
      revealed: true,
      estimates: [{ participantId: "p1", value: "5" }],
      myEstimate: "5",
      currentEstimates: 1,
    });
    useRoomStore.getState().handleMessage({ type: "story_deleted", storyId: 1 });
    const state = useRoomStore.getState();
    expect(state.stories).toHaveLength(0);
    expect(state.revealed).toBe(false);
    expect(state.estimates).toHaveLength(0);
    expect(state.myEstimate).toBeNull();
    expect(state.currentEstimates).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run test/unit/store.test.ts -t "story_updated"`
Expected: FAIL — the message types are unhandled, so state does not change as asserted.

- [ ] **Step 3: Add the handlers**

In `src/client/store/room.ts`, inside the `handleMessage` `switch`, add these cases (after the existing `story_changed` case):

```ts
      case "story_updated":
        set((s) => ({
          stories: s.stories.map((st) =>
            st.id === msg.story.id ? msg.story : st
          ),
        }));
        break;

      case "story_deleted":
        set((s) => {
          const removed = s.stories.find((st) => st.id === msg.storyId);
          const wasActiveReveal =
            s.revealed &&
            (removed?.status === "active" || removed?.status === "revealed");
          return {
            stories: s.stories.filter((st) => st.id !== msg.storyId),
            ...(wasActiveReveal
              ? {
                  revealed: false,
                  estimates: [],
                  revealResult: null,
                  myEstimate: null,
                  currentEstimates: 0,
                }
              : {}),
          };
        });
        break;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run test/unit/store.test.ts -t "story_updated"`
Expected: PASS (3 tests).

- [ ] **Step 5: Type-check and commit**

```bash
pnpm lint
git add src/client/store/room.ts test/unit/store.test.ts
git commit -m "feat: handle story_updated and story_deleted in store"
```

---

## Task 6: `StorySpotlight` component

**Files:**
- Create: `src/client/components/StorySpotlight.tsx`
- Create: `src/client/components/StorySpotlight.module.css`
- Test: `test/components/story-spotlight.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `test/components/story-spotlight.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import type { Story } from "../../src/shared/types";
import StorySpotlight from "../../src/client/components/StorySpotlight";

function makeStory(partial: Partial<Story> = {}): Story {
  return {
    id: 1,
    title: "Add OAuth login",
    description: "Short description",
    position: 1,
    status: "active",
    finalEstimate: null,
    unanimous: null,
    ...partial,
  };
}

describe("StorySpotlight", () => {
  it("shows the title, progress, and description", () => {
    render(<StorySpotlight story={makeStory()} position={3} total={18} />);
    expect(screen.getByText("Add OAuth login")).toBeInTheDocument();
    expect(screen.getByText("3 / 18")).toBeInTheDocument();
    expect(screen.getByText("Short description")).toBeInTheDocument();
  });

  it("shows the no-story state when story is null", () => {
    render(<StorySpotlight story={null} position={1} total={0} />);
    expect(screen.getByText(/no story/i)).toBeInTheDocument();
  });

  it("offers show more/less only for long descriptions", async () => {
    const user = userEvent.setup();
    const long = "x".repeat(200);
    render(<StorySpotlight story={makeStory({ description: long })} position={1} total={1} />);
    const toggle = screen.getByRole("button", { name: /show more/i });
    await user.click(toggle);
    expect(screen.getByRole("button", { name: /show less/i })).toBeInTheDocument();
  });

  it("does not offer a toggle for short descriptions", () => {
    render(<StorySpotlight story={makeStory()} position={1} total={1} />);
    expect(screen.queryByRole("button", { name: /show more/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project components test/components/story-spotlight.test.tsx`
Expected: FAIL — cannot find module `StorySpotlight`.

- [ ] **Step 3: Write the component**

Create `src/client/components/StorySpotlight.tsx`:

```tsx
import { useState } from "react";
import type { Story } from "../../shared/types";
import styles from "./StorySpotlight.module.css";

interface StorySpotlightProps {
  story: Story | null;
  position: number;
  total: number;
}

const LONG_DESCRIPTION_CHARS = 140;

export default function StorySpotlight({
  story,
  position,
  total,
}: StorySpotlightProps) {
  const [expanded, setExpanded] = useState(false);

  if (!story) {
    return (
      <div className={styles.panel}>
        <div className={styles.label}>No story</div>
        <div className={styles.title}>Estimating…</div>
        <div className={styles.description}>
          Discuss the story verbally, then pick your estimate.
        </div>
      </div>
    );
  }

  const isLong = story.description.length > LONG_DESCRIPTION_CHARS;
  const collapsed = isLong && !expanded;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.label}>Now estimating</span>
        <span className={styles.progress}>
          {position} / {total}
        </span>
      </div>
      <div className={styles.title}>{story.title}</div>
      {story.description && (
        <div
          className={`${styles.description} ${collapsed ? styles.clamped : ""}`}
        >
          {story.description}
        </div>
      )}
      {isLong && (
        <button
          className={styles.toggle}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write the styles**

Create `src/client/components/StorySpotlight.module.css`:

```css
.panel {
  background: linear-gradient(160deg, var(--deck-navy-top, #1a1a2e), var(--deck-navy-bottom, #16213e));
  border: 1px solid var(--deck-edge, #2a2a4a);
  border-radius: 12px;
  padding: 16px 18px;
  margin: 24px 24px 8px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--accent-sky, #60a5fa);
  font-weight: 600;
}

.progress {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--deck-navy-selected-top, #0f2440);
  border: 1px solid var(--deck-edge, #2a2a4a);
  border-radius: 9999px;
  padding: 2px 10px;
}

.title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 8px 0 4px;
}

.description {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.clamped {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.toggle {
  margin-top: 6px;
  background: none;
  border: none;
  color: var(--accent-sky, #60a5fa);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run --project components test/components/story-spotlight.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/client/components/StorySpotlight.tsx src/client/components/StorySpotlight.module.css test/components/story-spotlight.test.tsx
git commit -m "feat: add StorySpotlight component"
```

---

## Task 7: Bulk paste mode in `AddStory`

**Files:**
- Modify: `src/client/components/AddStory.tsx`
- Modify: `src/client/components/AddStory.module.css`
- Test: `test/components/add-story.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `test/components/add-story.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import AddStory from "../../src/client/components/AddStory";

describe("AddStory bulk paste", () => {
  it("adds one story per pasted line via onAddMany", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onAddMany = vi.fn();
    render(<AddStory onAdd={onAdd} onAddMany={onAddMany} />);

    await user.click(screen.getByRole("button", { name: /add story/i }));
    await user.click(screen.getByRole("button", { name: /paste list/i }));

    const textarea = screen.getByPlaceholderText(/one per line/i);
    await user.type(textarea, "- Add login{enter}- Export CSV");
    await user.click(screen.getByRole("button", { name: /^add 2/i }));

    expect(onAddMany).toHaveBeenCalledWith(["Add login", "Export CSV"]);
    expect(onAdd).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project components test/components/add-story.test.tsx`
Expected: FAIL — `onAddMany` prop / "Paste list" button do not exist.

- [ ] **Step 3: Update the component**

Replace `src/client/components/AddStory.tsx` with:

```tsx
import { useState } from "react";
import { parseStoryLines } from "../../shared/parse-stories";
import styles from "./AddStory.module.css";

interface AddStoryProps {
  onAdd: (title: string, description: string) => void;
  onAddMany: (titles: string[]) => void;
}

type Mode = "closed" | "single" | "bulk";

export default function AddStory({ onAdd, onAddMany }: AddStoryProps) {
  const [mode, setMode] = useState<Mode>("closed");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bulkText, setBulkText] = useState("");

  const parsed = parseStoryLines(bulkText);

  const reset = () => {
    setTitle("");
    setDescription("");
    setBulkText("");
    setMode("closed");
  };

  const handleSingleSubmit = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), description.trim());
    reset();
  };

  const handleBulkSubmit = () => {
    if (parsed.length === 0) return;
    onAddMany(parsed);
    reset();
  };

  if (mode === "closed") {
    return (
      <button className={styles.trigger} onClick={() => setMode("single")}>
        + Add Story
      </button>
    );
  }

  return (
    <div className={styles.form}>
      <div className={styles.modeTabs}>
        <button
          className={mode === "single" ? styles.tabActive : styles.tab}
          onClick={() => setMode("single")}
        >
          Single
        </button>
        <button
          className={mode === "bulk" ? styles.tabActive : styles.tab}
          onClick={() => setMode("bulk")}
        >
          Paste list
        </button>
      </div>

      {mode === "single" ? (
        <>
          <label className={styles.label} htmlFor="story-title">
            Story Title
          </label>
          <input
            id="story-title"
            className={styles.input}
            placeholder="Story title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus={window.matchMedia("(pointer: fine)").matches}
            name="storyTitle"
            autoComplete="off"
          />
          <label className={styles.label} htmlFor="story-description">
            Description
          </label>
          <textarea
            id="story-description"
            className={styles.textarea}
            placeholder="Description (optional)…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            name="storyDescription"
            autoComplete="off"
          />
          <div className={styles.actions}>
            <button className={styles.cancel} onClick={reset}>
              Cancel
            </button>
            <button
              className={styles.submit}
              onClick={handleSingleSubmit}
              disabled={!title.trim()}
            >
              Add
            </button>
          </div>
        </>
      ) : (
        <>
          <label className={styles.label} htmlFor="story-bulk">
            Paste issues
          </label>
          <textarea
            id="story-bulk"
            className={styles.textarea}
            placeholder="One per line…"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={6}
            name="storyBulk"
            autoComplete="off"
          />
          <div className={styles.actions}>
            <button className={styles.cancel} onClick={reset}>
              Cancel
            </button>
            <button
              className={styles.submit}
              onClick={handleBulkSubmit}
              disabled={parsed.length === 0}
            >
              Add {parsed.length || ""}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add styles for the tabs**

Append to `src/client/components/AddStory.module.css`:

```css
.modeTabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.tab,
.tabActive {
  flex: 1;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid var(--border-default);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.tabActive {
  background: var(--bg-raised);
  color: var(--text-primary);
  border-color: var(--border-strong);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run --project components test/components/add-story.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/client/components/AddStory.tsx src/client/components/AddStory.module.css test/components/add-story.test.tsx
git commit -m "feat: add bulk paste mode to AddStory"
```

---

## Task 8: Edit/delete affordances in `StoryList`

**Files:**
- Modify: `src/client/components/StoryList.tsx`
- Modify: `src/client/components/StoryList.module.css`
- Test: `test/components/story-list.test.tsx` (add to existing file)

> Heads-up: this task adds two required props to `StoryList`, which `Room.tsx` already renders. `Room.tsx` is updated to pass them in Task 11, so `pnpm lint` will report a missing-prop error on `Room.tsx` between this task and Task 11. That is expected — `pnpm test` (transpile-only) stays green; defer the `pnpm lint` gate to Task 11.

- [ ] **Step 1: Write the failing test**

Add to `test/components/story-list.test.tsx`:

```tsx
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
// (existing imports of render/screen/StoryList/Story remain)

describe("StoryList edit and delete", () => {
  const stories = [
    {
      id: 1,
      title: "Add login",
      description: "",
      position: 1,
      status: "pending" as const,
      finalEstimate: null,
      unanimous: null,
    },
  ];

  it("calls onDeleteStory after confirming", async () => {
    const user = userEvent.setup();
    const onDeleteStory = vi.fn();
    render(
      <StoryList
        stories={stories}
        onEditStory={vi.fn()}
        onDeleteStory={onDeleteStory}
      />
    );
    await user.click(screen.getByRole("button", { name: /delete add login/i }));
    await user.click(screen.getByRole("button", { name: /confirm delete/i }));
    expect(onDeleteStory).toHaveBeenCalledWith(1);
  });

  it("calls onEditStory with edited values", async () => {
    const user = userEvent.setup();
    const onEditStory = vi.fn();
    render(
      <StoryList
        stories={stories}
        onEditStory={onEditStory}
        onDeleteStory={vi.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /edit add login/i }));
    const input = screen.getByDisplayValue("Add login");
    await user.clear(input);
    await user.type(input, "Add SSO login");
    await user.click(screen.getByRole("button", { name: /^save/i }));
    expect(onEditStory).toHaveBeenCalledWith(1, "Add SSO login", "");
  });
});
```

> If `test/components/story-list.test.tsx` does not already import `describe`/`it`/`expect`, rely on the `globals: true` setting (the components project enables it) or add the imports to match the file's existing style.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project components test/components/story-list.test.tsx -t "edit and delete"`
Expected: FAIL — props/buttons do not exist.

- [ ] **Step 3: Update the component**

Replace `src/client/components/StoryList.tsx` with:

```tsx
import { useState } from "react";
import type { Story } from "../../shared/types";
import styles from "./StoryList.module.css";

interface StoryListProps {
  stories: Story[];
  onEditStory: (id: number, title: string, description: string) => void;
  onDeleteStory: (id: number) => void;
}

const STATUS_ORDER: Story["status"][] = ["active", "revealed", "pending", "done"];
const STATUS_LABELS: Record<Story["status"], string> = {
  active: "Active",
  revealed: "Revealed",
  pending: "Pending",
  done: "Done",
};

export default function StoryList({
  stories,
  onEditStory,
  onDeleteStory,
}: StoryListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  if (stories.length === 0) return null;

  const startEdit = (story: Story) => {
    setEditingId(story.id);
    setEditTitle(story.title);
    setEditDescription(story.description);
    setConfirmingId(null);
  };

  const saveEdit = (id: number) => {
    if (!editTitle.trim()) return;
    onEditStory(id, editTitle.trim(), editDescription.trim());
    setEditingId(null);
  };

  const grouped = new Map<Story["status"], Story[]>();
  for (const s of stories) {
    if (!grouped.has(s.status)) grouped.set(s.status, []);
    grouped.get(s.status)!.push(s);
  }

  return (
    <div className={styles.list}>
      <h3 className={styles.heading}>Stories</h3>
      {STATUS_ORDER.map((status) => {
        const group = grouped.get(status);
        if (!group || group.length === 0) return null;
        return (
          <div key={status} className={styles.group}>
            <div className={`${styles.statusBadge} ${styles[status]}`}>
              {STATUS_LABELS[status]}
            </div>
            {group.map((story) =>
              editingId === story.id ? (
                <div key={story.id} className={styles.item}>
                  <input
                    className={styles.editInput}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    aria-label={`Title for ${story.title}`}
                    autoFocus
                  />
                  <div className={styles.rowActions}>
                    <button
                      className={styles.iconBtn}
                      onClick={() => saveEdit(story.id)}
                    >
                      Save
                    </button>
                    <button
                      className={styles.iconBtn}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div key={story.id} className={styles.item}>
                  <span className={styles.title}>{story.title}</span>
                  {confirmingId === story.id ? (
                    <div className={styles.rowActions}>
                      <button
                        className={styles.iconBtn}
                        aria-label={`Confirm delete ${story.title}`}
                        onClick={() => {
                          onDeleteStory(story.id);
                          setConfirmingId(null);
                        }}
                      >
                        Delete?
                      </button>
                      <button
                        className={styles.iconBtn}
                        aria-label={`Cancel delete ${story.title}`}
                        onClick={() => setConfirmingId(null)}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className={styles.rowActions}>
                      <button
                        className={styles.iconBtn}
                        aria-label={`Edit ${story.title}`}
                        onClick={() => startEdit(story)}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.iconBtn}
                        aria-label={`Delete ${story.title}`}
                        onClick={() => setConfirmingId(story.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Add styles**

Append to `src/client/components/StoryList.module.css`:

```css
.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rowActions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.iconBtn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
}

.iconBtn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.editInput {
  flex: 1;
  background: var(--bg-void);
  color: var(--text-primary);
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run --project components test/components/story-list.test.tsx`
Expected: PASS (existing tests + the 2 new ones). If existing tests in this file render `<StoryList stories={...} />` without the new required props, update those renders to pass `onEditStory={() => {}} onDeleteStory={() => {}}`.

- [ ] **Step 6: Commit**

```bash
git add src/client/components/StoryList.tsx src/client/components/StoryList.module.css test/components/story-list.test.tsx
git commit -m "feat: add edit and delete to StoryList"
```

---

## Task 9: Final-estimate picker in `RevealBoard`

**Files:**
- Modify: `src/client/components/RevealBoard.tsx`
- Modify: `src/client/components/RevealBoard.module.css`
- Test: `test/components/reveal-board.test.tsx` (add to existing file)

> Heads-up (same as Task 8): this adds three required props to `RevealBoard`, which `Room.tsx` already renders. `Room.tsx` is wired to pass them in Task 11, so a missing-prop `pnpm lint` error on `Room.tsx` is expected until then; `pnpm test` stays green.

- [ ] **Step 1: Write the failing test**

Add to `test/components/reveal-board.test.tsx`:

```tsx
describe("RevealBoard final estimate", () => {
  const participants = [
    { id: "p1", displayName: "A", color: "#fff", hasEstimated: true },
    { id: "p2", displayName: "B", color: "#fff", hasEstimated: true },
  ];

  it("preselects the suggested value and reports changes", async () => {
    const user = userEvent.setup();
    const onSetFinalEstimate = vi.fn();
    render(
      <RevealBoard
        estimates={[
          { participantId: "p1", value: "5" },
          { participantId: "p2", value: "8" },
        ]}
        revealResult={{ distribution: [], allAgree: false }}
        participants={participants}
        onReVote={vi.fn()}
        onNextStory={vi.fn()}
        hasNextStory={false}
        hasActiveStory={true}
        finalEstimate={null}
        onSetFinalEstimate={onSetFinalEstimate}
      />
    );
    // Suggestion for [5,8] ties → higher card 8 is preselected.
    expect(
      screen.getByRole("button", { name: /final estimate 8/i })
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /final estimate 5/i }));
    expect(onSetFinalEstimate).toHaveBeenCalledWith("5");
  });

  it("hides the picker when there is no active story", () => {
    render(
      <RevealBoard
        estimates={[{ participantId: "p1", value: "5" }]}
        revealResult={{ distribution: [], allAgree: false }}
        participants={participants}
        onReVote={vi.fn()}
        onNextStory={vi.fn()}
        hasNextStory={false}
        hasActiveStory={false}
        finalEstimate={null}
        onSetFinalEstimate={vi.fn()}
      />
    );
    expect(screen.queryByText(/final estimate/i)).toBeNull();
  });
});
```

> If the existing `reveal-board.test.tsx` renders `<RevealBoard>` without the three new props (`hasActiveStory`, `finalEstimate`, `onSetFinalEstimate`), update those renders to pass `hasActiveStory={false}`, `finalEstimate={null}`, `onSetFinalEstimate={() => {}}` so they keep compiling.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project components test/components/reveal-board.test.tsx -t "final estimate"`
Expected: FAIL — new props / picker not present.

- [ ] **Step 3: Update the component**

In `src/client/components/RevealBoard.tsx`:

Add to the imports:

```tsx
import { FIBONACCI_VALUES } from "../../shared/types";
import { suggestFinalEstimate } from "../../shared/estimates";
```

Extend `RevealBoardProps`:

```tsx
interface RevealBoardProps {
  estimates: Estimate[];
  revealResult: RevealResult | null;
  participants: Participant[];
  onReVote: () => void;
  onNextStory: () => void;
  hasNextStory: boolean;
  hasActiveStory: boolean;
  finalEstimate: FibonacciValue | null;
  onSetFinalEstimate: (value: FibonacciValue) => void;
}
```

Add the new params to the function signature destructuring (`hasActiveStory`, `finalEstimate`, `onSetFinalEstimate`).

Inside the component, before the `return`, compute the selected value:

```tsx
  const suggestion = suggestFinalEstimate(estimates.map((e) => e.value));
  const selectedFinal = finalEstimate ?? suggestion;
```

In the JSX, insert this block immediately before the `actions` `<motion.div>`:

```tsx
      {hasActiveStory && (
        <div className={styles.finalEstimate}>
          <span className={styles.finalLabel}>Final estimate</span>
          <div className={styles.finalCards}>
            {FIBONACCI_VALUES.map((value) => (
              <button
                key={value}
                className={`${styles.finalCard} ${
                  selectedFinal === value ? styles.finalCardSelected : ""
                }`}
                aria-label={`Final estimate ${value}`}
                aria-pressed={selectedFinal === value}
                onClick={() => onSetFinalEstimate(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 4: Add styles**

Append to `src/client/components/RevealBoard.module.css`:

```css
.finalEstimate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.finalLabel {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  font-weight: 600;
}

.finalCards {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.finalCard {
  min-width: 36px;
  height: 44px;
  border-radius: 8px;
  border: 1.5px solid var(--border-strong);
  background: var(--bg-raised);
  color: var(--text-secondary);
  font-weight: 700;
  cursor: pointer;
}

.finalCardSelected {
  border-color: var(--accent-blue);
  color: var(--accent-sky);
  background: var(--deck-navy-selected-top, #0f2440);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run --project components test/components/reveal-board.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/client/components/RevealBoard.tsx src/client/components/RevealBoard.module.css test/components/reveal-board.test.tsx
git commit -m "feat: add final estimate picker to RevealBoard"
```

---

## Task 10: `SessionSummary` component

**Files:**
- Create: `src/client/components/SessionSummary.tsx`
- Create: `src/client/components/SessionSummary.module.css`
- Test: `test/components/session-summary.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `test/components/session-summary.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Story } from "../../src/shared/types";
import SessionSummary from "../../src/client/components/SessionSummary";

function story(partial: Partial<Story>): Story {
  return {
    id: 1,
    title: "Story",
    description: "",
    position: 1,
    status: "done",
    finalEstimate: null,
    unanimous: null,
    ...partial,
  };
}

describe("SessionSummary", () => {
  const stories = [
    story({ id: 1, title: "Add login", finalEstimate: "5", unanimous: true }),
    story({ id: 2, title: "Rate limiting", finalEstimate: "13", unanimous: false }),
  ];

  it("renders each story with its final estimate and the totals", () => {
    render(<SessionSummary stories={stories} />);
    expect(screen.getByText("Add login")).toBeInTheDocument();
    expect(screen.getByText("Rate limiting")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument(); // total points
    expect(screen.getByText("1")).toBeInTheDocument(); // unanimous count
  });

  it("copies a markdown summary to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const user = userEvent.setup();
    render(<SessionSummary stories={stories} />);
    await user.click(screen.getByRole("button", { name: /copy summary/i }));
    expect(writeText).toHaveBeenCalledWith(
      "- Add login — 5\n- Rate limiting — 13\nTotal: 18 points across 2 stories"
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project components test/components/session-summary.test.tsx`
Expected: FAIL — cannot find module `SessionSummary`.

- [ ] **Step 3: Write the component**

Create `src/client/components/SessionSummary.tsx`:

```tsx
import { useState } from "react";
import type { Story } from "../../shared/types";
import { summarize, summaryMarkdown } from "../../shared/estimates";
import styles from "./SessionSummary.module.css";

interface SessionSummaryProps {
  stories: Story[];
}

export default function SessionSummary({ stories }: SessionSummaryProps) {
  const { totalPoints, unanimousCount } = summarize(stories);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summaryMarkdown(stories));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={styles.summary}>
      <div className={styles.head}>
        <h2 className={styles.heading}>Session complete</h2>
        <span className={styles.count}>{stories.length} stories</span>
      </div>

      <div className={styles.totals}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{totalPoints}</div>
          <div className={styles.statLabel}>total points</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValueGreen}>{unanimousCount}</div>
          <div className={styles.statLabel}>unanimous</div>
        </div>
      </div>

      <div className={styles.rows}>
        {stories.map((s) => (
          <div key={s.id} className={styles.row}>
            <span className={styles.rowTitle}>{s.title}</span>
            <span
              className={`${styles.rowValue} ${
                s.unanimous ? "" : styles.rowValueContested
              }`}
            >
              {s.finalEstimate ?? "—"}
            </span>
          </div>
        ))}
      </div>

      <button className={styles.copyBtn} onClick={handleCopy}>
        {copied ? "Copied" : "Copy summary"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Write the styles**

Create `src/client/components/SessionSummary.module.css`:

```css
.summary {
  padding: 24px;
  max-width: 520px;
  margin: 0 auto;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
}

.heading {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.count {
  font-size: 12px;
  color: var(--text-muted);
}

.totals {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.stat {
  flex: 1;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}

.statValue {
  font-size: 26px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.statValueGreen {
  font-size: 26px;
  font-weight: 800;
  color: var(--status-success);
}

.statLabel {
  font-size: 10px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text-muted);
}

.rows {
  margin-bottom: 20px;
}

.row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-top: 1px solid var(--border-subtle);
}

.rowTitle {
  color: var(--text-primary);
  font-size: 14px;
}

.rowValue {
  color: var(--accent-sky);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.rowValueContested {
  color: var(--status-warning);
}

.copyBtn {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: none;
  background: var(--accent-blue);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run --project components test/components/session-summary.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/client/components/SessionSummary.tsx src/client/components/SessionSummary.module.css test/components/session-summary.test.tsx
git commit -m "feat: add SessionSummary component"
```

---

## Task 11: Wire everything into `Room.tsx`

**Files:**
- Modify: `src/client/pages/Room.tsx`
- Test: manual (run the app) + `pnpm lint` + full suite

> `Room.tsx` orchestrates WebSocket + router and has no existing automated test; this task is verified by the type-checker, the full test suite, and a manual run. Keep changes mechanical.

- [ ] **Step 1: Replace component imports and add handlers**

In `src/client/pages/Room.tsx`:

- Replace the `import StoryCard from "../components/StoryCard";`-era imports: remove the commented-out usages and import the new components. Ensure these imports exist:

```tsx
import StorySpotlight from "../components/StorySpotlight";
import StoryList from "../components/StoryList";
import AddStory from "../components/AddStory";
import SessionSummary from "../components/SessionSummary";
```

- Add these handlers alongside the existing `handleAddStory` (keep `handleAddStory` for single add):

```tsx
  const handleAddStories = useCallback((titles: string[]) => {
    wsRef.current?.send({
      type: "add_stories",
      stories: titles.map((title) => ({ title, description: "" })),
    });
  }, []);

  const handleEditStory = useCallback(
    (id: number, title: string, description: string) => {
      wsRef.current?.send({ type: "edit_story", id, title, description });
    },
    []
  );

  const handleDeleteStory = useCallback((id: number) => {
    wsRef.current?.send({ type: "delete_story", id });
  }, []);

  const handleSetFinalEstimate = useCallback((value: FibonacciValue) => {
    wsRef.current?.send({ type: "set_final_estimate", value });
  }, []);
```

- [ ] **Step 2: Compute derived view state**

Replace the existing `activeStory` / `hasNextStory` lines with:

```tsx
  const activeStory = stories.find((s) => s.status === "active") ?? null;
  const hasNextStory = stories.some((s) => s.status === "pending");
  const doneCount = stories.filter((s) => s.status === "done").length;
  const sessionComplete =
    stories.length > 0 &&
    !stories.some((s) => s.status === "active" || s.status === "pending");
```

- [ ] **Step 3: Replace the content render block**

Replace the `<div className={styles.content}>…</div>` block with:

```tsx
        <div className={styles.content}>
          {sessionComplete ? (
            <SessionSummary stories={stories} />
          ) : !revealed ? (
            <>
              <StorySpotlight
                story={activeStory}
                position={doneCount + 1}
                total={stories.length}
              />
              <CardGrid
                selected={myEstimate}
                onSelect={handleEstimate}
                onDeselect={handleDeselect}
                disabled={false}
              />
              <div className={styles.revealArea}>
                <button
                  className={styles.revealBtn}
                  onClick={handleReveal}
                  disabled={currentEstimates === 0}
                >
                  Reveal Estimates
                </button>
              </div>
            </>
          ) : (
            <>
              <StorySpotlight
                story={activeStory}
                position={doneCount + 1}
                total={stories.length}
              />
              <RevealBoard
                estimates={estimates}
                revealResult={revealResult}
                participants={participants}
                onReVote={handleReVote}
                onNextStory={handleNextStory}
                hasNextStory={hasNextStory}
                hasActiveStory={activeStory !== null}
                finalEstimate={activeStory?.finalEstimate ?? null}
                onSetFinalEstimate={handleSetFinalEstimate}
              />
            </>
          )}
        </div>
```

- [ ] **Step 4: Wire the sidebar add/edit/delete**

Replace the sidebar block with:

```tsx
        <div className={styles.sidebar}>
          <ParticipantList
            participants={participants}
            currentParticipantId={myParticipantId}
            onRename={handleRename}
          />
          <AddStory onAdd={handleAddStory} onAddMany={handleAddStories} />
          <StoryList
            stories={stories}
            onEditStory={handleEditStory}
            onDeleteStory={handleDeleteStory}
          />
        </div>
```

- [ ] **Step 5: Type-check**

Run: `pnpm lint`
Expected: no errors. (If `FibonacciValue` is not imported in `Room.tsx`, it already is via `import type { FibonacciValue } from "../../shared/types";` — confirm it is present.)

- [ ] **Step 6: Run the full test suite**

Run: `pnpm test`
Expected: all unit, integration, and component tests PASS.

- [ ] **Step 7: Manual verification**

Run: `pnpm preview`, open the room, and confirm:
- "+ Add Story" → "Paste list" → paste 3 lines → "Add 3" creates 3 pending stories.
- Edit and delete (with inline confirm) work in the sidebar.
- The story spotlight shows above the cards and through the reveal; long descriptions collapse with "Show more".
- After reveal, the final-estimate picker preselects a suggestion; choosing a value persists (reload / second tab shows it).
- After the last story, the session summary appears with totals and "Copy summary" copies the markdown.

- [ ] **Step 8: Commit**

```bash
git add src/client/pages/Room.tsx
git commit -m "feat: wire story context, edit/delete, and summary into Room"
```

---

## Task 12: Visual regression snapshots

**Files:**
- Modify: `test/vrt/room.spec.ts` and/or add `test/vrt/summary.spec.ts`
- Test: Playwright VRT

> VRT snapshots are environment-specific. Only add/update these if the existing VRT suite is part of the team's CI; otherwise note them and skip.

- [ ] **Step 1: Add a spotlight assertion to the room VRT**

If `test/vrt/room.spec.ts` seeds a room, ensure at least one active story exists so the spotlight renders, then capture the snapshot. Follow the existing spec's setup pattern (seeding via the UI or WebSocket as the current specs do).

- [ ] **Step 2: Regenerate snapshots**

Run: `pnpm test:vrt --update-snapshots`
Expected: new/updated PNGs under `test/vrt/*-snapshots/`.

- [ ] **Step 3: Review the snapshots visually, then commit**

```bash
git add test/vrt
git commit -m "test: update VRT snapshots for story context"
```

---

## Final Verification

- [ ] Run `pnpm lint` — no type errors.
- [ ] Run `pnpm test` — all three projects pass.
- [ ] Run `pnpm test:vrt` (if in scope) — snapshots pass.
- [ ] Manual smoke test per Task 11 Step 7.
