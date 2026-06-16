import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import type { Story } from "../../src/shared/types";
import StorySpotlight from "../../src/client/components/StorySpotlight";

function makeStory(partial: Partial<Story> = {}): Story {
  return {
    id: 1,
    title: "Add OAuth login",
    description: "Short description",
    position: 1,
    status: "active",
    finalEstimate: null,
    unanimous: null,
    ...partial,
  };
}

describe("StorySpotlight", () => {
  it("shows the title, progress, and description", () => {
    render(<StorySpotlight story={makeStory()} position={3} total={18} />);
    expect(screen.getByText("Add OAuth login")).toBeInTheDocument();
    expect(screen.getByText("3 / 18")).toBeInTheDocument();
    expect(screen.getByText("Short description")).toBeInTheDocument();
  });

  it("shows the no-story state when story is null", () => {
    render(<StorySpotlight story={null} position={1} total={0} />);
    expect(screen.getByText(/no story/i)).toBeInTheDocument();
  });

  it("offers show more/less only for long descriptions", async () => {
    const user = userEvent.setup();
    const long = "x".repeat(200);
    render(<StorySpotlight story={makeStory({ description: long })} position={1} total={1} />);
    const toggle = screen.getByRole("button", { name: /show more/i });
    await user.click(toggle);
    expect(screen.getByRole("button", { name: /show less/i })).toBeInTheDocument();
  });

  it("does not offer a toggle for short descriptions", () => {
    render(<StorySpotlight story={makeStory()} position={1} total={1} />);
    expect(screen.queryByRole("button", { name: /show more/i })).toBeNull();
  });
});
