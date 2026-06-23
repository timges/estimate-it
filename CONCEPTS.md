# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Room

A planning poker session identified by a slug (e.g. `tundra-cove`). Backed by a Durable Object that owns all state: participants, stories, estimates, and WebSocket connections. Multiple participants join the same room to estimate collaboratively.

## Story

A work item being estimated. Has a lifecycle: pending → active → revealed → done. Only one story is active at a time. Estimates are scoped to the active story — switching stories changes which round participants vote in.

## Round

The voting context for the active story. Identified by the active story's database ID, or `0` when no story exists ("round 0"). All estimates, vote counts, and reveal queries are scoped to the current round. Changing the active story changes the round.

## Estimate

A participant's vote for the current round. Stored as a Fibonacci value (`1` through `21`, or `☕` for abstain). One estimate per participant per round — re-voting overwrites. Estimates are hidden until reveal to prevent anchoring bias.

## Reveal

The action of showing all estimates for the current round simultaneously. Queries all estimates scoped to the active story, computes the distribution, and broadcasts to all clients. The anti-bias design: no one sees others' votes until everyone has voted and someone triggers reveal.

## Participant

A user in the room, identified by a stable `clientId` (persisted in localStorage). Participants survive brief disconnects via a 15-second grace period — their identity and vote are preserved. After the grace period, they are removed and must rejoin as a new participant.

## Durable Object

Cloudflare's stateful compute primitive. Each room is a Durable Object with its own SQLite database. Processes WebSocket messages single-threaded, so there are no race conditions within a single room. Goes to sleep when idle and wakes on incoming messages or alarms.

## clientId

A UUID generated once per browser and stored in localStorage. The server uses it to match reconnecting sockets to existing participants. If localStorage is cleared or unavailable (private browsing), a new identity is created on each page load.
