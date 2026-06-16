import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StoryList from "../../src/client/components/StoryList";
import type { Story } from "../../src/shared/types";

const makeStory = (overrides: Partial<Story> = {}): Story => ({
  id: 1,
  title: "Story 1",
  description: "",
  position: 1,
  status: "pending",
  finalEstimate: null,
  unanimous: null,
  ...overrides,
});

describe("StoryList", () => {
  it("renders nothing when stories is empty", () => {
    const { container } = render(
      <StoryList stories={[]} onEditStory={() => {}} onDeleteStory={() => {}} />
    );
    expect(container.querySelector("[class*='list']")).toBeNull();
  });

  it("shows pending stories", () => {
    const stories = [makeStory({ id: 1, title: "Login", status: "pending" })];
    render(
      <StoryList
        stories={stories}
        onEditStory={() => {}}
        onDeleteStory={() => {}}
      />
    );
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("shows active story with active badge", () => {
    const stories = [makeStory({ id: 1, title: "Signup", status: "active" })];
    render(
      <StoryList
        stories={stories}
        onEditStory={() => {}}
        onDeleteStory={() => {}}
      />
    );
    expect(screen.getByText("Signup")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows done stories", () => {
    const stories = [
      makeStory({ id: 1, title: "Login", status: "done" }),
      makeStory({ id: 2, title: "Signup", status: "active" }),
    ];
    render(
      <StoryList
        stories={stories}
        onEditStory={() => {}}
        onDeleteStory={() => {}}
      />
    );
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Signup")).toBeInTheDocument();
  });

  it("groups stories by status", () => {
    const stories = [
      makeStory({ id: 1, title: "Done Story", status: "done", position: 1 }),
      makeStory({ id: 2, title: "Active Story", status: "active", position: 2 }),
      makeStory({ id: 3, title: "Pending Story", status: "pending", position: 3 }),
    ];
    render(
      <StoryList
        stories={stories}
        onEditStory={() => {}}
        onDeleteStory={() => {}}
      />
    );
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });
});

describe("StoryList edit and delete", () => {
  const stories = [
    {
      id: 1,
      title: "Add login",
      description: "",
      position: 1,
      status: "pending" as const,
      finalEstimate: null,
      unanimous: null,
    },
  ];

  it("calls onDeleteStory after confirming via modal", async () => {
    const user = userEvent.setup();
    const onDeleteStory = vi.fn();
    render(
      <StoryList
        stories={stories}
        onEditStory={vi.fn()}
        onDeleteStory={onDeleteStory}
      />
    );
    await user.click(screen.getByRole("button", { name: /delete add login/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(onDeleteStory).toHaveBeenCalledWith(1);
  });

  it("calls onEditStory with edited values via modal", async () => {
    const user = userEvent.setup();
    const onEditStory = vi.fn();
    render(
      <StoryList
        stories={stories}
        onEditStory={onEditStory}
        onDeleteStory={vi.fn()}
      />
    );
    await user.click(screen.getByRole("button", { name: /edit add login/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const input = screen.getByDisplayValue("Add login");
    await user.clear(input);
    await user.type(input, "Add SSO login");
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(onEditStory).toHaveBeenCalledWith(1, "Add SSO login", "");
  });
});
