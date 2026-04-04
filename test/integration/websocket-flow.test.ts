import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import type { ServerMessage } from "../../src/shared/types";

interface Connection {
  ws: WebSocket;
  nextMessage: () => Promise<ServerMessage>;
  collectMessages: (count: number) => Promise<ServerMessage[]>;
  close: () => void;
}

async function connect(roomId: string): Promise<Connection> {
  const res = await SELF.fetch(`http://example.com/ws/${roomId}`, {
    headers: { Upgrade: "websocket" },
  });
  expect(res.status).toBe(101);
  const ws = res.webSocket!;
  ws.accept();

  const queue: ServerMessage[] = [];
  const waiters: ((msg: ServerMessage) => void)[] = [];

  ws.addEventListener("message", (event: MessageEvent) => {
    const msg = JSON.parse(event.data as string) as ServerMessage;
    if (waiters.length > 0) {
      waiters.shift()!(msg);
    } else {
      queue.push(msg);
    }
  });

  function nextMessage(): Promise<ServerMessage> {
    if (queue.length > 0) return Promise.resolve(queue.shift()!);
    return new Promise((resolve) => waiters.push(resolve));
  }

  function collectMessages(count: number): Promise<ServerMessage[]> {
    const msgs: ServerMessage[] = [];
    return new Promise((resolve) => {
      const remaining = { n: count };
      function drain() {
        while (queue.length > 0 && remaining.n > 0) {
          msgs.push(queue.shift()!);
          remaining.n--;
        }
        if (remaining.n === 0) {
          resolve(msgs);
        }
      }
      // Drain immediately if messages are already available
      drain();
      if (remaining.n > 0) {
        const originalPush = waiters.push.bind(waiters);
        // We need a different approach: drain from waiter
        const waiter = (msg: ServerMessage) => {
          msgs.push(msg);
          remaining.n--;
          if (remaining.n === 0) {
            resolve(msgs);
          } else {
            waiters.push(waiter);
          }
        };
        waiters.push(waiter);
      }
    });
  }

  return { ws, nextMessage, collectMessages, close: () => ws.close() };
}

function uid(): string {
  return crypto.randomUUID().slice(0, 8);
}

describe("WebSocket flow integration", () => {
  it("join to nonexistent room returns error", async () => {
    const room = `flow-noexist-${uid()}`;
    const conn = await connect(room);

    // Try to join a room that hasn't been created
    conn.ws.send(JSON.stringify({ type: "join", displayName: "Alice" }));
    const msg = await conn.nextMessage();
    expect(msg.type).toBe("error");
    expect((msg as any).message).toBe("Room not found");

    conn.close();
  });

  it("full flow: connect → create → estimate → reveal → verify revealed", async () => {
    const room = `flow-full-${uid()}`;
    const conn = await connect(room);

    // Create
    conn.ws.send(JSON.stringify({ type: "create", displayName: "Alice" }));
    const state = await conn.nextMessage();
    expect(state.type).toBe("room_state");
    expect((state as any).participants).toHaveLength(1);

    // Estimate
    conn.ws.send(JSON.stringify({ type: "estimate", value: "5" }));
    const estimateMsg = await conn.nextMessage();
    expect(estimateMsg.type).toBe("estimate_received");

    // Reveal
    conn.ws.send(JSON.stringify({ type: "reveal" }));
    const revealed = await conn.nextMessage();
    expect(revealed.type).toBe("revealed");
    const rev = revealed as any;
    expect(rev.estimates).toHaveLength(1);
    expect(rev.estimates[0].value).toBe("5");
    expect(rev.revealResult.average).toBe(5);
    expect(rev.revealResult.allAgree).toBe(false);
    expect(rev.revealResult.distribution).toEqual([{ value: "5", count: 1 }]);

    conn.close();
  });

  it("two participants: connect both, first creates, second joins, verify both see each other", async () => {
    const room = `flow-two-${uid()}`;
    const alice = await connect(room);

    // Alice creates the room first
    alice.ws.send(JSON.stringify({ type: "create", displayName: "Alice" }));
    const aliceState = await alice.nextMessage();
    expect(aliceState.type).toBe("room_state");
    expect((aliceState as any).participants).toHaveLength(1);

    // Connect Bob after Alice has joined
    const bob = await connect(room);
    bob.ws.send(JSON.stringify({ type: "join", displayName: "Bob" }));

    // Both will receive messages (room_state for Bob, participant_joined for Alice)
    // Collect from each independently
    const [aliceMsg1, bobMsg1] = await Promise.all([
      alice.nextMessage(),
      bob.nextMessage(),
    ]);

    // Alice gets participant_joined
    expect(aliceMsg1.type).toBe("participant_joined");
    expect((aliceMsg1 as any).participant.displayName).toBe("Bob");

    // Bob gets room_state with both participants
    expect(bobMsg1.type).toBe("room_state");
    expect((bobMsg1 as any).participants).toHaveLength(2);

    // Both estimate, then reveal
    alice.ws.send(JSON.stringify({ type: "estimate", value: "3" }));
    bob.ws.send(JSON.stringify({ type: "estimate", value: "8" }));

    // Drain estimate_received messages (order may vary)
    await Promise.all([
      alice.collectMessages(2),
      bob.collectMessages(2),
    ]);

    alice.ws.send(JSON.stringify({ type: "reveal" }));
    const revealed = await alice.nextMessage();
    expect(revealed.type).toBe("revealed");
    const rev = revealed as any;
    expect(rev.estimates).toHaveLength(2);
    expect(rev.revealResult).not.toBeNull();
    expect(rev.revealResult.average).toBe(5.5);
    expect(rev.revealResult.allAgree).toBe(false);

    // Bob also sees the reveal
    const bobRevealed = await bob.nextMessage();
    expect(bobRevealed.type).toBe("revealed");

    alice.close();
    bob.close();
  });

  it("reVote flow: create → estimate → reveal → reVote → verify re_vote_started", async () => {
    const room = `flow-revote-${uid()}`;
    const conn = await connect(room);

    conn.ws.send(JSON.stringify({ type: "create", displayName: "Alice" }));
    await conn.nextMessage(); // room_state

    conn.ws.send(JSON.stringify({ type: "estimate", value: "5" }));
    await conn.nextMessage(); // estimate_received

    conn.ws.send(JSON.stringify({ type: "reveal" }));
    const revealed = await conn.nextMessage();
    expect(revealed.type).toBe("revealed");
    expect((revealed as any).estimates[0].value).toBe("5");

    // Re-vote
    conn.ws.send(JSON.stringify({ type: "re_vote" }));
    const reVoteMsg = await conn.nextMessage();
    expect(reVoteMsg.type).toBe("re_vote_started");

    // Estimate again with different value
    conn.ws.send(JSON.stringify({ type: "estimate", value: "13" }));
    await conn.nextMessage(); // estimate_received

    conn.ws.send(JSON.stringify({ type: "reveal" }));
    const revealed2 = await conn.nextMessage();
    expect(revealed2.type).toBe("revealed");
    expect((revealed2 as any).estimates[0].value).toBe("13");

    conn.close();
  });

  it("story flow: create → add_story → next_story → verify story_added and story_changed", async () => {
    const room = `flow-story-${uid()}`;
    const conn = await connect(room);

    conn.ws.send(JSON.stringify({ type: "create", displayName: "Alice" }));
    await conn.nextMessage(); // room_state

    // Add two stories
    conn.ws.send(
      JSON.stringify({ type: "add_story", title: "Login", description: "Implement login" })
    );
    const storyAdded1 = await conn.nextMessage();
    expect(storyAdded1.type).toBe("story_added");
    expect((storyAdded1 as any).story.title).toBe("Login");

    conn.ws.send(
      JSON.stringify({ type: "add_story", title: "Signup", description: "Implement signup" })
    );
    const storyAdded2 = await conn.nextMessage();
    expect(storyAdded2.type).toBe("story_added");
    expect((storyAdded2 as any).story.title).toBe("Signup");

    // Advance to first story - nextStory broadcasts story_changed for ALL stories
    conn.ws.send(JSON.stringify({ type: "next_story" }));
    const msgs1 = await conn.collectMessages(2);
    const changed1 = msgs1.map((m) => (m as any).story);
    expect(msgs1.every((m) => m.type === "story_changed")).toBe(true);
    // Login becomes active, Signup stays pending
    const login1 = changed1.find((s: any) => s.title === "Login");
    const signup1 = changed1.find((s: any) => s.title === "Signup");
    expect(login1.status).toBe("active");
    expect(signup1.status).toBe("pending");

    // Advance to second story - Login becomes done, Signup becomes active
    conn.ws.send(JSON.stringify({ type: "next_story" }));
    const msgs2 = await conn.collectMessages(2);
    const changed2 = msgs2.map((m) => (m as any).story);
    expect(msgs2.every((m) => m.type === "story_changed")).toBe(true);
    const login2 = changed2.find((s: any) => s.title === "Login");
    const signup2 = changed2.find((s: any) => s.title === "Signup");
    expect(login2.status).toBe("done");
    expect(signup2.status).toBe("active");

    conn.close();
  });
});
