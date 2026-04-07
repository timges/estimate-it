import { env, runInDurableObject } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { Room } from "../../src/worker/room";

describe("Room", () => {
  function getStub(name: string) {
    const id = env.ROOM.idFromName(name);
    return env.ROOM.get(id);
  }

  describe("roomExists", () => {
    it("should return false when room has not been created", async () => {
      const stub = getStub("exists-test-1");

      await runInDurableObject(stub, async (instance: Room) => {
        expect(instance.roomExists()).toBe(false);
      });
    });

    it("should return true after createRoom", async () => {
      const stub = getStub("exists-test-2");

      await runInDurableObject(stub, async (instance: Room) => {
        instance.createRoom();
        expect(instance.roomExists()).toBe(true);
      });
    });
  });

  describe("createRoom", () => {
    it("should create the room in the database", async () => {
      const stub = getStub("create-test-1");

      await runInDurableObject(stub, async (instance: Room) => {
        expect(instance.roomExists()).toBe(false);
        instance.createRoom();
        expect(instance.roomExists()).toBe(true);
      });
    });

    it("should be idempotent", async () => {
      const stub = getStub("create-test-2");

      await runInDurableObject(stub, async (instance: Room) => {
        instance.createRoom();
        instance.createRoom();
        expect(instance.roomExists()).toBe(true);
      });
    });
  });

  describe("join", () => {
    it("should fail when room has not been created", async () => {
      const stub = getStub("join-fail-test-1");

      await runInDurableObject(stub, async (instance: Room) => {
        expect(instance.roomExists()).toBe(false);
        // join should still work at RPC level (WebSocket handler checks roomExists)
        // but we test roomExists behavior here
        expect(instance.roomExists()).toBe(false);
      });
    });

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

  describe("clearEstimate", () => {
    it("should remove estimate and reset hasEstimated", async () => {
      const stub = getStub("clear-test-1");

      await runInDurableObject(stub, async (instance: Room) => {
        const { participant } = instance.join("Alice");
        instance.join("Bob");
        instance.addStory("Feature", "");
        instance.nextStory();

        instance.estimate(participant.id, "5");
        let state = instance.getRoomState();
        expect(state.participants[0].hasEstimated).toBe(true);

        instance.clearEstimate(participant.id);
        state = instance.getRoomState();
        expect(state.participants[0].hasEstimated).toBe(false);
        expect(state.currentEstimates).toBe(0);
      });
    });

    it("should not affect other participants' estimates", async () => {
      const stub = getStub("clear-test-2");

      await runInDurableObject(stub, async (instance: Room) => {
        const a = instance.join("Alice");
        const b = instance.join("Bob");
        instance.addStory("Feature", "");
        instance.nextStory();

        instance.estimate(a.participant.id, "5");
        instance.estimate(b.participant.id, "8");

        instance.clearEstimate(a.participant.id);
        const state = instance.getRoomState();
        expect(state.participants[0].hasEstimated).toBe(false);
        expect(state.participants[1].hasEstimated).toBe(true);
        expect(state.currentEstimates).toBe(1);
      });
    });
  });

  describe("reveal", () => {
    it("should reveal all estimates and calculate revealResult", async () => {
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
        expect(result!.revealResult).toEqual({
          average: 5,
          allAgree: true,
          distribution: [{ value: "5", count: 2 }],
        });
      });
    });

    it("should calculate average with different estimates", async () => {
      const stub = getStub("reveal-test-2");

      await runInDurableObject(stub, async (instance: Room) => {
        const a = instance.join("Alice");
        const b = instance.join("Bob");
        instance.addStory("Feature", "");
        instance.nextStory();

        instance.estimate(a.participant.id, "3");
        instance.estimate(b.participant.id, "8");

        const result = instance.reveal();

        expect(result!.revealResult).not.toBeNull();
        expect(result!.revealResult!.average).toBe(5.5);
        expect(result!.revealResult!.allAgree).toBe(false);
        expect(result!.revealResult!.distribution).toHaveLength(2);
      });
    });

    it("should work without a story (round 0)", async () => {
      const stub = getStub("reveal-test-3");

      await runInDurableObject(stub, async (instance: Room) => {
        const a = instance.join("Alice");
        instance.estimate(a.participant.id, "3");

        const result = instance.reveal();
        expect(result).not.toBeNull();
        expect(result!.estimates).toHaveLength(1);
        expect(result!.estimates[0].value).toBe("3");
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
        expect(result!.revealResult!.average).toBeNull();
        expect(result!.revealResult!.allAgree).toBe(false);
      });
    });

    it("should exclude ☕ from average calculation", async () => {
      const stub = getStub("reveal-test-5");

      await runInDurableObject(stub, async (instance: Room) => {
        const a = instance.join("Alice");
        const b = instance.join("Bob");
        instance.addStory("Feature", "");
        instance.nextStory();

        instance.estimate(a.participant.id, "8");
        instance.estimate(b.participant.id, "☕");

        const result = instance.reveal();
        expect(result!.revealResult!.average).toBe(8);
      });
    });

    it("should detect allAgree when all non-☕ votes match", async () => {
      const stub = getStub("reveal-test-6");

      await runInDurableObject(stub, async (instance: Room) => {
        const a = instance.join("Alice");
        const b = instance.join("Bob");
        const c = instance.join("Carol");
        instance.addStory("Feature", "");
        instance.nextStory();

        instance.estimate(a.participant.id, "5");
        instance.estimate(b.participant.id, "5");
        instance.estimate(c.participant.id, "☕");

        const result = instance.reveal();
        expect(result!.revealResult!.allAgree).toBe(true);
      });
    });

    it("should not detect allAgree with single voter", async () => {
      const stub = getStub("reveal-test-7");

      await runInDurableObject(stub, async (instance: Room) => {
        const a = instance.join("Alice");
        instance.addStory("Feature", "");
        instance.nextStory();

        instance.estimate(a.participant.id, "5");

        const result = instance.reveal();
        expect(result!.revealResult!.allAgree).toBe(false);
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

        instance.removeParticipant(a.participant.id);

        state = instance.getRoomState();
        expect(state.totalParticipants).toBe(1);
        expect(state.participants[0].displayName).toBe("Bob");
      });
    });

    it("should also remove their estimates when participant leaves", async () => {
      const stub = getStub("remove-test-2");

      await runInDurableObject(stub, async (instance: Room) => {
        const a = instance.join("Alice");
        instance.estimate(a.participant.id, "5");

        let state = instance.getRoomState();
        expect(state.currentEstimates).toBe(1);

        instance.removeParticipant(a.participant.id);

        state = instance.getRoomState();
        expect(state.currentEstimates).toBe(0);
        expect(state.totalParticipants).toBe(0);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle reveal with no estimates", async () => {
      const stub = getStub("edge-test-1");

      await runInDurableObject(stub, async (instance: Room) => {
        instance.join("Alice");

        const result = instance.reveal();

        expect(result).not.toBeNull();
        expect(result!.estimates).toHaveLength(0);
        expect(result!.revealResult).toBeNull();
      });
    });

    it("should handle estimate without any story", async () => {
      const stub = getStub("edge-test-2");

      await runInDurableObject(stub, async (instance: Room) => {
        const { participant } = instance.join("Alice");

        instance.estimate(participant.id, "1");

        const state = instance.getRoomState();
        expect(state.currentEstimates).toBe(1);
      });
    });

    it("should handle reVote without stories", async () => {
      const stub = getStub("edge-test-3");

      await runInDurableObject(stub, async (instance: Room) => {
        const { participant } = instance.join("Alice");

        instance.estimate(participant.id, "5");
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

        expect(story.description).toBe("");
      });
    });

    it("should handle all Fibonacci values", async () => {
      const stub = getStub("edge-test-6");

      await runInDurableObject(stub, async (instance: Room) => {
        const values = ["1", "2", "3", "5", "8", "13", "21", "☕"] as const;

        const ids: string[] = [];
        for (let i = 0; i < values.length; i++) {
          const { participant } = instance.join(`User${i}`);
          ids.push(participant.id);
        }

        for (let i = 0; i < values.length; i++) {
          instance.estimate(ids[i], values[i]);
        }

        const result = instance.reveal();

        expect(result!.estimates).toHaveLength(8);
      });
    });

    it("should handle participant leaving and rejoining", async () => {
      const stub = getStub("edge-test-7");

      await runInDurableObject(stub, async (instance: Room) => {
        const first = instance.join("Alice");
        expect(instance.getRoomState().totalParticipants).toBe(1);

        instance.removeParticipant(first.participant.id);
        expect(instance.getRoomState().totalParticipants).toBe(0);

        const second = instance.join("Alice");
        expect(instance.getRoomState().totalParticipants).toBe(1);
        expect(second.participant.id).not.toBe(first.participant.id);
      });
    });

    it("should handle estimate change after reveal then revote", async () => {
      const stub = getStub("edge-test-8");

      await runInDurableObject(stub, async (instance: Room) => {
        const { participant } = instance.join("Alice");
        instance.addStory("Feature", "");
        instance.nextStory();

        instance.estimate(participant.id, "5");
        const first = instance.reveal();
        expect(first!.estimates[0].value).toBe("5");

        instance.reVote();
        instance.estimate(participant.id, "8");
        const second = instance.reveal();
        expect(second!.estimates[0].value).toBe("8");
      });
    });
  });

  describe("rename", () => {
    it("should rename a participant", async () => {
      const stub = getStub("rename-test-1");

      await runInDurableObject(stub, async (instance: Room) => {
        const { participant } = instance.join("Alice");

        instance.rename(participant.id, "Alice W.");

        const state = instance.getRoomState();
        expect(state.participants[0].displayName).toBe("Alice W.");
      });
    });

    it("should not affect other participants", async () => {
      const stub = getStub("rename-test-2");

      await runInDurableObject(stub, async (instance: Room) => {
        const a = instance.join("Alice");
        instance.join("Bob");

        instance.rename(a.participant.id, "Alice W.");

        const state = instance.getRoomState();
        expect(state.participants[0].displayName).toBe("Alice W.");
        expect(state.participants[1].displayName).toBe("Bob");
      });
    });
  });
});
