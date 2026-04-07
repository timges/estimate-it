import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NamePrompt from "../../src/client/components/NamePrompt";

describe("NamePrompt", () => {
  it("renders with room code", () => {
    render(<NamePrompt roomId="coral-falcon" onSubmit={() => {}} />);
    expect(screen.getByText("coral-falcon")).toBeInTheDocument();
  });

  it("Join button is disabled when input is empty", () => {
    render(<NamePrompt roomId="test-room" onSubmit={() => {}} />);
    const button = screen.getByRole("button", { name: /join/i });
    expect(button).toBeDisabled();
  });

  it("calls onSubmit with name when Join clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NamePrompt roomId="test-room" onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText("Your display name…");
    await user.type(input, "Alice");
    await user.click(screen.getByRole("button", { name: /join/i }));
    expect(onSubmit).toHaveBeenCalledWith("Alice");
  });

  it("calls onSubmit when Enter is pressed in the input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NamePrompt roomId="test-room" onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText("Your display name…");
    await user.type(input, "Bob{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("Bob");
  });

  it("Join button is disabled when input contains only whitespace", async () => {
    const user = userEvent.setup();
    render(<NamePrompt roomId="test-room" onSubmit={() => {}} />);
    const input = screen.getByPlaceholderText("Your display name…");
    await user.type(input, "   ");
    const button = screen.getByRole("button", { name: /join/i });
    expect(button).toBeDisabled();
  });

  it("focuses the input on mount", () => {
    render(<NamePrompt roomId="test-room" onSubmit={() => {}} />);
    const input = screen.getByPlaceholderText("Your display name…");
    expect(input).toHaveFocus();
  });
});
