import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
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
});
