import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import type { Story } from "../../src/shared/types";
import SessionSummary from "../../src/client/components/SessionSummary";

function story(partial: Partial<Story>): Story {
  return {
    id: 1,
    title: "Story",
    description: "",
    position: 1,
    status: "done",
    finalEstimate: null,
    unanimous: null,
    ...partial,
  };
}

describe("SessionSummary", () => {
  const stories = [
    story({ id: 1, title: "Add login", finalEstimate: "5", unanimous: true }),
    story({ id: 2, title: "Rate limiting", finalEstimate: "13", unanimous: false }),
  ];

  it("renders each story with its final estimate and the totals", () => {
    render(<SessionSummary stories={stories} />);
    expect(screen.getByText("Add login")).toBeInTheDocument();
    expect(screen.getByText("Rate limiting")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument(); // total points
    expect(screen.getByText("1")).toBeInTheDocument(); // unanimous count
  });

  it("copies a markdown summary to the clipboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });
    render(<SessionSummary stories={stories} />);
    await user.click(screen.getByRole("button", { name: /copy summary/i }));
    expect(writeText).toHaveBeenCalledWith(
      "- Add login — 5\n- Rate limiting — 13\nTotal: 18 points across 2 stories"
    );
  });
});
