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

export interface RevealResult {
  distribution: { value: FibonacciValue; count: number }[];
  allAgree: boolean;
}

// WebSocket messages: Client → Server
export type ClientMessage =
  | { type: "create"; displayName: string }
  | { type: "join"; displayName: string }
  | { type: "estimate"; value: FibonacciValue }
  | { type: "clear_estimate" }
  | { type: "reveal" }
  | { type: "next_story" }
  | { type: "re_vote" }
  | { type: "rename"; displayName: string }
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
      myParticipantId: string;
    }
  | { type: "participant_joined"; participant: Participant }
  | { type: "participant_left"; participantId: string }
  | { type: "estimate_received"; participantId: string }
  | { type: "estimate_cleared"; participantId: string }
  | {
      type: "revealed";
      estimates: Estimate[];
      revealResult: RevealResult | null;
    }
  | { type: "story_added"; story: Story }
  | { type: "story_changed"; story: Story }
  | { type: "re_vote_started" }
  | { type: "participant_renamed"; participantId: string; displayName: string }
  | { type: "error"; message: string };
