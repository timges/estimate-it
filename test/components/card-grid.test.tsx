import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CardGrid from "../../src/client/components/CardGrid";

const FIBONACCI_VALUES = ["1", "2", "3", "5", "8", "13", "21", "☕"] as const;

describe("CardGrid", () => {
  it("renders all 8 Fibonacci buttons", () => {
    render(
      <CardGrid selected={null} onSelect={() => {}} disabled={false} />,
    );
    for (const value of FIBONACCI_VALUES) {
      expect(screen.getByText(value)).toBeInTheDocument();
    }
  });

  it("calls onSelect when a button is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CardGrid selected={null} onSelect={onSelect} disabled={false} />,
    );
    await user.click(screen.getByText("8"));
    expect(onSelect).toHaveBeenCalledWith("8");
  });

  it("does not call onSelect when disabled", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CardGrid selected={null} onSelect={onSelect} disabled={true} />,
    );
    await user.click(screen.getByText("5"));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
