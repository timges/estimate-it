import { describe, it, expect, beforeEach } from "vitest";
import { useRoomStore } from "../../src/client/store/room";
import type {
  Room,
  Participant,
  Story,
  Estimate,
  RevealResult,
  ServerMessage,
} from "../../src/shared/types";

const defaultRoom: Room = { id: "room-1", name: "Test Room", createdAt: 0 };

const makeParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: "p-1",
  displayName: "Alice",
  color: "#ff0000",
  hasEstimated: false,
  ...overrides,
});

const makeStory = (overrides: Partial<Story> = {}): Story => ({
  id: 1,
  title: "Story 1",
  description: "desc",
  position: 1,
  status: "pending",
  ...overrides,
});

const makeRevealResult = (overrides: Partial<RevealResult> = {}): RevealResult => ({
  average: 5,
  distribution: [{ value: "5", count: 1 }],
  allAgree: false,
  ...overrides,
});

function getState() {
  return useRoomStore.getState();
}

  beforeEach(() => {
  useRoomStore.setState({
    connected: false,
    room: null,
    participants: [],
    myParticipantId: null,
    stories: [],
    currentEstimates: 0,
    totalParticipants: 0,
    revealed: false,
    estimates: [],
    revealResult: null,
    myEstimate: null,
    error: null,
  });
});

describe("useRoomStore", () => {
  describe("setConnected", () => {
    it("sets connected to true", () => {
      getState().setConnected(true);
      expect(getState().connected).toBe(true);
    });

    it("sets connected to false", () => {
      getState().setConnected(true);
      getState().setConnected(false);
      expect(getState().connected).toBe(false);
    });
  });

  describe("setMyEstimate", () => {
    it("sets myEstimate", () => {
      getState().setMyEstimate("5");
      expect(getState().myEstimate).toBe("5");
    });

    it("clears myEstimate with null", () => {
      getState().setMyEstimate("8");
      getState().setMyEstimate(null);
      expect(getState().myEstimate).toBeNull();
    });
  });

  describe("resetForReVote", () => {
    it("resets reveal state and estimates", () => {
      useRoomStore.setState({
        revealed: true,
        estimates: [{ participantId: "p-1", value: "5" }],
        revealResult: makeRevealResult(),
        myEstimate: "5",
        currentEstimates: 1,
      });

      getState().resetForReVote();

      const s = getState();
      expect(s.revealed).toBe(false);
      expect(s.estimates).toEqual([]);
      expect(s.revealResult).toBeNull();
      expect(s.myEstimate).toBeNull();
      expect(s.currentEstimates).toBe(0);
    });

    it("does not touch participants or stories", () => {
      const participants = [makeParticipant()];
      const stories = [makeStory()];
      useRoomStore.setState({ participants, stories });

      getState().resetForReVote();

      expect(getState().participants).toEqual(participants);
      expect(getState().stories).toEqual(stories);
    });
  });

  describe("handleMessage", () => {
    it("room_state sets full state", () => {
      const participants = [makeParticipant()];
      const stories = [makeStory()];

      getState().handleMessage({
        type: "room_state",
        room: defaultRoom,
        participants,
        stories,
        currentEstimates: 3,
        totalParticipants: 5,
        myParticipantId: "p-1",
      });

      const s = getState();
      expect(s.room).toEqual(defaultRoom);
      expect(s.participants).toEqual(participants);
      expect(s.stories).toEqual(stories);
      expect(s.currentEstimates).toBe(3);
      expect(s.totalParticipants).toBe(5);
    });

    it("participant_joined appends participant and increments total", () => {
      const p1 = makeParticipant({ id: "p-1" });
      useRoomStore.setState({ participants: [p1], totalParticipants: 1 });

      const p2 = makeParticipant({ id: "p-2", displayName: "Bob" });
      getState().handleMessage({ type: "participant_joined", participant: p2 });

      const s = getState();
      expect(s.participants).toHaveLength(2);
      expect(s.participants[1]).toEqual(p2);
      expect(s.totalParticipants).toBe(2);
    });

    it("participant_left filters out participant and decrements total", () => {
      const p1 = makeParticipant({ id: "p-1" });
      const p2 = makeParticipant({ id: "p-2", displayName: "Bob" });
      useRoomStore.setState({ participants: [p1, p2], totalParticipants: 2 });

      getState().handleMessage({ type: "participant_left", participantId: "p-1" });

      const s = getState();
      expect(s.participants).toHaveLength(1);
      expect(s.participants[0].id).toBe("p-2");
      expect(s.totalParticipants).toBe(1);
    });

    it("estimate_received marks participant and increments count", () => {
      const p1 = makeParticipant({ id: "p-1", hasEstimated: false });
      const p2 = makeParticipant({ id: "p-2", displayName: "Bob", hasEstimated: false });
      useRoomStore.setState({ participants: [p1, p2], currentEstimates: 0 });

      getState().handleMessage({ type: "estimate_received", participantId: "p-1" });

      const s = getState();
      expect(s.participants[0].hasEstimated).toBe(true);
      expect(s.participants[1].hasEstimated).toBe(false);
      expect(s.currentEstimates).toBe(1);
    });

    it("revealed sets revealed and estimates/revealResult", () => {
      const estimates: Estimate[] = [
        { participantId: "p-1", value: "5" },
        { participantId: "p-2", value: "5" },
      ];
      const revealResult = makeRevealResult();

      getState().handleMessage({
        type: "revealed",
        estimates,
        revealResult,
      });

      const s = getState();
      expect(s.revealed).toBe(true);
      expect(s.estimates).toEqual(estimates);
      expect(s.revealResult).toEqual(revealResult);
    });

    it("revealed handles null revealResult", () => {
      getState().handleMessage({
        type: "revealed",
        estimates: [],
        revealResult: null,
      });

      expect(getState().revealResult).toBeNull();
    });

    it("story_added appends a story", () => {
      const existing = makeStory({ id: 1 });
      useRoomStore.setState({ stories: [existing] });

      const newStory = makeStory({ id: 2, title: "Story 2" });
      getState().handleMessage({ type: "story_added", story: newStory });

      expect(getState().stories).toHaveLength(2);
      expect(getState().stories[1]).toEqual(newStory);
    });

    it("story_changed updates the matching story", () => {
      const s1 = makeStory({ id: 1, title: "Original" });
      const s2 = makeStory({ id: 2, title: "Other" });
      useRoomStore.setState({ stories: [s1, s2] });

      const updated = { ...s1, title: "Updated" };
      getState().handleMessage({ type: "story_changed", story: updated });

      const stories = getState().stories;
      expect(stories[0].title).toBe("Updated");
      expect(stories[1].title).toBe("Other");
    });

    it("story_changed resets revealed state and estimates", () => {
      useRoomStore.setState({
        revealed: true,
        estimates: [{ participantId: "p-1", value: "5" }],
        revealResult: makeRevealResult(),
        myEstimate: "5",
        currentEstimates: 1,
        participants: [
          makeParticipant({ id: "p-1", hasEstimated: true }),
          makeParticipant({ id: "p-2", displayName: "Bob", hasEstimated: true }),
        ],
        stories: [makeStory({ id: 1, status: "active" })],
      });

      const updated = makeStory({ id: 1, status: "done" });
      getState().handleMessage({ type: "story_changed", story: updated });

      const s = getState();
      expect(s.revealed).toBe(false);
      expect(s.estimates).toEqual([]);
      expect(s.revealResult).toBeNull();
      expect(s.myEstimate).toBeNull();
      expect(s.currentEstimates).toBe(0);
      expect(s.participants.every((p) => p.hasEstimated === false)).toBe(true);
    });

    it("re_vote_started resets reveal/estimates/revealResult/myEstimate/currentEstimates", () => {
      useRoomStore.setState({
        revealed: true,
        estimates: [{ participantId: "p-1", value: "3" }],
        revealResult: makeRevealResult(),
        myEstimate: "3",
        currentEstimates: 1,
        participants: [
          makeParticipant({ id: "p-1", hasEstimated: true }),
          makeParticipant({ id: "p-2", displayName: "Bob", hasEstimated: true }),
        ],
      });

      getState().handleMessage({ type: "re_vote_started" });

      const s = getState();
      expect(s.revealed).toBe(false);
      expect(s.estimates).toEqual([]);
      expect(s.revealResult).toBeNull();
      expect(s.myEstimate).toBeNull();
      expect(s.currentEstimates).toBe(0);
      expect(s.participants.every((p) => p.hasEstimated === false)).toBe(true);
    });

    it("participant_renamed updates participant displayName", () => {
      useRoomStore.setState({
        participants: [
          makeParticipant({ id: "p-1", displayName: "Alice" }),
          makeParticipant({ id: "p-2", displayName: "Bob" }),
        ],
      });

      getState().handleMessage({
        type: "participant_renamed",
        participantId: "p-1",
        displayName: "Alice W.",
      });

      const s = getState();
      expect(s.participants[0].displayName).toBe("Alice W.");
      expect(s.participants[1].displayName).toBe("Bob");
    });

    it("error sets error state", () => {
      getState().handleMessage({ type: "error", message: "Room not found" });

      expect(getState().error).toBe("Room not found");
    });

    it("error can be cleared with setError", () => {
      getState().handleMessage({ type: "error", message: "Something broke" });
      getState().setError(null);

      expect(getState().error).toBeNull();
    });
  });

  describe("setError", () => {
    it("sets error to a string", () => {
      getState().setError("Some error");
      expect(getState().error).toBe("Some error");
    });

    it("clears error with null", () => {
      getState().setError("Some error");
      getState().setError(null);
      expect(getState().error).toBeNull();
    });
  });
});
