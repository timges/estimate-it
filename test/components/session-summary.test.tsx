import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
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

function renderSummary(
  stories: Story[],
  overrides: {
    onNewSession?: () => void;
    onSelectStory?: (id: number) => void;
  } = {},
) {
  const onNewSession = overrides.onNewSession ?? vi.fn();
  const onSelectStory = overrides.onSelectStory ?? vi.fn();
  render(
    <BrowserRouter>
      <SessionSummary
        stories={stories}
        onNewSession={onNewSession}
        onSelectStory={onSelectStory}
      />
    </BrowserRouter>,
  );
  return { onNewSession, onSelectStory };
}

describe("SessionSummary", () => {
  const stories = [
    story({ id: 1, title: "Add login", finalEstimate: "5", unanimous: true }),
    story({ id: 2, title: "Rate limiting", finalEstimate: "13", unanimous: false }),
  ];

  it("renders each story with its final estimate and the totals", () => {
    renderSummary(stories);
    expect(screen.getByText("Add login")).toBeInTheDocument();
    expect(screen.getByText("Rate limiting")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument(); // total points
    expect(screen.getByText("1")).toBeInTheDocument(); // unanimous count
  });

  it("calls onSelectStory with the story id when a row is clicked", async () => {
    const user = userEvent.setup();
    const { onSelectStory } = renderSummary(stories);

    await user.click(screen.getByRole("button", { name: /Add login/i }));

    expect(onSelectStory).toHaveBeenCalledOnce();
    expect(onSelectStory).toHaveBeenCalledWith(1);
  });

  it("opens the confirmation modal when New Session is clicked", async () => {
    const user = userEvent.setup();
    renderSummary(stories);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New Session" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/All stories and votes will be cleared/i)).toBeInTheDocument();
  });

  it("calls onNewSession once when the modal confirm button is clicked", async () => {
    const user = userEvent.setup();
    const { onNewSession } = renderSummary(stories);

    await user.click(screen.getByRole("button", { name: "New Session" }));
    const dialog = screen.getByRole("dialog");
    const confirmBtn = dialog.querySelector("button:last-child") as HTMLElement;
    await user.click(confirmBtn);

    expect(onNewSession).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the modal without calling onNewSession when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const { onNewSession } = renderSummary(stories);

    await user.click(screen.getByRole("button", { name: "New Session" }));
    await user.click(screen.getByRole("button", { name: /Cancel/i }));

    expect(onNewSession).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a Home link", () => {
    renderSummary(stories);
    expect(screen.getByRole("link", { name: /Home/i })).toBeInTheDocument();
  });
});
