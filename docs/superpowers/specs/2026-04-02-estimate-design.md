# `estimate-it.` — Design Spec

**Date:** 2026-04-02
**Status:** Ready for implementation

## Summary

A real-time, bias-free story estimation tool for dev teams. Participants join a room via a short word code, select Fibonacci cards, and reveal simultaneously. The UI uses 3D CSS cards on a tilted table with spring-physics reveal animations.

## Stack

| Layer                 | Technology                           |
| --------------------- | ------------------------------------ |
| Frontend              | React + Vite + CSS Modules           |
| Backend               | Cloudflare Workers + Durable Objects |
| Real-time             | WebSocket via Durable Object         |
| Storage               | DO SQLite (per-room)                 |
| AI (future)           | Workers AI — not in MVP              |
| Auth/Billing (future) | Clerk/Stripe — not in MVP            |

## Architecture

```
Browser ←WebSocket→ Durable Object (room-dove)
                         ├── SQLite: room, stories, estimates, participants
                         ├── WebSocket sessions
                         └── Room state machine

Browser ←HTTPS→ Worker
                  ├── Routes /room/:id → Durable Object (getByName)
                  ├── Serves React SPA (static assets)
                  └── Room creation endpoint
```

One Durable Object per room. Room ID is `{slug}-{word}` (e.g. `sprint42-dove`). Used as DO name for deterministic routing.

## Pages

### 1. Landing (`/`)

Two flows, zero friction:

- **Create:** Room name + display name → creates room, redirects to `/room/{slug}-{word}`
- **Join:** Single input accepts full URL, slug-word combo, or just the word → resolves room, redirects

Dictionary: ~2000 curated words (animals, nature). No ambiguous characters (no `l`/`1`, `0`/`O`).

### 2. Room (`/room/:id`)

Single page, state-driven by WebSocket messages. Three visual states:

**Waiting:**

- Story card (optional) with title/description
- Fibonacci card grid on 3D tilted table (perspective CSS)
- Participant sidebar (names + voted/not-voted status, never values)
- "Reveal Estimates" button — available to all participants (not creator-only)

**Revealed:**

- Cards drop in one by one with spring bounce animation
- Height proportional to Fibonacci value
- Outliers visually obvious
- Consensus value displayed
- "Revote" / "Next Story" buttons — available to all participants

**No story:**

- Same estimation flow, just no story card displayed
- Participants estimate from verbal discussion elsewhere

## Estimation Flow

1. Creator makes room → shares word code ("hop into dove")
2. Participants join with display name
3. Creator optionally adds story title + description
4. Everyone picks a Fibonacci card: `1, 2, 3, 5, 8, 13, 21, ☕`
5. Sidebar shows "✓ estimated" / "picking..." — never the value
6. Anyone hits Reveal → cards drop in with staggered spring bounce
7. Discuss → Anyone can trigger Next story or Revote

## Visual Identity

- Dark theme (#060606 base, #171717 cards, #262626 borders)
- Accent: blue → purple gradient (#3b82f6 → #8b5cf6)
- CSS 3D perspective card table (tilted ~15°)
- Holographic glass shimmer on card hover
- Spring bounce reveal (`cubic-bezier(0.34, 1.56, 0.64, 1)`)
- Minimal chrome — the cards are the UI

## WebSocket Protocol

### Client → Server

```typescript
{ type: "join", display_name: string }
{ type: "estimate", value: string }  // "1"–"21" or "☕"
{ type: "reveal" }
{ type: "next_story" }
{ type: "re_vote" }
{ type: "add_story", title?: string, description?: string }
{ type: "add_stories", stories: { title: string, description?: string }[] }
```

### Server → Client

```typescript
{ type: "room_state", room: Room, participants: Participant[], stories: Story[] }
{ type: "participant_joined", participant: Participant }
{ type: "participant_left", participant_id: string }
{ type: "estimate_received", participant_id: string }  // no value!
{ type: "revealed", estimates: { participant_id: string, value: string }[], consensus: { value: string, count: number } }
{ type: "story_added", story: Story }
{ type: "story_changed", story: Story }
{ type: "re_vote_started" }
{ type: "error", message: string }
```

**Key constraint:** `estimate_received` never broadcasts the value. Values stay locked in the DO until reveal.

## Data Model (DO SQLite)

```sql
CREATE TABLE room (
  id TEXT PRIMARY KEY,
  name TEXT,
  created_at INTEGER
);

CREATE TABLE story (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  description TEXT,
  position INTEGER,
  status TEXT DEFAULT 'pending'  -- pending | active | revealed | done
);

CREATE TABLE estimate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER,
  participant_id TEXT,
  value TEXT,  -- "1","2","3","5","8","13","21","☕"
  created_at INTEGER
);

CREATE TABLE participant (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  color TEXT,
  joined_at INTEGER
);
```

## wrangler.jsonc Bindings

- `ROOMS` — Durable Object namespace
- `AI` — Workers AI (future, not wired in MVP)
- Static assets from `dist/`

## Deployment

- `wrangler deploy` for both Worker + static assets
- Durable Object migrations via `new_sqlite_classes`
- No database to provision — SQLite lives in the DO

## MVP Scope

| Feature                           | Status    |
| --------------------------------- | --------- |
| Create/join room via word code    | ✅        |
| Fibonacci card selection (3D CSS) | ✅        |
| Real-time participant list        | ✅        |
| Reveal with spring animation      | ✅        |
| Story queue (optional, manual)    | ✅        |
| Re-vote                           | ✅        |
| AI estimation                     | ❌ future |
| AI story refinement               | ❌ future |
| Jira/GitHub import                | ❌ future |
| Auth/billing                      | ❌ future |
