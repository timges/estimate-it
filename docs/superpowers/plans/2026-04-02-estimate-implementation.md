# estimate-it. Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time, bias-free story estimation tool with 3D CSS cards, spring-physics reveals, and Cloudflare Durable Objects backend.

**Architecture:** Single Cloudflare Worker with embedded Durable Object (Room) for real-time state. React + Vite SPA served from Worker static assets. WebSocket hibernation for zero-cost idle connections. All room state in per-room DO SQLite.

**Tech Stack:** React, Vite, TypeScript, CSS Modules, Cloudflare Workers + Durable Objects, Hono (router), Zustand (state), Framer Motion (animations), Lucide (icons)

---

## File Structure

### Backend (Cloudflare Worker)

| File                  | Responsibility                                 |
| --------------------- | ---------------------------------------------- |
| `src/worker/index.ts` | Entry point, asset serving, WebSocket upgrade  |
| `src/worker/hono.ts`  | Hono app with API routes                       |
| `src/worker/room.ts`  | Durable Object — Room state, WebSocket, SQLite |
| `src/shared/types.ts` | Shared message types between client and server |

### Frontend (React SPA)

| File                                               | Responsibility                     |
| -------------------------------------------------- | ---------------------------------- |
| `src/client/App.tsx`                               | Root component, router             |
| `src/client/pages/Landing.tsx`                     | Create/join room                   |
| `src/client/pages/Room.tsx`                        | Estimation room                    |
| `src/client/components/CardGrid.tsx`               | 3D Fibonacci card selection        |
| `src/client/components/CardGrid.module.css`        | 3D card table styles               |
| `src/client/components/ParticipantList.tsx`        | Sidebar with participants          |
| `src/client/components/ParticipantList.module.css` | Sidebar styles                     |
| `src/client/components/RevealBoard.tsx`            | Post-reveal results                |
| `src/client/components/RevealBoard.module.css`     | Reveal animation styles            |
| `src/client/components/StoryCard.tsx`              | Current story display              |
| `src/client/components/StoryCard.module.css`       | Story card styles                  |
| `src/client/lib/ws.ts`                             | WebSocket client with reconnection |
| `src/client/store/room.ts`                         | Zustand room state store           |
| `src/shared/dictionary.ts`                         | ~2000 curated words for room codes |

### Config

| File             | Responsibility                     |
| ---------------- | ---------------------------------- |
| `wrangler.jsonc` | Worker + DO + static assets config |
| `vite.config.ts` | Vite + React + CSS Modules         |
| `tsconfig.json`  | TypeScript config                  |
| `package.json`   | Dependencies                       |

---

### Task 1: Project Scaffold

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `wrangler.jsonc`
- Create: `src/client/main.tsx`
- Create: `src/client/App.tsx`
- Create: `src/client/index.css`
- Create: `index.html`

- [ ] **Step 1: Initialize package.json with dependencies**

```json
{
  "name": "estimate-it",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "wrangler dev",
    "deploy": "vite build && wrangler deploy",
    "cf-typegen": "wrangler types"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "framer-motion": "^12.0.0",
    "lucide-react": "^0.400.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.8.0",
    "@cloudflare/workers-types": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0",
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*", ".wrangler/types/**/*.ts"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  css: {
    modules: {
      localsConvention: "camelCase",
    },
  },
});
```

- [ ] **Step 4: Create wrangler.jsonc**

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "estimate-it",
  "main": "src/worker/index.ts",
  "compatibility_date": "2026-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "dist",
    "not_found_handling": "single-page-application",
  },
  "durable_objects": {
    "bindings": [
      {
        "name": "ROOM",
        "class_name": "Room",
      },
    ],
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["Room"],
    },
  ],
}
```

- [ ] **Step 5: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>estimate-it.</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create src/client/main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 7: Create src/client/App.tsx (minimal placeholder)**

```tsx
export default function App() {
  return (
    <div style={{ color: "white", background: "#060606", minHeight: "100vh" }}>
      estimate-it.
    </div>
  );
}
```

- [ ] **Step 8: Create src/client/index.css (minimal reset)**

```css
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Space Grotesk", system-ui, sans-serif;
  background: #060606;
  color: #e5e5e5;
  min-height: 100vh;
}
```

- [ ] **Step 9: Install dependencies and verify build**

Run: `npm install && npm run build`
Expected: Vite builds to `dist/` without errors

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold project with Vite + React + Cloudflare Workers"
```

---

### Task 2: Shared Types & Word Dictionary

**Files:**

- Create: `src/shared/types.ts`
- Create: `src/shared/dictionary.ts`

- [ ] **Step 1: Create shared types**

```typescript
// src/shared/types.ts

export const FIBONACCI_VALUES = [
  "1",
  "2",
  "3",
  "5",
  "8",
  "13",
  "21",
  "☕",
] as const;

export type FibonacciValue = (typeof FIBONACCI_VALUES)[number];

export interface Room {
  id: string;
  name: string;
  createdAt: number;
}

export interface Story {
  id: number;
  title: string;
  description: string;
  position: number;
  status: "pending" | "active" | "revealed" | "done";
}

export interface Participant {
  id: string;
  displayName: string;
  color: string;
  hasEstimated: boolean;
}

export interface Estimate {
  participantId: string;
  value: FibonacciValue;
}

export interface Consensus {
  value: FibonacciValue;
  count: number;
  total: number;
}

// WebSocket messages: Client → Server
export type ClientMessage =
  | { type: "join"; displayName: string }
  | { type: "estimate"; value: FibonacciValue }
  | { type: "reveal" }
  | { type: "next_story" }
  | { type: "re_vote" }
  | { type: "add_story"; title: string; description: string }
  | { type: "add_stories"; stories: { title: string; description: string }[] };

// WebSocket messages: Server → Client
export type ServerMessage =
  | {
      type: "room_state";
      room: Room;
      participants: Participant[];
      stories: Story[];
      currentEstimates: number;
      totalParticipants: number;
    }
  | { type: "participant_joined"; participant: Participant }
  | { type: "participant_left"; participantId: string }
  | { type: "estimate_received"; participantId: string }
  | {
      type: "revealed";
      estimates: Estimate[];
      consensus: Consensus | null;
    }
  | { type: "story_added"; story: Story }
  | { type: "story_changed"; story: Story }
  | { type: "re_vote_started" }
  | { type: "error"; message: string };
```

- [ ] **Step 2: Create word dictionary**

```typescript
// src/shared/dictionary.ts

// Curated word list — no ambiguous characters, easy to pronounce
// Categories: animals, nature, colors, celestial
const WORDS = [
  "ace",
  "ant",
  "ape",
  "arc",
  "ash",
  "asp",
  "awe",
  "badger",
  "bark",
  "bay",
  "bear",
  "bee",
  "bell",
  "bird",
  "blade",
  "bloom",
  "bluff",
  "bolt",
  "bond",
  "bone",
  "breeze",
  "brook",
  "brush",
  "buck",
  "bug",
  "bulb",
  "calm",
  "cave",
  "cedar",
  "cloud",
  "cobalt",
  "cove",
  "crane",
  "crest",
  "crown",
  "dawn",
  "deer",
  "dew",
  "dove",
  "drift",
  "dune",
  "dusk",
  "eagle",
  "earth",
  "echo",
  "ember",
  "fawn",
  "fern",
  "finch",
  "flame",
  "flint",
  "flora",
  "fog",
  "forge",
  "fox",
  "frost",
  "gale",
  "gem",
  "glade",
  "glen",
  "glow",
  "gold",
  "goose",
  "grain",
  "grove",
  "gulf",
  "gust",
  "hare",
  "hawk",
  "haze",
  "heath",
  "helm",
  "herb",
  "hill",
  "hive",
  "hollow",
  "honey",
  "hope",
  "hull",
  "ivy",
  "jade",
  "jay",
  "jet",
  "kelp",
  "kite",
  "knoll",
  "lake",
  "lamb",
  "leaf",
  "lily",
  "lime",
  "lynx",
  "magma",
  "maple",
  "marsh",
  "mist",
  "moon",
  "moss",
  "mote",
  "muse",
  "nest",
  "nimbus",
  "nova",
  "oak",
  "oasis",
  "ocean",
  "onyx",
  "opal",
  "orca",
  "owl",
  "palm",
  "peak",
  "pearl",
  "pine",
  "plume",
  "pond",
  "prism",
  "pulse",
  "quartz",
  "raven",
  "reef",
  "ridge",
  "rift",
  "river",
  "robin",
  "rock",
  "root",
  "rose",
  "ruby",
  "sage",
  "sand",
  "sea",
  "shade",
  "shell",
  "shore",
  "sky",
  "slate",
  "snow",
  "sol",
  "spark",
  "spruce",
  "star",
  "stem",
  "stone",
  "storm",
  "stream",
  "summit",
  "sun",
  "swan",
  "talon",
  "teal",
  "thorn",
  "tide",
  "timber",
  "topaz",
  "tree",
  "tulip",
  "vale",
  "vault",
  "vigor",
  "vine",
  "void",
  "wasp",
  "wave",
  "willow",
  "wind",
  "wing",
  "wolf",
  "wood",
  "wren",
  "yarrow",
  "zenith",
  "amber",
  "basil",
  "birch",
  "blaze",
  "branch",
  "briar",
  "brine",
  "bronze",
  "canyon",
  "carbon",
  "cherry",
  "clay",
  "cliff",
  "clover",
  "coral",
  "crystal",
  "dahlia",
  "delta",
  "ember",
  "falcon",
  "field",
  "flora",
  "frost",
  "garlic",
  "geode",
  "gravel",
  "harbor",
  "hazel",
  "indigo",
  "jasmine",
  "juniper",
  "karma",
  "lagoon",
  "lantern",
  "lavender",
  "lichen",
  "lotus",
  "magnolia",
  "meadow",
  "nebula",
  "obsidian",
  "orchid",
  "oyster",
  "pebble",
  "pelican",
  "penguin",
  "peony",
  "phoenix",
  "quartz",
  "rain",
  "rapids",
  "raven",
  "salmon",
  "sapphire",
  "sequoia",
  "sparrow",
  "steel",
  "sunset",
  "tangerine",
  "terra",
  "thistle",
  "thunder",
  "titan",
  "tundra",
  "turtle",
  "urchin",
  "valley",
  "vermillion",
  "volcano",
  "vortex",
  "walnut",
  "wren",
  "zephyr",
  // Extended set for more variety
  "agate",
  "alpaca",
  "anemone",
  "argonaut",
  "aurora",
  "avocado",
  "barnacle",
  "bison",
  "blizzard",
  "bonsai",
  "boulder",
  "buffalo",
  "camel",
  "canary",
  "cascade",
  "catalyst",
  "caterpillar",
  "chameleon",
  "cheetah",
  "chinchilla",
  "cicada",
  "cinnamon",
  "cobra",
  "condor",
  "coyote",
  "cricket",
  "crimson",
  "dandelion",
  "dragonfly",
  "elephant",
  "eucalyptus",
  "falcon",
  "firefly",
  "flamingo",
  "galaxy",
  "geyser",
  "giraffe",
  "gorilla",
  "grasshopper",
  "hamster",
  "heron",
  "horizon",
  "hurricane",
  "iguana",
  "jaguar",
  "jellyfish",
  "kangaroo",
  "kingfisher",
  "koala",
  "komodo",
  "labyrinth",
  "ladybug",
  "leopard",
  "lightning",
  "llama",
  "lobster",
  "mammoth",
  "manatee",
  "mantis",
  "meerkat",
  "mercury",
  "mongoose",
  "monsoon",
  "narwhal",
  "nautilus",
  "octopus",
  "osprey",
  "ostrich",
  "panther",
  "parrot",
  "peacock",
  "pelican",
  "peregrine",
  "piranha",
  "platypus",
  "polaris",
  "primate",
  "python",
  "quokka",
  "raccoon",
  "rhinoceros",
  "rosetta",
  "salamander",
  "scorpion",
  "seahorse",
  "serpent",
  "shark",
  "sloth",
  "stallion",
  "starfish",
  "stingray",
  "sunflower",
  "tardigrade",
  "termite",
  "toucan",
  "trident",
  "vulture",
  "walrus",
  "warrior",
  "waterfall",
  "wolverine",
  "zebra",
] as const;

export type Word = (typeof WORDS)[number];

/**
 * Generate a random room code from the dictionary.
 * Returns 2 words joined with a hyphen (e.g. "coral-falcon").
 */
export function generateRoomCode(): string {
  const w1 = WORDS[Math.floor(Math.random() * WORDS.length)];
  let w2 = WORDS[Math.floor(Math.random() * WORDS.length)];
  while (w2 === w1) {
    w2 = WORDS[Math.floor(Math.random() * WORDS.length)];
  }
  return `${w1}-${w2}`;
}

/**
 * Generate a participant color from a palette.
 */
export function assignColor(index: number): string {
  const palette = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#f43f5e",
    "#84cc16",
  ];
  return palette[index % palette.length];
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/shared/
git commit -m "feat: add shared types and word dictionary"
```

---

### Task 3: Room Durable Object

**Files:**

- Create: `src/worker/room.ts`

- [ ] **Step 1: Create the Room Durable Object**

```typescript
// src/worker/room.ts
import { DurableObject } from "cloudflare:workers";
import type {
  ClientMessage,
  ServerMessage,
  Room,
  Story,
  Participant,
  Estimate,
  Consensus,
  FibonacciValue,
  FIBONACCI_VALUES,
} from "../shared/types";
import { assignColor } from "../shared/dictionary";

interface Env {
  ROOM: DurableObjectNamespace<RoomDO>;
}

interface ConnectionData {
  participantId: string;
}

export class RoomDO extends DurableObject<Env> {
  private roomId: string;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.roomId = this.ctx.id.toString();
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS room (
          id TEXT PRIMARY KEY,
          name TEXT,
          created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS participant (
          id TEXT PRIMARY KEY,
          display_name TEXT,
          color TEXT,
          joined_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS story (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          description TEXT,
          position INTEGER,
          status TEXT DEFAULT 'pending'
        );
        CREATE TABLE IF NOT EXISTS estimate (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          story_id INTEGER,
          participant_id TEXT,
          value TEXT,
          created_at INTEGER,
          UNIQUE(story_id, participant_id)
        );
      `);
    });
  }

  /**
   * Handle WebSocket upgrade from the Worker.
   */
  async fetch(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.ctx.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Called when a WebSocket message arrives (DO wakes from hibernation).
   */
  async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
    const data = ws.deserializeAttachment() as ConnectionData | null;
    const msg: ClientMessage = JSON.parse(message);

    switch (msg.type) {
      case "join":
        await this.handleJoin(ws, msg.displayName);
        break;
      case "estimate":
        if (data) await this.handleEstimate(data.participantId, msg.value);
        break;
      case "reveal":
        await this.handleReveal();
        break;
      case "next_story":
        await this.handleNextStory();
        break;
      case "re_vote":
        await this.handleReVote();
        break;
      case "add_story":
        await this.handleAddStory(msg.title, msg.description);
        break;
      case "add_stories":
        for (const s of msg.stories) {
          await this.handleAddStory(s.title, s.description);
        }
        break;
    }
  }

  /**
   * Called when a WebSocket closes.
   */
  async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    const data = ws.deserializeAttachment() as ConnectionData | null;
    if (data) {
      this.ctx.storage.sql.exec(
        "DELETE FROM participant WHERE id = ?",
        data.participantId,
      );
      this.broadcast({
        type: "participant_left",
        participantId: data.participantId,
      });
    }
  }

  private async handleJoin(ws: WebSocket, displayName: string): Promise<void> {
    const participantCount = this.ctx.storage.sql
      .exec("SELECT COUNT(*) as count FROM participant")
      .one<{ count: number }>().count;

    const participantId = crypto.randomUUID();
    const color = assignColor(participantCount);

    this.ctx.storage.sql.exec(
      "INSERT INTO participant (id, display_name, color, joined_at) VALUES (?, ?, ?, ?)",
      participantId,
      displayName,
      color,
      Date.now(),
    );

    // Attach participant data to the WebSocket (survives hibernation)
    ws.serializeAttachment({ participantId } satisfies ConnectionData);

    // Get or create room
    let roomRow = this.ctx.storage.sql
      .exec("SELECT * FROM room WHERE id = ?", this.roomId)
      .one<Record<string, unknown> | null>();

    if (!roomRow) {
      this.ctx.storage.sql.exec(
        "INSERT INTO room (id, name, created_at) VALUES (?, ?, ?)",
        this.roomId,
        this.roomId,
        Date.now(),
      );
      roomRow = { id: this.roomId, name: this.roomId, created_at: Date.now() };
    }

    // Get participants
    const participants = this.getParticipants();
    const stories = this.getStories();
    const activeStoryId = this.getActiveStoryId();

    // Send room state to the new participant
    const estimateCount = activeStoryId
      ? this.ctx.storage.sql
          .exec(
            "SELECT COUNT(*) as count FROM estimate WHERE story_id = ?",
            activeStoryId,
          )
          .one<{ count: number }>().count
      : 0;

    ws.send(
      JSON.stringify({
        type: "room_state",
        room: {
          id: this.roomId,
          name: roomRow.name,
          createdAt: roomRow.created_at,
        },
        participants,
        stories,
        currentEstimates: estimateCount,
        totalParticipants: participants.length,
      } satisfies ServerMessage),
    );

    // Broadcast join to others
    this.broadcast(
      {
        type: "participant_joined",
        participant: {
          id: participantId,
          displayName,
          color,
          hasEstimated: false,
        },
      },
      ws,
    );
  }

  private async handleEstimate(
    participantId: string,
    value: FibonacciValue,
  ): Promise<void> {
    const activeStoryId = this.getActiveStoryId();
    if (!activeStoryId) return;

    // Upsert estimate
    this.ctx.storage.sql.exec(
      `INSERT INTO estimate (story_id, participant_id, value, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(story_id, participant_id) DO UPDATE SET value = ?, created_at = ?`,
      activeStoryId,
      participantId,
      value,
      Date.now(),
      value,
      Date.now(),
    );

    // Broadcast that someone estimated (no value!)
    this.broadcast({
      type: "estimate_received",
      participantId,
    });
  }

  private async handleReveal(): Promise<void> {
    const activeStoryId = this.getActiveStoryId();
    if (!activeStoryId) return;

    const estimates = this.ctx.storage.sql
      .exec<{
        participant_id: string;
        value: string;
      }>("SELECT participant_id, value FROM estimate WHERE story_id = ?", activeStoryId)
      .toArray();

    // Calculate consensus (most common value)
    const valueCounts = new Map<string, number>();
    for (const e of estimates) {
      valueCounts.set(e.value, (valueCounts.get(e.value) ?? 0) + 1);
    }

    let consensus: Consensus | null = null;
    let maxCount = 0;
    for (const [value, count] of valueCounts) {
      if (count > maxCount) {
        maxCount = count;
        consensus = {
          value: value as FibonacciValue,
          count,
          total: estimates.length,
        };
      }
    }

    // Update story status
    this.ctx.storage.sql.exec(
      "UPDATE story SET status = 'revealed' WHERE id = ?",
      activeStoryId,
    );

    this.broadcast({
      type: "revealed",
      estimates: estimates.map((e) => ({
        participantId: e.participant_id,
        value: e.value as FibonacciValue,
      })),
      consensus,
    });
  }

  private async handleNextStory(): Promise<void> {
    const activeStoryId = this.getActiveStoryId();

    // Mark current as done
    if (activeStoryId) {
      this.ctx.storage.sql.exec(
        "UPDATE story SET status = 'done' WHERE id = ?",
        activeStoryId,
      );
    }

    // Find next pending story
    const nextStory = this.ctx.storage.sql
      .exec<Story>(
        "SELECT id, title, description, position, status FROM story WHERE status = 'pending' ORDER BY position ASC LIMIT 1",
      )
      .one();

    if (nextStory) {
      this.ctx.storage.sql.exec(
        "UPDATE story SET status = 'active' WHERE id = ?",
        nextStory.id,
      );
    }

    // Clear estimates for next story
    // (estimates are per-story, so no cleanup needed)

    const stories = this.getStories();
    for (const s of stories) {
      this.broadcast({ type: "story_changed", story: s });
    }
  }

  private async handleReVote(): Promise<void> {
    const activeStoryId = this.getActiveStoryId();
    if (!activeStoryId) return;

    // Clear estimates
    this.ctx.storage.sql.exec(
      "DELETE FROM estimate WHERE story_id = ?",
      activeStoryId,
    );

    // Set story back to active
    this.ctx.storage.sql.exec(
      "UPDATE story SET status = 'active' WHERE id = ?",
      activeStoryId,
    );

    this.broadcast({ type: "re_vote_started" });
  }

  private async handleAddStory(
    title: string,
    description: string,
  ): Promise<void> {
    const maxPos = this.ctx.storage.sql
      .exec<{
        max_pos: number;
      }>("SELECT COALESCE(MAX(position), 0) as max_pos FROM story")
      .one().max_pos;

    this.ctx.storage.sql.exec(
      "INSERT INTO story (title, description, position, status) VALUES (?, ?, ?, 'pending')",
      title,
      description,
      maxPos + 1,
    );

    const story = this.ctx.storage.sql
      .exec<Story>(
        "SELECT id, title, description, position, status FROM story WHERE rowid = last_insert_rowid()",
      )
      .one();

    this.broadcast({ type: "story_added", story });
  }

  private getParticipants(): Participant[] {
    return this.ctx.storage.sql
      .exec<{
        id: string;
        display_name: string;
        color: string;
      }>(
        "SELECT id, display_name, color FROM participant ORDER BY joined_at ASC",
      )
      .toArray()
      .map((row) => {
        const activeStoryId = this.getActiveStoryId();
        const hasEstimated = activeStoryId
          ? this.ctx.storage.sql
              .exec(
                "SELECT 1 FROM estimate WHERE story_id = ? AND participant_id = ?",
                activeStoryId,
                row.id,
              )
              .one() !== null
          : false;

        return {
          id: row.id,
          displayName: row.display_name,
          color: row.color,
          hasEstimated,
        };
      });
  }

  private getStories(): Story[] {
    return this.ctx.storage.sql
      .exec<Story>(
        "SELECT id, title, description, position, status FROM story ORDER BY position ASC",
      )
      .toArray();
  }

  private getActiveStoryId(): number | null {
    const row = this.ctx.storage.sql
      .exec<{
        id: number;
      }>("SELECT id FROM story WHERE status = 'active' LIMIT 1")
      .one();
    return row?.id ?? null;
  }

  private broadcast(message: ServerMessage, exclude?: WebSocket): void {
    const json = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== exclude && ws.readyState === WebSocket.READY_STATE_OPEN) {
        ws.send(json);
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/worker/room.ts
git commit -m "feat: add Room Durable Object with WebSocket hibernation"
```

---

### Task 4: Worker Entry Point

**Files:**

- Create: `src/worker/index.ts`

- [ ] **Step 1: Create the Worker entry point**

```typescript
// src/worker/index.ts
import { Hono } from "hono";
import type { RoomDO } from "./room";

interface Env {
  ROOM: DurableObjectNamespace<RoomDO>;
  ASSETS: Fetcher;
}

const app = new Hono<{ Bindings: Env }>();

// API route: create a room (returns the DO name for routing)
app.post("/api/room", async (c) => {
  const { name } = await c.req.json<{ name?: string }>();
  const id = c.env.ROOM.newUniqueId();
  // The room is created on first connection via getByName
  return c.json({ id: id.toString() });
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade: forward to Durable Object
    if (request.headers.get("Upgrade") === "websocket") {
      const roomId = url.pathname.replace("/ws/", "");
      if (!roomId) {
        return new Response("Missing room ID", { status: 400 });
      }

      const id = env.ROOM.idFromName(roomId);
      const stub = env.ROOM.get(id);
      return stub.fetch(request);
    }

    // API routes
    if (url.pathname.startsWith("/api/")) {
      return app.fetch(request, env);
    }

    // SPA fallback — serve index.html for all non-asset routes
    // (wrangler assets handles static file serving)
    return new Response(null, { status: 404 });
  },
};
```

- [ ] **Step 2: Verify Worker compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/worker/index.ts
git commit -m "feat: add Worker entry point with WebSocket routing"
```

---

### Task 5: WebSocket Client & Zustand Store

**Files:**

- Create: `src/client/lib/ws.ts`
- Create: `src/client/store/room.ts`

- [ ] **Step 1: Create WebSocket client with reconnection**

```typescript
// src/client/lib/ws.ts
import type { ClientMessage, ServerMessage } from "../../shared/types";

export type MessageHandler = (msg: ServerMessage) => void;

export class RoomSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessage: MessageHandler;
  private onConnectionChange: (connected: boolean) => void;
  private delay = 1000;
  private closed = false;

  constructor(
    roomId: string,
    onMessage: MessageHandler,
    onConnectionChange: (connected: boolean) => void,
  ) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.url = `${protocol}//${window.location.host}/ws/${roomId}`;
    this.onMessage = onMessage;
    this.onConnectionChange = onConnectionChange;
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.delay = 1000;
      this.onConnectionChange(true);
    };

    this.ws.onmessage = (event) => {
      const msg: ServerMessage = JSON.parse(event.data);
      this.onMessage(msg);
    };

    this.ws.onclose = () => {
      this.onConnectionChange(false);
      if (!this.closed) {
        setTimeout(() => {
          this.connect();
          this.delay = Math.min(this.delay * 2, 30000);
        }, this.delay);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  close() {
    this.closed = true;
    this.ws?.close();
  }
}
```

- [ ] **Step 2: Create Zustand store**

```typescript
// src/client/store/room.ts
import { create } from "zustand";
import type {
  Room,
  Participant,
  Story,
  Estimate,
  Consensus,
  FibonacciValue,
  ServerMessage,
} from "../../shared/types";

interface RoomState {
  // Connection
  connected: boolean;
  setConnected: (connected: boolean) => void;

  // Room data
  room: Room | null;
  participants: Participant[];
  stories: Story[];
  myId: string | null;
  currentEstimates: number;
  totalParticipants: number;

  // Reveal state
  revealed: boolean;
  estimates: Estimate[];
  consensus: Consensus | null;

  // My selection
  myEstimate: FibonacciValue | null;
  setMyEstimate: (value: FibonacciValue | null) => void;

  // Process server message
  handleMessage: (msg: ServerMessage) => void;

  // Reset for new vote
  resetForReVote: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),

  room: null,
  participants: [],
  stories: [],
  myId: null,
  currentEstimates: 0,
  totalParticipants: 0,

  revealed: false,
  estimates: [],
  consensus: null,

  myEstimate: null,
  setMyEstimate: (value) => set({ myEstimate: value }),

  resetForReVote: () =>
    set({
      revealed: false,
      estimates: [],
      consensus: null,
      myEstimate: null,
      currentEstimates: 0,
    }),

  handleMessage: (msg) => {
    switch (msg.type) {
      case "room_state":
        set({
          room: msg.room,
          participants: msg.participants,
          stories: msg.stories,
          currentEstimates: msg.currentEstimates,
          totalParticipants: msg.totalParticipants,
        });
        break;

      case "participant_joined":
        set((s) => ({
          participants: [...s.participants, msg.participant],
          totalParticipants: s.totalParticipants + 1,
        }));
        break;

      case "participant_left":
        set((s) => ({
          participants: s.participants.filter(
            (p) => p.id !== msg.participantId,
          ),
          totalParticipants: s.totalParticipants - 1,
        }));
        break;

      case "estimate_received":
        set((s) => {
          const participants = s.participants.map((p) =>
            p.id === msg.participantId ? { ...p, hasEstimated: true } : p,
          );
          return {
            participants,
            currentEstimates: s.currentEstimates + 1,
          };
        });
        break;

      case "revealed":
        set({
          revealed: true,
          estimates: msg.estimates,
          consensus: msg.consensus,
        });
        break;

      case "story_added":
        set((s) => ({ stories: [...s.stories, msg.story] }));
        break;

      case "story_changed":
        set((s) => ({
          stories: s.stories.map((st) =>
            st.id === msg.story.id ? msg.story : st,
          ),
        }));
        break;

      case "re_vote_started":
        get().resetForReVote();
        break;

      case "error":
        console.error("Room error:", msg.message);
        break;
    }
  },
}));
```

- [ ] **Step 3: Commit**

```bash
git add src/client/lib/ws.ts src/client/store/room.ts
git commit -m "feat: add WebSocket client and Zustand room store"
```

---

### Task 6: Landing Page

**Files:**

- Create: `src/client/pages/Landing.tsx`
- Create: `src/client/pages/Landing.module.css`

- [ ] **Step 1: Create Landing page component**

```tsx
// src/client/pages/Landing.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateRoomCode } from "../../shared/dictionary";
import styles from "./Landing.module.css";

export default function Landing() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");

  const handleCreate = () => {
    if (!roomName.trim() || !displayName.trim()) return;
    const code = generateRoomCode();
    const slug = roomName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const roomId = `${slug}-${code}`;
    localStorage.setItem("displayName", displayName.trim());
    navigate(`/room/${roomId}`);
  };

  const handleJoin = () => {
    if (!joinCode.trim() || !joinName.trim()) return;
    const code = joinCode.trim().toLowerCase();
    localStorage.setItem("displayName", joinName.trim());
    navigate(`/room/${code}`);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        estimate-it<span className={styles.dot}>.</span>
      </h1>
      <p className={styles.subtitle}>Bias-free story estimation</p>

      <div className={styles.card}>
        <div className={styles.cardLabel}>Create a Room</div>
        <input
          className={styles.input}
          placeholder="Room name (e.g. Sprint 42)"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <input
          className={styles.input}
          placeholder="Your display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button
          className={styles.btnPrimary}
          onClick={handleCreate}
          disabled={!roomName.trim() || !displayName.trim()}
        >
          Create Room
        </button>
      </div>

      <div className={styles.divider}>or</div>

      <div className={styles.card}>
        <div className={styles.cardLabel}>Join a Room</div>
        <input
          className={styles.input}
          placeholder="Room code (e.g. coral-falcon)"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />
        <input
          className={styles.input}
          placeholder="Your display name"
          value={joinName}
          onChange={(e) => setJoinName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />
        <button
          className={styles.btnSecondary}
          onClick={handleJoin}
          disabled={!joinCode.trim() || !joinName.trim()}
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Landing styles**

```css
/* src/client/pages/Landing.module.css */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
}

.title {
  font-size: 42px;
  font-weight: 700;
  letter-spacing: -1px;
  margin-bottom: 4px;
}

.dot {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: #737373;
  font-size: 16px;
  margin-bottom: 40px;
}

.card {
  background: #171717;
  border: 1px solid #262626;
  border-radius: 16px;
  padding: 28px;
  width: 100%;
  max-width: 380px;
  margin-bottom: 16px;
}

.cardLabel {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #737373;
  margin-bottom: 16px;
  font-weight: 600;
}

.input {
  width: 100%;
  padding: 12px 16px;
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 10px;
  color: #e5e5e5;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  margin-bottom: 12px;
  transition: border-color 0.2s;
}

.input:focus {
  border-color: #3b82f6;
}

.input::placeholder {
  color: #525252;
}

.btnPrimary,
.btnSecondary {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.btnPrimary {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
}

.btnPrimary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btnSecondary {
  background: #262626;
  color: #d4d4d4;
}

.btnSecondary:hover:not(:disabled) {
  background: #333;
}

.btnPrimary:disabled,
.btnSecondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.divider {
  text-align: center;
  color: #525252;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 8px 0;
}
```

- [ ] **Step 3: Update App.tsx with router**

```tsx
// src/client/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Room from "./pages/Room";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Add react-router-dom dependency**

Run: `npm install react-router-dom @types/react-router-dom`

- [ ] **Step 5: Commit**

```bash
git add src/client/pages/Landing.tsx src/client/pages/Landing.module.css src/client/App.tsx package.json
git commit -m "feat: add landing page with create/join room flow"
```

---

### Task 7: Card Grid Component (3D CSS)

**Files:**

- Create: `src/client/components/CardGrid.tsx`
- Create: `src/client/components/CardGrid.module.css`

- [ ] **Step 1: Create 3D Card Grid**

```tsx
// src/client/components/CardGrid.tsx
import type { FibonacciValue } from "../../shared/types";
import { FIBONACCI_VALUES } from "../../shared/types";
import styles from "./CardGrid.module.css";

interface CardGridProps {
  selected: FibonacciValue | null;
  onSelect: (value: FibonacciValue) => void;
  disabled: boolean;
}

export default function CardGrid({
  selected,
  onSelect,
  disabled,
}: CardGridProps) {
  return (
    <div className={styles.wrapper}>
      <h3 className={styles.label}>Your estimate</h3>
      <div className={styles.scene}>
        <div className={styles.table}>
          {FIBONACCI_VALUES.map((value) => (
            <button
              key={value}
              className={`${styles.card} ${selected === value ? styles.selected : ""}`}
              onClick={() => !disabled && onSelect(value)}
              disabled={disabled}
            >
              <div className={styles.cardInner}>
                <div className={styles.cardBack} />
                <div className={styles.cardFace}>{value}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create 3D card styles**

```css
/* src/client/components/CardGrid.module.css */
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
}

.label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #737373;
  margin-bottom: 24px;
  font-weight: 500;
}

.scene {
  perspective: 1000px;
}

.table {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  transform: rotateX(12deg);
  transform-style: preserve-3d;
  max-width: 600px;
}

.card {
  width: 68px;
  height: 96px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  perspective: 600px;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card:hover:not(:disabled) {
  transform: translateZ(20px) translateY(-12px);
}

.card:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.cardInner {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card.selected .cardInner {
  transform: rotateY(180deg);
}

.card.selected {
  transform: translateZ(36px) translateY(-16px);
}

.cardBack,
.cardFace {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cardBack {
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border: 2px solid #2a2a4a;
}

.cardBack::after {
  content: "";
  position: absolute;
  inset: 6px;
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-radius: 8px;
}

.cardFace {
  background: linear-gradient(145deg, #0f2440, #1e3a5f);
  border: 2px solid rgba(59, 130, 246, 0.4);
  transform: rotateY(180deg);
  font-size: 26px;
  font-weight: 800;
  color: #60a5fa;
}

/* Holographic shimmer on hover */
.cardBack::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: conic-gradient(
    from 0deg,
    transparent,
    rgba(139, 92, 246, 0.08),
    transparent 30%
  );
  animation: holographic 4s linear infinite paused;
}

.card:hover:not(:disabled) .cardBack::before {
  animation-play-state: running;
}

@keyframes holographic {
  to {
    transform: rotate(360deg);
  }
}

.card.selected .cardBack {
  box-shadow: 0 0 24px rgba(59, 130, 246, 0.3);
}

/* Glow on selected */
.card.selected .cardFace {
  box-shadow:
    0 0 20px rgba(96, 165, 250, 0.2),
    0 0 40px rgba(96, 165, 250, 0.1);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/client/components/CardGrid.tsx src/client/components/CardGrid.module.css
git commit -m "feat: add 3D Fibonacci card grid with CSS perspective"
```

---

### Task 8: Participant Sidebar

**Files:**

- Create: `src/client/components/ParticipantList.tsx`
- Create: `src/client/components/ParticipantList.module.css`

- [ ] **Step 1: Create Participant List**

```tsx
// src/client/components/ParticipantList.tsx
import { Users } from "lucide-react";
import type { Participant } from "../../shared/types";
import styles from "./ParticipantList.module.css";

interface ParticipantListProps {
  participants: Participant[];
}

export default function ParticipantList({
  participants,
}: ParticipantListProps) {
  return (
    <div className={styles.sidebar}>
      <h3 className={styles.heading}>
        <Users size={14} />
        <span>Participants ({participants.length})</span>
      </h3>
      <div className={styles.list}>
        {participants.map((p) => (
          <div key={p.id} className={styles.participant}>
            <div
              className={styles.avatar}
              style={{ background: p.color + "22", color: p.color }}
            >
              {p.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className={styles.info}>
              <div className={styles.name}>{p.displayName}</div>
              <div
                className={`${styles.status} ${p.hasEstimated ? styles.voted : ""}`}
              >
                {p.hasEstimated ? "✓ estimated" : "picking..."}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create sidebar styles**

```css
/* src/client/components/ParticipantList.module.css */
.sidebar {
  border-left: 1px solid #1f1f1f;
  padding: 20px 16px;
  min-width: 220px;
}

.heading {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: #737373;
  margin-bottom: 16px;
  font-weight: 500;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.participant {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.15s;
}

.participant:hover {
  background: rgba(255, 255, 255, 0.03);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.info {
  min-width: 0;
}

.name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status {
  font-size: 12px;
  color: #525252;
  transition: color 0.3s;
}

.status.voted {
  color: #4ade80;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/client/components/ParticipantList.tsx src/client/components/ParticipantList.module.css
git commit -m "feat: add real-time participant sidebar"
```

---

### Task 9: Reveal Board with Spring Animation

**Files:**

- Create: `src/client/components/RevealBoard.tsx`
- Create: `src/client/components/RevealBoard.module.css`

- [ ] **Step 1: Create Reveal Board with Framer Motion**

```tsx
// src/client/components/RevealBoard.tsx
import { motion } from "framer-motion";
import type { Estimate, Consensus, Participant } from "../../shared/types";
import styles from "./RevealBoard.module.css";

interface RevealBoardProps {
  estimates: Estimate[];
  consensus: Consensus | null;
  participants: Participant[];
  onReVote: () => void;
  onNextStory: () => void;
  hasNextStory: boolean;
}

export default function RevealBoard({
  estimates,
  consensus,
  participants,
  onReVote,
  onNextStory,
  hasNextStory,
}: RevealBoardProps) {
  const getName = (participantId: string) =>
    participants.find((p) => p.id === participantId)?.displayName ?? "?";

  const getColor = (participantId: string) =>
    participants.find((p) => p.id === participantId)?.color ?? "#666";

  // Sort estimates by value for visual clarity
  const fibOrder = ["1", "2", "3", "5", "8", "13", "21", "☕"];
  const sorted = [...estimates].sort(
    (a, b) => fibOrder.indexOf(a.value) - fibOrder.indexOf(b.value),
  );

  return (
    <div className={styles.board}>
      <motion.h3
        className={styles.title}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        ✅ All Estimates Revealed
      </motion.h3>

      <div className={styles.estimates}>
        {sorted.map((est, i) => {
          const color = getColor(est.participantId);
          const isConsensus = consensus && est.value === consensus.value;
          return (
            <motion.div
              key={est.participantId}
              className={styles.slot}
              initial={{ opacity: 0, y: -60, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: 0.2 + i * 0.12,
                type: "spring",
                stiffness: 400,
                damping: 15,
              }}
            >
              <div
                className={`${styles.estimateCard} ${isConsensus ? styles.consensusCard : ""}`}
                style={{
                  borderColor: color,
                  height: `${60 + fibOrder.indexOf(est.value) * 12}px`,
                }}
              >
                {est.value}
              </div>
              <div className={styles.estimateName} style={{ color }}>
                {getName(est.participantId)}
              </div>
            </motion.div>
          );
        })}
      </div>

      {consensus && (
        <motion.div
          className={styles.consensus}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + sorted.length * 0.12 + 0.3 }}
        >
          <div className={styles.consensusValue}>{consensus.value}</div>
          <div className={styles.consensusLabel}>
            consensus ({consensus.count} of {consensus.total})
          </div>
        </motion.div>
      )}

      <motion.div
        className={styles.actions}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 + sorted.length * 0.12 + 0.5 }}
      >
        <button className={styles.btnSecondary} onClick={onReVote}>
          New Vote
        </button>
        {hasNextStory && (
          <button className={styles.btnPrimary} onClick={onNextStory}>
            Next Story →
          </button>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Create reveal styles**

```css
/* src/client/components/RevealBoard.module.css */
.board {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: #4ade80;
  margin-bottom: 24px;
}

.estimates {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  margin-bottom: 24px;
  min-height: 120px;
}

.slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.estimateCard {
  width: 64px;
  border-radius: 10px;
  border: 2px solid #333;
  background: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 800;
  color: #a3a3a3;
  transition: box-shadow 0.3s;
}

.consensusCard {
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
}

.estimateName {
  font-size: 12px;
  font-weight: 500;
}

.consensus {
  text-align: center;
  margin-bottom: 24px;
}

.consensusValue {
  font-size: 40px;
  font-weight: 900;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.consensusLabel {
  color: #737373;
  font-size: 13px;
  margin-top: 4px;
}

.actions {
  display: flex;
  gap: 12px;
}

.btnPrimary,
.btnSecondary {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.btnPrimary {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
}

.btnPrimary:hover {
  opacity: 0.9;
}

.btnSecondary {
  background: #171717;
  color: #d4d4d4;
  border: 1px solid #333;
}

.btnSecondary:hover {
  background: #262626;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/client/components/RevealBoard.tsx src/client/components/RevealBoard.module.css
git commit -m "feat: add reveal board with spring animation"
```

---

### Task 10: Story Card Component

**Files:**

- Create: `src/client/components/StoryCard.tsx`
- Create: `src/client/components/StoryCard.module.css`

- [ ] **Step 1: Create Story Card**

```tsx
// src/client/components/StoryCard.tsx
import type { Story } from "../../shared/types";
import styles from "./StoryCard.module.css";

interface StoryCardProps {
  story: Story | null;
  onAddStory: (title: string, description: string) => void;
}

export default function StoryCard({ story, onAddStory }: StoryCardProps) {
  if (story) {
    return (
      <div className={styles.card}>
        <div className={styles.label}>Current Story</div>
        <div className={styles.title}>{story.title}</div>
        {story.description && (
          <div className={styles.description}>{story.description}</div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.label}>No Story</div>
      <div className={styles.title}>Estimating...</div>
      <div className={styles.description}>
        Discuss the story verbally, then pick your estimate.
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create story card styles**

```css
/* src/client/components/StoryCard.module.css */
.card {
  background: #171717;
  border: 1px solid #262626;
  border-radius: 12px;
  padding: 20px;
  margin: 24px;
}

.label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #737373;
  margin-bottom: 8px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
}

.description {
  color: #a3a3a3;
  font-size: 14px;
  line-height: 1.6;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/client/components/StoryCard.tsx src/client/components/StoryCard.module.css
git commit -m "feat: add story card component"
```

---

### Task 11: Room Page (wires everything together)

**Files:**

- Create: `src/client/pages/Room.tsx`
- Create: `src/client/pages/Room.module.css`

- [ ] **Step 1: Create Room page**

```tsx
// src/client/pages/Room.tsx
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useRoomStore } from "../store/room";
import { RoomSocket } from "../lib/ws";
import type { FibonacciValue } from "../../shared/types";
import CardGrid from "../components/CardGrid";
import ParticipantList from "../components/ParticipantList";
import RevealBoard from "../components/RevealBoard";
import StoryCard from "../components/StoryCard";
import styles from "./Room.module.css";

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const wsRef = useRef<RoomSocket | null>(null);

  const {
    connected,
    setConnected,
    room,
    participants,
    stories,
    revealed,
    estimates,
    consensus,
    myEstimate,
    setMyEstimate,
    handleMessage,
  } = useRoomStore();

  // Connect to WebSocket
  useEffect(() => {
    if (!roomId) return;

    const ws = new RoomSocket(roomId, handleMessage, setConnected);
    ws.connect();
    wsRef.current = ws;

    // Join with stored display name
    const displayName = localStorage.getItem("displayName") || "Anonymous";
    ws.send({ type: "join", displayName });

    return () => ws.close();
  }, [roomId]);

  const handleEstimate = (value: FibonacciValue) => {
    setMyEstimate(value);
    wsRef.current?.send({ type: "estimate", value });
  };

  const handleReveal = () => {
    wsRef.current?.send({ type: "reveal" });
  };

  const handleReVote = () => {
    wsRef.current?.send({ type: "re_vote" });
  };

  const handleNextStory = () => {
    wsRef.current?.send({ type: "next_story" });
  };

  const handleAddStory = (title: string, description: string) => {
    wsRef.current?.send({ type: "add_story", title, description });
  };

  const activeStory = stories.find((s) => s.status === "active") ?? null;
  const hasNextStory = stories.some((s) => s.status === "pending");

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>
          estimate-it<span className={styles.dot}>.</span>
        </h1>
        <div className={styles.roomInfo}>
          {room?.name && <span className={styles.roomName}>{room.name}</span>}
          <span className={styles.code}>{roomId}</span>
          <div className={styles.copyHint}>click to copy</div>
        </div>
        <div
          className={`${styles.status} ${connected ? styles.online : styles.offline}`}
        >
          {connected ? "connected" : "reconnecting..."}
        </div>
      </header>

      <div className={styles.main}>
        <div className={styles.content}>
          <StoryCard story={activeStory} onAddStory={handleAddStory} />

          {!revealed ? (
            <>
              <CardGrid
                selected={myEstimate}
                onSelect={handleEstimate}
                disabled={!activeStory}
              />
              <div className={styles.revealArea}>
                <button className={styles.revealBtn} onClick={handleReveal}>
                  Reveal Estimates
                </button>
              </div>
            </>
          ) : (
            <RevealBoard
              estimates={estimates}
              consensus={consensus}
              participants={participants}
              onReVote={handleReVote}
              onNextStory={handleNextStory}
              hasNextStory={hasNextStory}
            />
          )}
        </div>

        <ParticipantList participants={participants} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Room page styles**

```css
/* src/client/pages/Room.module.css */
.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-bottom: 1px solid #1f1f1f;
}

.logo {
  font-size: 18px;
  font-weight: 700;
}

.dot {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.roomInfo {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.roomName {
  color: #a3a3a3;
  font-size: 14px;
}

.code {
  color: #737373;
  font-size: 13px;
  background: #171717;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
}

.code:hover + .copyHint {
  opacity: 1;
}

.copyHint {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: #737373;
  opacity: 0;
  transition: opacity 0.2s;
  margin-top: 4px;
  white-space: nowrap;
}

.status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
}

.online {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}

.offline {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.main {
  display: grid;
  grid-template-columns: 1fr 240px;
  flex: 1;
}

.content {
  display: flex;
  flex-direction: column;
}

.revealArea {
  display: flex;
  justify-content: center;
  padding: 16px;
}

.revealBtn {
  padding: 12px 32px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.revealBtn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/client/pages/Room.tsx src/client/pages/Room.module.css
git commit -m "feat: add Room page wiring all components together"
```

---

### Task 12: Story Management UI & Final Polish

**Files:**

- Create: `src/client/components/AddStory.tsx`
- Create: `src/client/components/AddStory.module.css`
- Modify: `src/client/pages/Room.tsx` (add story management)
- Modify: `src/client/pages/Room.module.css` (responsive tweaks)

- [ ] **Step 1: Create Add Story component**

```tsx
// src/client/components/AddStory.tsx
import { useState } from "react";
import { Plus } from "lucide-react";
import styles from "./AddStory.module.css";

interface AddStoryProps {
  onAdd: (title: string, description: string) => void;
}

export default function AddStory({ onAdd }: AddStoryProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), description.trim());
    setTitle("");
    setDescription("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button className={styles.trigger} onClick={() => setOpen(true)}>
        <Plus size={16} />
        <span>Add Story</span>
      </button>
    );
  }

  return (
    <div className={styles.form}>
      <input
        className={styles.input}
        placeholder="Story title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <textarea
        className={styles.textarea}
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />
      <div className={styles.actions}>
        <button className={styles.cancel} onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button
          className={styles.submit}
          onClick={handleSubmit}
          disabled={!title.trim()}
        >
          Add
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Add Story styles**

```css
/* src/client/components/AddStory.module.css */
.trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #171717;
  border: 1px dashed #333;
  border-radius: 8px;
  color: #737373;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  margin: 0 24px 24px;
}

.trigger:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.form {
  margin: 0 24px 24px;
  padding: 16px;
  background: #171717;
  border: 1px solid #262626;
  border-radius: 12px;
}

.input,
.textarea {
  width: 100%;
  padding: 10px 12px;
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 8px;
  color: #e5e5e5;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  margin-bottom: 8px;
  resize: vertical;
}

.input:focus,
.textarea:focus {
  border-color: #3b82f6;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}

.cancel,
.submit {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.cancel {
  background: none;
  border: 1px solid #333;
  color: #a3a3a3;
}

.submit {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border: none;
  color: white;
}

.submit:disabled {
  opacity: 0.4;
}
```

- [ ] **Step 3: Add story queue indicator to Room page**

Modify `src/client/pages/Room.tsx` — add story queue and add-story button in the content area, below the StoryCard:

```tsx
// Add import
import AddStory from "../components/AddStory";

// In the content area, after <StoryCard>:
<AddStory onAdd={handleAddStory} />;

// Add story queue indicator (show count of remaining stories)
{
  stories.length > 1 && (
    <div className={styles.storyQueue}>
      {stories.filter((s) => s.status === "done").length + 1} / {stories.length}{" "}
      stories
    </div>
  );
}
```

- [ ] **Step 4: Add responsive styles for mobile**

Add to `src/client/pages/Room.module.css`:

```css
.storyQueue {
  text-align: center;
  color: #737373;
  font-size: 12px;
  padding: 0 24px 8px;
}

@media (max-width: 768px) {
  .main {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Final build check**

Run: `npm run build`
Expected: Successful build to `dist/`

- [ ] **Step 6: Commit**

```bash
git add src/client/components/AddStory.tsx src/client/components/AddStory.module.css src/client/pages/Room.tsx src/client/pages/Room.module.css
git commit -m "feat: add story management UI and responsive polish"
```

---

## Spec Coverage Checklist

| Spec Requirement                  | Task                                   |
| --------------------------------- | -------------------------------------- |
| Create/join room via word code    | Task 6 (Landing)                       |
| Fibonacci card selection (3D CSS) | Task 7 (CardGrid)                      |
| Real-time participant list        | Task 8 (ParticipantList)               |
| Reveal with spring animation      | Task 9 (RevealBoard)                   |
| Story queue (optional, manual)    | Task 12 (AddStory)                     |
| Re-vote                           | Task 3 (Room DO), Task 9 (RevealBoard) |
| WebSocket protocol                | Task 3 (Room DO), Task 5 (WS client)   |
| Durable Object + SQLite           | Task 3 (Room DO)                       |
| Worker routing + static assets    | Task 4 (Worker)                        |
| CSS Modules                       | All component tasks                    |
| No AI in MVP                      | Confirmed — no AI tasks                |
| No auth in MVP                    | Confirmed — no auth tasks              |

---

## Execution

**Plan complete and saved to `docs/superpowers/plans/2026-04-02-estimate-implementation.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
