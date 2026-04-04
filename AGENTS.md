# AGENTS.md

## Project Overview

Real-time planning poker app built on Cloudflare Workers with Durable Objects for room state management. React frontend with Zustand state management, served as static assets from the Worker.

**Tech stack:** Cloudflare Workers, Durable Objects (SQLite), Hono (API router), React 19, Zustand, Vite, TypeScript strict mode.

## Architecture

- `src/worker/` — Cloudflare Worker entry (`index.ts`) + Durable Object (`room.ts`)
- `src/client/` — React SPA (pages, components, store, lib)
- `src/shared/` — Types and utilities shared between worker and client
- `test/unit/` — Vitest unit tests (room RPC methods, store, dictionary)
- `test/integration/` — Vitest integration tests (worker via `cloudflare:test`)
- `test/components/` — Vitest component tests (jsdom + Testing Library)
- `test/vrt/` — Playwright visual regression tests

## Commands

```bash
# Development
pnpm dev              # Vite dev server (client only)
pnpm preview          # Wrangler dev (full stack)

# Build & Deploy
pnpm build            # Vite build
pnpm deploy           # Build + deploy to Cloudflare
pnpm cf-typegen       # Generate Wrangler types

# Lint (type checking only, no ESLint)
pnpm lint             # tsc --noEmit

# Tests
pnpm test             # Run all unit + integration tests (vitest run)
pnpm test:watch       # Vitest in watch mode
pnpm test:vrt         # Playwright visual regression tests

# Run single test
pnpm vitest run test/unit/room.test.ts
pnpm vitest run test/unit/room.test.ts -t "should create the room"
pnpm vitest run --project components test/components/card-grid.test.tsx
```

## Test Configuration

Three vitest projects via `vitest.workspace.ts`:
1. **Worker tests** (`vitest.config.cf.ts`) — uses `@cloudflare/vitest-pool-workers`, covers `test/unit/room.test.ts` and `test/integration/**/*.test.ts`
2. **Unit tests** (`vitest.config.unit.ts`) — for store and dictionary tests
3. **Component tests** — jsdom environment, setup in `test/components/setup.ts`

## Code Style

### TypeScript
- `strict: true` enabled — no `any`, use `unknown` with type guards
- Explicit return types on exported functions
- Use `type` for unions, tuples, and primitives; `interface` for object shapes
- Prefer `as const` for literal types (see `FIBONACCI_VALUES`, `WORDS`)

### Imports
- Types use `import type { ... }` (isolated from value imports)
- Relative paths within `src/` (no path aliases)
- Shared code lives in `src/shared/` — import from there, never duplicate types

### Components
- Default exports for components: `export default function CardGrid(...)`
- Props interfaces named `{ComponentName}Props`
- CSS Modules: `styles = "./Component.module.css"`, accessed as `styles.className`
- Avoid prop spreading — destructure in function signature

### State Management
- Zustand stores in `src/client/store/`
- Store shape defined as interface, then `create<Interface>()`
- Handlers defined inside store, not as separate functions

### Durable Objects
- RPC methods are public instance methods on the `Room` class
- Private helpers prefixed with `private`
- SQL via `this.ctx.storage.sql.exec()` with parameterized queries
- WebSocket messages use typed discriminated unions (`ClientMessage`, `ServerMessage`)

### Naming
- Files: `kebab-case.ts` for worker/lib, `PascalCase.tsx` for components
- Variables/functions: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE` for true constants, `camelCase` for module-level values

### Error Handling
- Return `Response` with appropriate status codes from Worker
- WebSocket errors: send `{ type: "error", message: string }` to client
- Store errors: `console.error()` — no UI error boundary yet

## Key Patterns

### Testing Durable Objects
```typescript
import { env, runInDurableObject } from "cloudflare:test";

const stub = env.ROOM.idFromName("test-room");
const instance = env.ROOM.get(stub);

await runInDurableObject(instance, async (room: Room) => {
  // Direct access to instance methods and ctx.storage
  expect(room.roomExists()).toBe(false);
});
```

### Testing Zustand Stores
```typescript
beforeEach(() => {
  useRoomStore.setState({ /* reset to defaults */ });
});
```

### Testing Components
```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const user = userEvent.setup();
render(<Component prop={value} />);
await user.click(screen.getByRole("button"));
```
