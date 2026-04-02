# Comprehensive Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Achieve high test coverage across the entire estimator app — unit tests for all logic, integration tests for WebSocket flows, component tests for UI, and visual regression tests.

**Architecture:** Layered testing pyramid — fast unit tests at the base (store, dictionary, DO edge cases), integration tests for WebSocket/Worker flows, component rendering tests, and Playwright VRT at the top.

**Tech Stack:** Vitest, @cloudflare/vitest-pool-workers, React Testing Library (via vitest + jsdom for components), Playwright for VRT

---

## Current State

**Tested (18 tests):**

- Room DO: join, estimate, reveal, stories, reVote, removeParticipant (15 unit)
- Worker: health check, 404, missing WS room ID (3 integration)

**Zombies (untested):**

- Zustand store: 0 tests, 8 message handlers
- Dictionary: 0 tests
- Room DO edge cases: reveal with no estimates, end-of-queue, reVote without stories, add_stories batch
- Components: 0 tests, 6 components
- VRT: 0 tests
- E2E: 0 automated

---

## File Structure

```
test/
├── unit/
│   ├── room.test.ts           (exists, extend)
│   ├── store.test.ts          (new)
│   └── dictionary.test.ts     (new)
├── integration/
│   ├── worker.test.ts         (exists, extend)
│   └── websocket-flow.test.ts (new)
├── components/
│   ├── card-grid.test.tsx     (new)
│   ├── participant-list.test.tsx (new)
│   ├── reveal-board.test.tsx  (new)
│   ├── story-card.test.tsx    (new)
│   └── landing.test.tsx       (new)
└── vrt/
    ├── landing.spec.ts        (new, Playwright)
    ├── room.spec.ts           (new, Playwright)
    └── revealed.spec.ts       (new, Playwright)
```

---

### Task 1: Zustand Store Unit Tests

**Files:**

- Create: `test/unit/store.test.ts`

- [ ] **Step 1: Write failing tests for all store message handlers**

```typescript
// test/unit/store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useRoomStore } from "../../src/client/store/room";
import type { ServerMessage, Participant } from "../../src/shared/types";

describe("RoomStore", () => {
  beforeEach(() => {
    useRoomStore.setState({
      connected: false,
      room: null,
      participants: [],
      stories: [],
      currentEstimates: 0,
      totalParticipants: 0,
      revealed: false,
      estimates: [],
      consensus: null,
      myEstimate: null,
    });
  });

  describe("setConnected", () => {
    it("should set connected state", () => {
      useRoomStore.getState().setConnected(true);
      expect(useRoomStore.getState().connected).toBe(true);
    });
  });

  describe("setMyEstimate", () => {
    it("should set my estimate", () => {
      useRoomStore.getState().setMyEstimate("5");
      expect(useRoomStore.getState().myEstimate).toBe("5");
    });

    it("should clear estimate with null", () => {
      useRoomStore.getState().setMyEstimate("5");
      useRoomStore.getState().setMyEstimate(null);
      expect(useRoomStore.getState().myEstimate).toBeNull();
    });
  });

  describe("handleMessage", () => {
    it("should handle room_state", () => {
      const msg: ServerMessage = {
        type: "room_state",
        room: { id: "test", name: "Test", createdAt: Date.now() },
        participants: [
          {
            id: "1",
            displayName: "Alice",
            color: "#3b82f6",
            hasEstimated: false,
          },
        ],
        stories: [],
        currentEstimates: 0,
        totalParticipants: 1,
      };
      useRoomStore.getState().handleMessage(msg);
      const s = useRoomStore.getState();
      expect(s.room?.id).toBe("test");
      expect(s.participants).toHaveLength(1);
      expect(s.totalParticipants).toBe(1);
    });

    it("should handle participant_joined", () => {
      useRoomStore.setState({ participants: [], totalParticipants: 0 });
      const msg: ServerMessage = {
        type: "participant_joined",
        participant: {
          id: "2",
          displayName: "Bob",
          color: "#8b5cf6",
          hasEstimated: false,
        },
      };
      useRoomStore.getState().handleMessage(msg);
      const s = useRoomStore.getState();
      expect(s.participants).toHaveLength(1);
      expect(s.participants[0].displayName).toBe("Bob");
      expect(s.totalParticipants).toBe(1);
    });

    it("should handle participant_left", () => {
      useRoomStore.setState({
        participants: [
          {
            id: "1",
            displayName: "Alice",
            color: "#3b82f6",
            hasEstimated: false,
          },
          {
            id: "2",
            displayName: "Bob",
            color: "#8b5cf6",
            hasEstimated: false,
          },
        ],
        totalParticipants: 2,
      });
      const msg: ServerMessage = {
        type: "participant_left",
        participantId: "1",
      };
      useRoomStore.getState().handleMessage(msg);
      const s = useRoomStore.getState();
      expect(s.participants).toHaveLength(1);
      expect(s.participants[0].displayName).toBe("Bob");
      expect(s.totalParticipants).toBe(1);
    });

    it("should handle estimate_received", () => {
      useRoomStore.setState({
        participants: [
          {
            id: "1",
            displayName: "Alice",
            color: "#3b82f6",
            hasEstimated: false,
          },
        ],
        currentEstimates: 0,
      });
      const msg: ServerMessage = {
        type: "estimate_received",
        participantId: "1",
      };
      useRoomStore.getState().handleMessage(msg);
      const s = useRoomStore.getState();
      expect(s.participants[0].hasEstimated).toBe(true);
      expect(s.currentEstimates).toBe(1);
    });

    it("should handle revealed", () => {
      const msg: ServerMessage = {
        type: "revealed",
        estimates: [
          { participantId: "1", value: "5" },
          { participantId: "2", value: "8" },
        ],
        consensus: { value: "5", count: 1, total: 2 },
      };
      useRoomStore.getState().handleMessage(msg);
      const s = useRoomStore.getState();
      expect(s.revealed).toBe(true);
      expect(s.estimates).toHaveLength(2);
      expect(s.consensus?.value).toBe("5");
    });

    it("should handle story_added", () => {
      const msg: ServerMessage = {
        type: "story_added",
        story: {
          id: 1,
          title: "Login",
          description: "",
          position: 1,
          status: "pending",
        },
      };
      useRoomStore.getState().handleMessage(msg);
      expect(useRoomStore.getState().stories).toHaveLength(1);
    });

    it("should handle story_changed", () => {
      useRoomStore.setState({
        stories: [
          {
            id: 1,
            title: "Login",
            description: "",
            position: 1,
            status: "pending",
          },
        ],
      });
      const msg: ServerMessage = {
        type: "story_changed",
        story: {
          id: 1,
          title: "Login",
          description: "",
          position: 1,
          status: "active",
        },
      };
      useRoomStore.getState().handleMessage(msg);
      expect(useRoomStore.getState().stories[0].status).toBe("active");
    });

    it("should handle re_vote_started", () => {
      useRoomStore.setState({
        revealed: true,
        estimates: [{ participantId: "1", value: "5" }],
        consensus: { value: "5", count: 1, total: 1 },
        myEstimate: "5",
        currentEstimates: 1,
        participants: [
          {
            id: "1",
            displayName: "Alice",
            color: "#3b82f6",
            hasEstimated: true,
          },
        ],
      });
      useRoomStore.getState().handleMessage({ type: "re_vote_started" });
      const s = useRoomStore.getState();
      expect(s.revealed).toBe(false);
      expect(s.estimates).toHaveLength(0);
      expect(s.consensus).toBeNull();
      expect(s.myEstimate).toBeNull();
      expect(s.currentEstimates).toBe(0);
      expect(s.participants[0].hasEstimated).toBe(false);
    });
  });

  describe("resetForReVote", () => {
    it("should reset reveal state", () => {
      useRoomStore.setState({
        revealed: true,
        estimates: [{ participantId: "1", value: "5" }],
        consensus: { value: "5", count: 1, total: 1 },
        myEstimate: "5",
        currentEstimates: 1,
      });
      useRoomStore.getState().resetForReVote();
      const s = useRoomStore.getState();
      expect(s.revealed).toBe(false);
      expect(s.estimates).toHaveLength(0);
      expect(s.consensus).toBeNull();
      expect(s.myEstimate).toBeNull();
      expect(s.currentEstimates).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm test -- test/unit/store.test.ts`
Expected: All pass (store logic is already implemented)

- [ ] **Step 3: Commit**

```bash
git add test/unit/store.test.ts
git commit -m "test: add Zustand store unit tests"
```

---

### Task 2: Dictionary Unit Tests

**Files:**

- Create: `test/unit/dictionary.test.ts`

- [ ] **Step 1: Write tests for generateRoomCode and assignColor**

```typescript
// test/unit/dictionary.test.ts
import { describe, it, expect } from "vitest";
import { generateRoomCode, assignColor } from "../../src/shared/dictionary";

describe("generateRoomCode", () => {
  it("should return two words separated by hyphen", () => {
    const code = generateRoomCode();
    const parts = code.split("-");
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it("should not repeat the same word", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      const [w1, w2] = code.split("-");
      expect(w1).not.toBe(w2);
    }
  });

  it("should generate different codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateRoomCode());
    }
    // With ~300 words, 100 random pairs should have high uniqueness
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe("assignColor", () => {
  it("should return a hex color", () => {
    const color = assignColor(0);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("should cycle through colors", () => {
    const color0 = assignColor(0);
    const color8 = assignColor(8);
    expect(color0).toBe(color8);
  });

  it("should return different colors for different indices", () => {
    expect(assignColor(0)).not.toBe(assignColor(1));
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm test -- test/unit/dictionary.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add test/unit/dictionary.test.ts
git commit -m "test: add dictionary unit tests"
```

---

### Task 3: Room DO Edge Case Tests

**Files:**

- Modify: `test/unit/room.test.ts`

- [ ] **Step 1: Add edge case tests**

Append to the existing `room.test.ts`:

```typescript
describe("edge cases", () => {
  it("should handle reveal with no estimates", async () => {
    const stub = getStub("edge-test-1");

    await runInDurableObject(stub, async (instance: Room) => {
      instance.join("Alice");

      const result = instance.reveal();
      expect(result).not.toBeNull();
      expect(result!.estimates).toHaveLength(0);
      expect(result!.consensus).toBeNull();
    });
  });

  it("should handle estimate without any story", async () => {
    const stub = getStub("edge-test-2");

    await runInDurableObject(stub, async (instance: Room) => {
      const a = instance.join("Alice");
      instance.estimate(a.participant.id, "8");

      const state = instance.getRoomState();
      expect(state.currentEstimates).toBe(1);
    });
  });

  it("should handle reVote without stories", async () => {
    const stub = getStub("edge-test-3");

    await runInDurableObject(stub, async (instance: Room) => {
      const a = instance.join("Alice");
      instance.estimate(a.participant.id, "5");
      instance.reveal();
      instance.reVote();

      const state = instance.getRoomState();
      expect(state.currentEstimates).toBe(0);
    });
  });

  it("should handle nextStory when no stories exist", async () => {
    const stub = getStub("edge-test-4");

    await runInDurableObject(stub, async (instance: Room) => {
      instance.join("Alice");

      const stories = instance.nextStory();
      expect(stories).toHaveLength(0);
    });
  });

  it("should handle addStory with empty description", async () => {
    const stub = getStub("edge-test-5");

    await runInDurableObject(stub, async (instance: Room) => {
      instance.join("Alice");
      const story = instance.addStory("Quick fix", "");

      expect(story.title).toBe("Quick fix");
      expect(story.description).toBe("");
    });
  });

  it("should handle all Fibonacci values including ☕", async () => {
    const stub = getStub("edge-test-6");
    const values = ["1", "2", "3", "5", "8", "13", "21", "☕"] as const;

    await runInDurableObject(stub, async (instance: Room) => {
      for (const v of values) {
        const p = instance.join(`User-${v}`);
        instance.estimate(p.participant.id, v);
      }

      const result = instance.reveal();
      expect(result!.estimates).toHaveLength(values.length);
    });
  });

  it("should handle participant leaving and rejoining", async () => {
    const stub = getStub("edge-test-7");

    await runInDurableObject(stub, async (instance: Room) => {
      const a1 = instance.join("Alice");
      instance.removeParticipant(a1.participant.id);

      const a2 = instance.join("Alice");
      expect(a2.participant.id).not.toBe(a1.participant.id);

      const state = instance.getRoomState();
      expect(state.totalParticipants).toBe(1);
    });
  });

  it("should handle estimate change after reveal then revote", async () => {
    const stub = getStub("edge-test-8");

    await runInDurableObject(stub, async (instance: Room) => {
      const a = instance.join("Alice");
      instance.estimate(a.participant.id, "5");
      instance.reveal();
      instance.reVote();

      instance.estimate(a.participant.id, "8");
      const state = instance.getRoomState();
      expect(state.currentEstimates).toBe(1);

      const result = instance.reveal();
      expect(result!.estimates[0].value).toBe("8");
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm test`
Expected: All 26+ tests pass

- [ ] **Step 3: Commit**

```bash
git add test/unit/room.test.ts
git commit -m "test: add Room DO edge case tests"
```

---

### Task 4: Component Unit Tests

**Files:**

- Create: `test/components/card-grid.test.tsx`
- Create: `test/components/participant-list.test.tsx`
- Create: `test/components/reveal-board.test.tsx`
- Create: `test/components/story-card.test.tsx`
- Create: `test/components/landing.test.tsx`
- Create: `vitest.config.components.ts`

- [ ] **Step 1: Create component test vitest config**

```typescript
// vitest.config.components.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["test/components/**/*.test.tsx"],
    css: { modules: { classNameStrategy: "non-scoped" } },
  },
});
```

- [ ] **Step 2: Install jsdom**

Run: `pnpm add -D jsdom`

- [ ] **Step 3: Write CardGrid tests**

```typescript
// test/components/card-grid.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CardGrid from "../../src/client/components/CardGrid";

describe("CardGrid", () => {
  it("renders all Fibonacci values", () => {
    render(<CardGrid selected={null} onSelect={() => {}} disabled={false} />);
    expect(screen.getByRole("button", { name: "1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "5" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "☕" })).toBeTruthy();
  });

  it("calls onSelect when a card is clicked", async () => {
    const onSelect = vi.fn();
    render(<CardGrid selected={null} onSelect={onSelect} disabled={false} />);
    await userEvent.click(screen.getByRole("button", { name: "5" }));
    expect(onSelect).toHaveBeenCalledWith("5");
  });

  it("does not call onSelect when disabled", async () => {
    const onSelect = vi.fn();
    render(<CardGrid selected={null} onSelect={onSelect} disabled={true} />);
    await userEvent.click(screen.getByRole("button", { name: "5" }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Write ParticipantList tests**

```typescript
// test/components/participant-list.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ParticipantList from "../../src/client/components/ParticipantList";
import type { Participant } from "../../src/shared/types";

describe("ParticipantList", () => {
  it("shows participant count", () => {
    const participants: Participant[] = [
      { id: "1", displayName: "Alice", color: "#3b82f6", hasEstimated: false },
    ];
    render(<ParticipantList participants={participants} />);
    expect(screen.getByText("Participants (1)")).toBeTruthy();
  });

  it("shows estimated status", () => {
    const participants: Participant[] = [
      { id: "1", displayName: "Alice", color: "#3b82f6", hasEstimated: true },
    ];
    render(<ParticipantList participants={participants} />);
    expect(screen.getByText("✓ estimated")).toBeTruthy();
  });

  it("shows picking status", () => {
    const participants: Participant[] = [
      { id: "1", displayName: "Alice", color: "#3b82f6", hasEstimated: false },
    ];
    render(<ParticipantList participants={participants} />);
    expect(screen.getByText("picking...")).toBeTruthy();
  });

  it("renders empty list", () => {
    render(<ParticipantList participants={[]} />);
    expect(screen.getByText("Participants (0)")).toBeTruthy();
  });
});
```

- [ ] **Step 5: Write StoryCard tests**

```typescript
// test/components/story-card.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StoryCard from "../../src/client/components/StoryCard";
import type { Story } from "../../src/shared/types";

describe("StoryCard", () => {
  it("shows no story message when null", () => {
    render(<StoryCard story={null} />);
    expect(screen.getByText("No Story")).toBeTruthy();
    expect(screen.getByText("Estimating...")).toBeTruthy();
  });

  it("shows story title and description", () => {
    const story: Story = {
      id: 1, title: "Login", description: "Add login page", position: 1, status: "active",
    };
    render(<StoryCard story={story} />);
    expect(screen.getByText("Login")).toBeTruthy();
    expect(screen.getByText("Add login page")).toBeTruthy();
  });

  it("shows story without description", () => {
    const story: Story = {
      id: 1, title: "Quick fix", description: "", position: 1, status: "active",
    };
    render(<StoryCard story={story} />);
    expect(screen.getByText("Quick fix")).toBeTruthy();
  });
});
```

- [ ] **Step 6: Write Landing tests**

```typescript
// test/components/landing.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Landing from "../../src/client/pages/Landing";

function renderLanding() {
  return render(
    <BrowserRouter>
      <Landing />
    </BrowserRouter>
  );
}

describe("Landing", () => {
  it("renders title", () => {
    renderLanding();
    expect(screen.getByText("estimate.")).toBeTruthy();
  });

  it("renders create room section", () => {
    renderLanding();
    expect(screen.getByText("Create a Room")).toBeTruthy();
    expect(screen.getByPlaceholderText("Your display name")).toBeTruthy();
  });

  it("renders join room section", () => {
    renderLanding();
    expect(screen.getByText("Join a Room")).toBeTruthy();
    expect(screen.getByPlaceholderText("Room code (e.g. coral-falcon)")).toBeTruthy();
  });

  it("disables create button without name", () => {
    renderLanding();
    expect(screen.getByRole("button", { name: "Create Room" })).toHaveProperty("disabled", true);
  });

  it("disables join button without code and name", () => {
    renderLanding();
    expect(screen.getByRole("button", { name: "Join Room" })).toHaveProperty("disabled", true);
  });
});
```

- [ ] **Step 7: Add component test scripts to package.json**

Add to `package.json` scripts:

```json
"test:components": "vitest run --config vitest.config.components.ts",
"test:all": "pnpm test && pnpm test:components"
```

- [ ] **Step 8: Install testing library**

Run: `pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`

- [ ] **Step 9: Run component tests**

Run: `pnpm test:components`
Expected: All component tests pass

- [ ] **Step 10: Commit**

```bash
git add test/components/ vitest.config.components.ts package.json
git commit -m "test: add component unit tests (CardGrid, ParticipantList, StoryCard, Landing)"
```

---

### Task 5: WebSocket Flow Integration Tests

**Files:**

- Create: `test/integration/websocket-flow.test.ts`

- [ ] **Step 1: Write WebSocket flow test using browser WebSocket in vitest workers runtime**

Since `cloudflare:test` runtime supports WebSocket connections through `SELF.fetch`, write tests that verify the full WebSocket lifecycle:

```typescript
// test/integration/websocket-flow.test.ts
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import type { ServerMessage, ClientMessage } from "../../src/shared/types";

function connectWS(roomId: string) {
  return new Promise<{
    ws: WebSocket;
    messages: ServerMessage[];
    send: (msg: ClientMessage) => void;
    close: () => void;
  }>((resolve, reject) => {
    const messages: ServerMessage[] = [];
    const ws = new WebSocket(`ws://example.com/ws/${roomId}`);

    ws.addEventListener("open", () => {
      resolve({
        ws,
        messages,
        send: (msg) => ws.send(JSON.stringify(msg)),
        close: () => ws.close(),
      });
    });

    ws.addEventListener("message", (event) => {
      messages.push(JSON.parse(event.data as string));
    });

    ws.addEventListener("error", () => reject(new Error("WS error")));
  });
}

function waitForMsg(
  messages: ServerMessage[],
  type: string,
  timeoutMs = 3000,
): Promise<ServerMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout: ${type}`)),
      timeoutMs,
    );
    const check = () => {
      const found = messages.find((m) => m.type === type);
      if (found) {
        clearTimeout(timer);
        resolve(found);
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
}

describe("WebSocket flow", () => {
  it("full flow: join -> estimate -> reveal", async () => {
    const { ws, messages, send } = await connectWS("flow-test-1");

    send({ type: "join", displayName: "Alice" });
    await waitForMsg(messages, "room_state");

    send({ type: "estimate", value: "5" });
    await waitForMsg(messages, "estimate_received");

    send({ type: "reveal" });
    const revealed = await waitForMsg(messages, "revealed");

    expect(revealed.type).toBe("revealed");
    if (revealed.type === "revealed") {
      expect(revealed.estimates).toHaveLength(1);
      expect(revealed.estimates[0].value).toBe("5");
    }

    ws.close();
  });

  it("two participants see each other", async () => {
    const roomId = "flow-test-2";
    const alice = await connectWS(roomId);
    alice.send({ type: "join", displayName: "Alice" });
    await waitForMsg(alice.messages, "room_state");

    const bob = await connectWS(roomId);
    bob.send({ type: "join", displayName: "Bob" });
    await waitForMsg(bob.messages, "room_state");

    // Alice should get participant_joined
    await waitForMsg(alice.messages, "participant_joined");

    // Bob's room_state should have both
    const bobState = bob.messages.find((m) => m.type === "room_state");
    if (bobState?.type === "room_state") {
      expect(bobState.participants).toHaveLength(2);
    }

    alice.ws.close();
    bob.ws.close();
  });

  it("revote clears estimates", async () => {
    const { ws, messages, send } = await connectWS("flow-test-3");

    send({ type: "join", displayName: "Alice" });
    await waitForMsg(messages, "room_state");

    send({ type: "estimate", value: "5" });
    await waitForMsg(messages, "estimate_received");

    send({ type: "reveal" });
    await waitForMsg(messages, "revealed");

    send({ type: "re_vote" });
    const revote = await waitForMsg(messages, "re_vote_started");
    expect(revote.type).toBe("re_vote_started");

    ws.close();
  });

  it("add story and advance", async () => {
    const { ws, messages, send } = await connectWS("flow-test-4");

    send({ type: "join", displayName: "Alice" });
    await waitForMsg(messages, "room_state");

    send({ type: "add_story", title: "Feature", description: "Test" });
    const added = await waitForMsg(messages, "story_added");
    if (added.type === "story_added") {
      expect(added.story.title).toBe("Feature");
    }

    send({ type: "next_story" });
    const changed = await waitForMsg(messages, "story_changed");
    if (changed.type === "story_changed") {
      expect(changed.story.status).toBe("active");
    }

    ws.close();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm test`
Expected: WebSocket flow tests pass (or note if CF vitest WS support is limited)

- [ ] **Step 3: Commit**

```bash
git add test/integration/websocket-flow.test.ts
git commit -m "test: add WebSocket flow integration tests"
```

---

### Task 6: Visual Regression Tests (Playwright)

**Files:**

- Create: `test/vrt/landing.spec.ts`
- Create: `test/vrt/room.spec.ts`
- Create: `test/vrt/revealed.spec.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: Install Playwright**

Run: `pnpm add -D @playwright/test`

- [ ] **Step 2: Create Playwright config**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/vrt",
  use: {
    baseURL: "http://localhost:8787",
    screenshot: "on",
  },
  webServer: {
    command: "pnpm preview",
    port: 8787,
    reuseExistingServer: true,
    timeout: 30000,
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
});
```

- [ ] **Step 3: Write landing VRT**

```typescript
// test/vrt/landing.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("matches visual snapshot", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveScreenshot("landing.png");
  });

  test("create button enabled with name", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholderText("Your display name").first().fill("Alice");
    await expect(
      page.getByRole("button", { name: "Create Room" }),
    ).toBeEnabled();
  });
});
```

- [ ] **Step 4: Write room VRT**

```typescript
// test/vrt/room.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Room page", () => {
  test("matches visual snapshot", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholderText("Your display name").first().fill("Alice");
    await page.getByRole("button", { name: "Create Room" }).click();
    await page.waitForURL(/\/room\//);
    await expect(page).toHaveScreenshot("room-initial.png");
  });

  test("card selection highlight", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholderText("Your display name").first().fill("Alice");
    await page.getByRole("button", { name: "Create Room" }).click();
    await page.waitForURL(/\/room\//);
    await page.getByRole("button", { name: "5" }).click();
    await expect(page).toHaveScreenshot("room-card-selected.png");
  });
});
```

- [ ] **Step 5: Write revealed state VRT**

```typescript
// test/vrt/revealed.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Revealed state", () => {
  test("matches visual snapshot after reveal", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholderText("Your display name").first().fill("Alice");
    await page.getByRole("button", { name: "Create Room" }).click();
    await page.waitForURL(/\/room\//);
    await page.getByRole("button", { name: "5" }).click();
    await page.getByRole("button", { name: "Reveal Estimates" }).click();
    await expect(page.getByText("All Estimates Revealed")).toBeVisible();
    await expect(page).toHaveScreenshot("revealed.png");
  });

  test("two participants revealed", async ({ page, context }) => {
    // Alice creates room
    await page.goto("/");
    await page.getByPlaceholderText("Your display name").first().fill("Alice");
    await page.getByRole("button", { name: "Create Room" }).click();
    await page.waitForURL(/\/room\//);
    const roomUrl = page.url();
    await page.getByRole("button", { name: "5" }).click();

    // Bob joins
    const bobPage = await context.newPage();
    await bobPage.evaluate(() => localStorage.setItem("displayName", "Bob"));
    await bobPage.goto(roomUrl);
    await bobPage.getByRole("button", { name: "8" }).click();

    // Reveal from Bob's page
    await bobPage.getByRole("button", { name: "Reveal Estimates" }).click();
    await expect(bobPage.getByText("All Estimates Revealed")).toBeVisible();
    await expect(bobPage).toHaveScreenshot("revealed-two-people.png");

    await bobPage.close();
  });
});
```

- [ ] **Step 6: Generate baseline screenshots**

Run: `npx playwright test --update-snapshots`
Expected: Screenshots saved to `test/vrt/` directories

- [ ] **Step 7: Add Playwright scripts to package.json**

```json
"test:vrt": "playwright test",
"test:vrt:update": "playwright test --update-snapshots"
```

- [ ] **Step 8: Commit**

```bash
git add test/vrt/ playwright.config.ts package.json
git commit -m "test: add Playwright visual regression tests"
```

---

### Task 7: CI Test Script & Documentation

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Add combined test script**

```json
"test:ci": "pnpm lint && pnpm build && pnpm test && pnpm test:components"
```

- [ ] **Step 2: Run full suite**

Run: `pnpm test:ci`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add test:ci script for full test suite"
```

---

## Spec Coverage Checklist

| Area                      | Tests                     | Status |
| ------------------------- | ------------------------- | ------ |
| Room DO join              | 2 existing + 1 edge case  | ✅     |
| Room DO estimate          | 4 existing + 2 edge cases | ✅     |
| Room DO reveal            | 4 existing + 2 edge cases | ✅     |
| Room DO stories           | 2 existing + 2 edge cases | ✅     |
| Room DO reVote            | 1 existing + 2 edge cases | ✅     |
| Room DO removeParticipant | 2 existing                | ✅     |
| Zustand store             | 8 new tests               | Task 1 |
| Dictionary                | 6 new tests               | Task 2 |
| Components                | 15+ new tests             | Task 4 |
| WebSocket flows           | 4 new tests               | Task 5 |
| VRT                       | 5+ snapshots              | Task 6 |
| Worker integration        | 3 existing                | ✅     |

## Execution

**Plan complete.** 7 tasks, ~40 new tests, ~5 VRT snapshots.

Two execution options:

1. **Subagent-Driven (recommended)** - Fresh subagent per task, review between tasks
2. **Inline Execution** - Execute tasks in this session

Which approach?
