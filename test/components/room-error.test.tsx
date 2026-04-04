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

function renderRoom(error: string | null = null) {
  useRoomStore.setState({ error, connected: false });
  return render(
    <MemoryRouter initialEntries={["/room/test-room"]}>
      <Routes>
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="/" element={<div>landing</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Room error screen", () => {
  beforeEach(() => {
    useRoomStore.setState({ error: null, connected: false });
  });

  it("renders error screen when error is set", () => {
    renderRoom("Room not found");
    expect(screen.getByText("Room not found")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The room you tried to join does not exist or is no longer available.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a link back to home", () => {
    renderRoom("Room not found");
    const link = screen.getByRole("link", { name: "Back to Home" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders normal room UI when no error", () => {
    renderRoom(null);
    expect(screen.queryByText("Back to Home")).not.toBeInTheDocument();
    expect(screen.getByText("reconnecting...")).toBeInTheDocument();
  });
});
