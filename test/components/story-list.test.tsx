import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StoryList from "../../src/client/components/StoryList";
import type { Story } from "../../src/shared/types";

const makeStory = (overrides: Partial<Story> = {}): Story => ({
  id: 1,
  title: "Story 1",
  description: "",
  position: 1,
  status: "pending",
  ...overrides,
});

describe("StoryList", () => {
  it("renders nothing when stories is empty", () => {
    const { container } = render(<StoryList stories={[]} />);
    expect(container.querySelector("[class*='list']")).toBeNull();
  });

  it("shows pending stories", () => {
    const stories = [makeStory({ id: 1, title: "Login", status: "pending" })];
    render(<StoryList stories={stories} />);
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("shows active story with active badge", () => {
    const stories = [makeStory({ id: 1, title: "Signup", status: "active" })];
    render(<StoryList stories={stories} />);
    expect(screen.getByText("Signup")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows done stories", () => {
    const stories = [
      makeStory({ id: 1, title: "Login", status: "done" }),
      makeStory({ id: 2, title: "Signup", status: "active" }),
    ];
    render(<StoryList stories={stories} />);
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Signup")).toBeInTheDocument();
  });

  it("groups stories by status", () => {
    const stories = [
      makeStory({ id: 1, title: "Done Story", status: "done", position: 1 }),
      makeStory({ id: 2, title: "Active Story", status: "active", position: 2 }),
      makeStory({ id: 3, title: "Pending Story", status: "pending", position: 3 }),
    ];
    render(<StoryList stories={stories} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });
});
