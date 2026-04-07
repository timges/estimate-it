import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useRoomStore } from "../../src/client/store/room";

vi.mock("../../src/client/lib/ws", () => ({
  RoomSocket: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
  })),
}));

import Room from "../../src/client/pages/Room";

describe("button a11y", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useRoomStore.setState({
      connected: true,
      room: { id: "test-room", name: "Test", createdAt: 0 },
      participants: [],
      myParticipantId: "p1",
      stories: [],
      revealed: false,
      estimates: [],
      revealResult: null,
      myEstimate: null,
      error: null,
    });
    localStorage.setItem("displayName", "TestUser");
  });

  it("copy room code button has aria-label", () => {
    render(
      <MemoryRouter initialEntries={["/room/test-room"]}>
        <Routes>
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
      </MemoryRouter>,
    );

    const copyBtn = screen.getByRole("button", { name: /copy room code/i });
    expect(copyBtn).toBeInTheDocument();
  });
});
