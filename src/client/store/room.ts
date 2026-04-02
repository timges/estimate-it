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
  connected: boolean;
  setConnected: (connected: boolean) => void;

  room: Room | null;
  participants: Participant[];
  stories: Story[];
  currentEstimates: number;
  totalParticipants: number;

  revealed: boolean;
  estimates: Estimate[];
  consensus: Consensus | null;

  myEstimate: FibonacciValue | null;
  setMyEstimate: (value: FibonacciValue | null) => void;

  handleMessage: (msg: ServerMessage) => void;
  resetForReVote: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),

  room: null,
  participants: [],
  stories: [],
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
            (p) => p.id !== msg.participantId
          ),
          totalParticipants: s.totalParticipants - 1,
        }));
        break;

      case "estimate_received":
        set((s) => {
          const participants = s.participants.map((p) =>
            p.id === msg.participantId ? { ...p, hasEstimated: true } : p
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
            st.id === msg.story.id ? msg.story : st
          ),
        }));
        break;

      case "re_vote_started":
        set((s) => ({
          ...s,
          revealed: false,
          estimates: [],
          consensus: null,
          myEstimate: null,
          currentEstimates: 0,
          participants: s.participants.map((p) => ({
            ...p,
            hasEstimated: false,
          })),
        }));
        break;

      case "error":
        console.error("Room error:", msg.message);
        break;
    }
  },
}));
