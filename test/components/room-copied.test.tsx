import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
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

describe("Room copied feedback", () => {
  const writeTextMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.useFakeTimers();
    useRoomStore.setState({ error: null, connected: false });
    localStorage.setItem("displayName", "TestUser");
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
    writeTextMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderRoom() {
    return render(
      <MemoryRouter initialEntries={["/room/test-room"]}>
        <Routes>
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("shows 'copied' text after clicking the room code", async () => {
    renderRoom();

    const codeButton = screen.getByText("test-room");
    fireEvent.click(codeButton);

    expect(writeTextMock).toHaveBeenCalledWith("test-room");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("copied")).toBeInTheDocument();
  });

  it("hides 'copied' text after 1.5 seconds", async () => {
    renderRoom();

    const codeButton = screen.getByText("test-room");
    fireEvent.click(codeButton);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("copied")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(screen.queryByText("copied")).not.toBeInTheDocument();
  });
});
