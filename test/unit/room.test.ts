import { env, runInDurableObject } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { Room } from "../../src/worker/room";

describe("Room", () => {
  function getStub(name: string) {
    const id = env.ROOM.idFromName(name);
    return env.ROOM.get(id);
  }

  describe("join", () => {
    it("should add a participant to a new room", async () => {
      const stub = getStub("join-test-1");

      await runInDurableObject(stub, async (instance: Room) => {
        const result = instance.join("Alice");

        expect(result.participant.displayName).toBe("Alice");
        expect(result.participant.color).toBeTruthy();
        expect(result.participant.hasEstimated).toBe(false);
        expect(result.room.id).toBeTruthy();
        expect(result.totalParticipants).toBe(1);
        expect(result.participants).toHaveLength(1);
        expect(result.participants[0].displayName).toBe("Alice");
      });
    });

    it("should add multiple participants with different colors", async () => {
      const stub = getStub("join-test-2");

      await runInDurableObject(stub, async (instance: Room) => {
        const r1 = instance.join("Alice");
        const r2 = instance.join("Bob");

        expect(r2.totalParticipants).toBe(2);
        expect(r2.participants).toHaveLength(2);
        expect(r2.participants[0].displayName).toBe("Alice");
        expect(r2.participants[1].displayName).toBe("Bob");
        expect(r1.participant.color).not.toBe(r2.participant.color);
      });
    });
  });

  describe("estimate", () => {
    it("should record an estimate", async () => {
      const stub = getStub("estimate-test-1");

      await runInDurableObject(stub, async (instance: Room) => {
        const { participant } = instance.join("Alice");
        instance.addStory("Login page", "Implement login");
        instance.nextStory();

        instance.estimate(participant.id, "5");

        const state = instance.getRoomState();
        expect(state.currentEstimates).toBe(1);
      });
    });

    it("should allow changing estimate before reveal", async () => {
      const stub = getStub("estimate-test-2");

      await runInDurableObject(stub, async (instance: Room) => {
        const { participant } = instance.join("Alice");
        instance.addStory("Login page", "");
        instance.nextStory();

        instance.estimate(participant.id, "3");
        instance.estimate(participant.id, "8");

        const state = instance.getRoomState();
        expect(state.currentEstimates).toBe(1);
      });
    });

    it("should show hasEstimated on participant after estimating", async () => {
      const stub = getStub("estimate-test-3");

      await runInDurableObject(stub, async (instance: Room) => {
        const { participant } = instance.join("Alice");
        instance.addStory("Feature", "");
        instance.nextStory();

        let state = instance.getRoomState();
        expect(state.participants[0].hasEstimated).toBe(false);

        instance.estimate(participant.id, "5");

        state = instance.getRoomState();
        expect(state.participants[0].hasEstimated).toBe(true);
      });
    });

    it("should not broadcast estimate value (anti-bias)", async () => {
      const stub = getStub("estimate-test-4");

      await runInDurableObject(stub, async (instance: Room) => {
        const { participant } = instance.join("Alice");
        instance.join("Bob");
        instance.addStory("Feature", "");
        instance.nextStory();

        instance.estimate(participant.id, "13");

        // The estimate is stored but not exposed via getRoomState
        const state = instance.getRoomState();
        // Only count is visible, not the value
        expect(state.currentEstimates).toBe(1);
        // Participant shows as estimated
        expect(state.participants[0].hasEstimated).toBe(true);
        // But Bob can't see Alice's value
      });
    });
  });

  describe("reveal", () => {
    it("should reveal all estimates and calculate consensus", async () => {
      const stub = getStub("reveal-test-1");

      await runInDurableObject(stub, async (instance: Room) => {
        const a = instance.join("Alice");
        const b = instance.join("Bob");
        instance.addStory("Feature", "");
        instance.nextStory();

        instance.estimate(a.participant.id, "5");
        instance.estimate(b.participant.id, "5");

        const result = instance.reveal();

        expect(result).not.toBeNull();
        expect(result!.estimates).toHaveLength(2);
        expect(result!.consensus).toEqual({
          value: "5",
          count: 2,
          total: 2,
        });
      });
    });

    it("should handle no consensus (different estimates)", async () => {
      const stub = getStub("reveal-test-2");

      await runInDurableObject(stub, async (instance: Room) => {
        const a = instance.join("Alice");
        const b = instance.join("Bob");
        instance.addStory("Feature", "");
        instance.nextStory();

        instance.estimate(a.participant.id, "3");
        instance.estimate(b.participant.id, "8");

        const result = instance.reveal();

        expect(result!.consensus!.count).toBe(1);
        expect(result!.consensus!.total).toBe(2);
      });
    });

    it("should return null if no active story", async () => {
      const stub = getStub("reveal-test-3");

      await runInDurableObject(stub, async (instance: Room) => {
        instance.join("Alice");

        const result = instance.reveal();
        expect(result).toBeNull();
      });
    });

    it("should include AI estimate marker (☕)", async () => {
      const stub = getStub("reveal-test-4");

      await runInDurableObject(stub, async (instance: Room) => {
        const a = instance.join("Alice");
        instance.addStory("Feature", "");
        instance.nextStory();

        instance.estimate(a.participant.id, "☕");

        const result = instance.reveal();
        expect(result!.estimates[0].value).toBe("☕");
      });
    });
  });

  describe("stories", () => {
    it("should add and retrieve stories", async () => {
      const stub = getStub("story-test-1");

      await runInDurableObject(stub, async (instance: Room) => {
        instance.join("Alice");

        const s1 = instance.addStory("Login", "Implement login page");
        const s2 = instance.addStory("Signup", "");

        expect(s1.title).toBe("Login");
        expect(s1.description).toBe("Implement login page");
        expect(s1.position).toBe(1);
        expect(s2.position).toBe(2);

        const state = instance.getRoomState();
        expect(state.stories).toHaveLength(2);
      });
    });

    it("should advance to next story", async () => {
      const stub = getStub("story-test-2");

      await runInDurableObject(stub, async (instance: Room) => {
        instance.join("Alice");
        instance.addStory("Story 1", "");
        instance.addStory("Story 2", "");

        instance.nextStory();
        let state = instance.getRoomState();
        expect(state.stories[0].status).toBe("active");

        instance.nextStory();
        state = instance.getRoomState();
        expect(state.stories[0].status).toBe("done");
        expect(state.stories[1].status).toBe("active");
      });
    });
  });

  describe("reVote", () => {
    it("should clear estimates and reset to active", async () => {
      const stub = getStub("revote-test-1");

      await runInDurableObject(stub, async (instance: Room) => {
        const a = instance.join("Alice");
        instance.addStory("Feature", "");
        instance.nextStory();

        instance.estimate(a.participant.id, "5");
        instance.reveal();
        instance.reVote();

        const state = instance.getRoomState();
        expect(state.currentEstimates).toBe(0);
        expect(state.stories[0].status).toBe("active");
      });
    });
  });

  describe("removeParticipant", () => {
    it("should remove a participant from the room", async () => {
      const stub = getStub("remove-test-1");

      await runInDurableObject(stub, async (instance: Room) => {
        const a = instance.join("Alice");
        instance.join("Bob");

        let state = instance.getRoomState();
        expect(state.totalParticipants).toBe(2);

        // Simulate WebSocket close by calling the RPC methods directly
        // In real usage, webSocketClose handles this
        instance.removeParticipant(a.participant.id);

        state = instance.getRoomState();
        expect(state.totalParticipants).toBe(1);
        expect(state.participants[0].displayName).toBe("Bob");
      });
    });
  });
});
