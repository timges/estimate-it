import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, act } from "@testing-library/react";
import RevealBoard from "../../src/client/components/RevealBoard";
import type {
  Estimate,
  Participant,
  RevealResult,
} from "../../src/shared/types";

const confettiMock = vi.fn();
vi.mock("canvas-confetti", () => ({
  default: (...args: unknown[]) => confettiMock(...args),
}));

// framer-motion caches reduced-motion in a module-level singleton, so swapping
// matchMedia between tests doesn't propagate. Mock the hook directly instead.
let reducedMotion = false;
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: () => reducedMotion };
});

const participants: Participant[] = [
  { id: "a", displayName: "Alice", color: "#f00", hasEstimated: true },
  { id: "b", displayName: "Bob", color: "#0f0", hasEstimated: true },
];

const noop = () => {};

function renderBoard(estimates: Estimate[], revealResult: RevealResult) {
  return render(
    <RevealBoard
      estimates={estimates}
      revealResult={revealResult}
      participants={participants}
      onReVote={noop}
      onNextStory={noop}
      hasNextStory={false}
      hasActiveStory={false}
      finalEstimate={null}
      onSetFinalEstimate={() => {}}
    />,
  );
}

function setReducedMotion(reduced: boolean) {
  reducedMotion = reduced;
}

describe("RevealBoard consensus celebration", () => {
  beforeEach(() => {
    confettiMock.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("shows the agreed value as a hero with 'All Agree!' on consensus", () => {
    setReducedMotion(false);
    renderBoard(
      [
        { participantId: "a", value: "5" },
        { participantId: "b", value: "5" },
      ],
      { allAgree: true, distribution: [{ value: "5", count: 2 }] },
    );

    expect(screen.getByText("All Agree!")).toBeInTheDocument();
    // The agreed value (hero) plus the two per-participant cards = three "5"s.
    expect(screen.getAllByText("5")).toHaveLength(3);
  });

  it("fires a confetti burst once consensus settles when motion is allowed", () => {
    setReducedMotion(false);
    renderBoard(
      [
        { participantId: "a", value: "8" },
        { participantId: "b", value: "8" },
      ],
      { allAgree: true, distribution: [{ value: "8", count: 2 }] },
    );

    expect(confettiMock).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(confettiMock).toHaveBeenCalledTimes(1);
    const opts = confettiMock.mock.calls[0][0];
    expect(opts.disableForReducedMotion).toBe(true);
    expect(opts.colors).toEqual(["#3b82f6", "#8b5cf6", "#4ade80"]);
  });

  it("does not fire confetti under prefers-reduced-motion", () => {
    setReducedMotion(true);
    renderBoard(
      [
        { participantId: "a", value: "3" },
        { participantId: "b", value: "3" },
      ],
      { allAgree: true, distribution: [{ value: "3", count: 2 }] },
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(confettiMock).not.toHaveBeenCalled();
  });

  it("does not celebrate when votes disagree", () => {
    setReducedMotion(false);
    renderBoard(
      [
        { participantId: "a", value: "3" },
        { participantId: "b", value: "8" },
      ],
      {
        allAgree: false,
        distribution: [
          { value: "3", count: 1 },
          { value: "8", count: 1 },
        ],
      },
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText("All Agree!")).not.toBeInTheDocument();
    expect(confettiMock).not.toHaveBeenCalled();
  });
});

describe("RevealBoard final estimate", () => {
  const participants = [
    { id: "p1", displayName: "A", color: "#fff", hasEstimated: true },
    { id: "p2", displayName: "B", color: "#fff", hasEstimated: true },
  ];

  it("preselects the suggested value and reports changes", async () => {
    const user = userEvent.setup();
    const onSetFinalEstimate = vi.fn();
    render(
      <RevealBoard
        estimates={[
          { participantId: "p1", value: "5" },
          { participantId: "p2", value: "8" },
        ]}
        revealResult={{ distribution: [], allAgree: false }}
        participants={participants}
        onReVote={vi.fn()}
        onNextStory={vi.fn()}
        hasNextStory={false}
        hasActiveStory={true}
        finalEstimate={null}
        onSetFinalEstimate={onSetFinalEstimate}
      />
    );
    // Suggestion for [5,8] ties → higher card 8 is preselected.
    expect(
      screen.getByRole("button", { name: /final estimate 8/i })
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /final estimate 5/i }));
    expect(onSetFinalEstimate).toHaveBeenCalledWith("5");
  });

  it("hides the picker when there is no active story", () => {
    render(
      <RevealBoard
        estimates={[{ participantId: "p1", value: "5" }]}
        revealResult={{ distribution: [], allAgree: false }}
        participants={participants}
        onReVote={vi.fn()}
        onNextStory={vi.fn()}
        hasNextStory={false}
        hasActiveStory={false}
        finalEstimate={null}
        onSetFinalEstimate={vi.fn()}
      />
    );
    expect(screen.queryByText(/final estimate/i)).toBeNull();
  });
});
