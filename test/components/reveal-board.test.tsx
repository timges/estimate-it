import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen, act } from "@testing-library/react";
import RevealBoard from "../../src/client/components/RevealBoard";
import type {
  Estimate,
  FibonacciValue,
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

  it("shows the picker even when the vote is unanimous (team can override consensus)", () => {
    render(
      <RevealBoard
        estimates={[
          { participantId: "p1", value: "5" },
          { participantId: "p2", value: "5" },
        ]}
        revealResult={{
          distribution: [{ value: "5", count: 2 }],
          allAgree: true,
        }}
        participants={participants}
        onReVote={vi.fn()}
        onNextStory={vi.fn()}
        hasNextStory={false}
        hasActiveStory={true}
        finalEstimate={null}
        onSetFinalEstimate={vi.fn()}
      />
    );
    expect(screen.getByText(/final estimate/i)).toBeInTheDocument();
  });

  it("shows the picker when the votes are split", () => {
    render(
      <RevealBoard
        estimates={[
          { participantId: "p1", value: "5" },
          { participantId: "p2", value: "8" },
        ]}
        revealResult={{
          distribution: [
            { value: "5", count: 1 },
            { value: "8", count: 1 },
          ],
          allAgree: false,
        }}
        participants={participants}
        onReVote={vi.fn()}
        onNextStory={vi.fn()}
        hasNextStory={false}
        hasActiveStory={true}
        finalEstimate={null}
        onSetFinalEstimate={vi.fn()}
      />
    );
    expect(screen.getByText(/final estimate/i)).toBeInTheDocument();
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

describe("RevealBoard advance button", () => {
  const participants = [
    { id: "p1", displayName: "A", color: "#fff", hasEstimated: true },
  ];
  const baseProps = {
    estimates: [{ participantId: "p1", value: "5" as const }],
    revealResult: { distribution: [], allAgree: false },
    participants,
    onReVote: vi.fn(),
    finalEstimate: null,
    onSetFinalEstimate: vi.fn(),
  };

  it("shows 'Next Story' when a pending story exists", () => {
    render(
      <RevealBoard
        {...baseProps}
        onNextStory={vi.fn()}
        hasNextStory={true}
        hasActiveStory={true}
      />
    );
    expect(screen.getByRole("button", { name: "Next Story" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /wrap up/i })).toBeNull();
  });

  it("shows 'Wrap up' on the last story (active, none pending)", async () => {
    const user = userEvent.setup();
    const onNextStory = vi.fn();
    render(
      <RevealBoard
        {...baseProps}
        onNextStory={onNextStory}
        hasNextStory={false}
        hasActiveStory={true}
      />
    );
    const btn = screen.getByRole("button", { name: /wrap up/i });
    await user.click(btn);
    expect(onNextStory).toHaveBeenCalled();
  });

  it("shows no advance button for an ad-hoc reveal (no stories)", () => {
    render(
      <RevealBoard
        {...baseProps}
        onNextStory={vi.fn()}
        hasNextStory={false}
        hasActiveStory={false}
      />
    );
    expect(screen.queryByRole("button", { name: "Next Story" })).toBeNull();
    expect(screen.queryByRole("button", { name: /wrap up/i })).toBeNull();
  });
});

describe("RevealBoard distribution", () => {
  const participants = [
    { id: "p1", displayName: "Alice", color: "#fff", hasEstimated: true },
    { id: "p2", displayName: "Bob", color: "#fff", hasEstimated: true },
    { id: "p3", displayName: "Carol", color: "#fff", hasEstimated: true },
    { id: "p4", displayName: "Dan", color: "#fff", hasEstimated: true },
    { id: "p5", displayName: "Eve", color: "#fff", hasEstimated: true },
  ];

  function renderBoard(
    estimates: Estimate[],
    revealResult: RevealResult
  ): ReturnType<typeof render> {
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
      />
    );
  }

  function countFilledDotsInRow(row: HTMLElement): number {
    const dotsContainer = row.children[1] as HTMLElement;
    return dotsContainer.querySelectorAll('[data-filled="true"]').length;
  }

  function countTotalSlotsInRow(row: HTMLElement): number {
    const dotsContainer = row.children[1] as HTMLElement;
    return dotsContainer.querySelectorAll('[data-filled]').length;
  }

  function getPercentInRow(row: HTMLElement): string {
    return (row.children[3] as HTMLElement).textContent ?? "";
  }

  it("AE1 — renders split (8×1, 13×1) with no leader border", () => {
    renderBoard(
      [
        { participantId: "p1", value: "8" },
        { participantId: "p2", value: "13" },
      ],
      {
        allAgree: false,
        distribution: [
          { value: "8", count: 1 },
          { value: "13", count: 1 },
        ],
      }
    );
    expect(screen.getByRole("img", { name: "8: 1 vote" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "13: 1 vote" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /leading/i })).not.toBeInTheDocument();
  });

  it("AE2 — renders dominant (5×3, 8×1, 13×1) with the 5 row as leader", () => {
    renderBoard(
      [
        { participantId: "p1", value: "5" },
        { participantId: "p2", value: "8" },
        { participantId: "p3", value: "13" },
        { participantId: "p4", value: "5" },
        { participantId: "p5", value: "5" },
      ],
      {
        allAgree: false,
        distribution: [
          { value: "5", count: 3 },
          { value: "8", count: 1 },
          { value: "13", count: 1 },
        ],
      }
    );
    expect(
      screen.getByRole("img", { name: "5: 3 votes, leading" })
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "8: 1 vote" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "13: 1 vote" })).toBeInTheDocument();
  });

  it("AE4 — renders abstain row separately from numeric rows", () => {
    renderBoard(
      [
        { participantId: "p1", value: "5" },
        { participantId: "p2", value: "8" },
        { participantId: "p3", value: "13" },
        { participantId: "p4", value: "☕" },
      ],
      {
        allAgree: false,
        distribution: [
          { value: "5", count: 2 },
          { value: "8", count: 1 },
          { value: "13", count: 1 },
          { value: "☕", count: 1 },
        ],
      }
    );
    expect(
      screen.getByRole("img", { name: "5: 2 votes, leading" })
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "8: 1 vote" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "13: 1 vote" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Abstained: 1" })).toBeInTheDocument();
  });

  it("AE5 — tall room (5×6 of 8 voters) renders fraction bar with 6 filled + 2 empty, 75%", () => {
    const estimates: Estimate[] = [
      { participantId: "p1", value: "5" },
      { participantId: "p2", value: "5" },
      { participantId: "p3", value: "5" },
      { participantId: "p4", value: "5" },
      { participantId: "p5", value: "5" },
      { participantId: "p6", value: "5" },
      { participantId: "p7", value: "8" },
      { participantId: "p8", value: "13" },
    ];
    renderBoard(estimates, {
      allAgree: false,
      distribution: [
        { value: "5", count: 6 },
        { value: "8", count: 1 },
        { value: "13", count: 1 },
      ],
    });
    const row5 = screen.getByRole("img", { name: "5: 6 votes, leading" });
    expect(countFilledDotsInRow(row5)).toBe(6);
    expect(countTotalSlotsInRow(row5)).toBe(8);
    expect(getPercentInRow(row5)).toBe("75%");
  });

  it("AE6 — very tall room (5×12 of 15 voters) renders 12 filled + 3 empty, 80%", () => {
    const estimates: Estimate[] = [];
    for (let i = 0; i < 12; i++) {
      estimates.push({ participantId: `p${i + 1}`, value: "5" });
    }
    estimates.push({ participantId: "p13", value: "8" });
    estimates.push({ participantId: "p14", value: "8" });
    estimates.push({ participantId: "p15", value: "13" });
    renderBoard(estimates, {
      allAgree: false,
      distribution: [
        { value: "5", count: 12 },
        { value: "8", count: 2 },
        { value: "13", count: 1 },
      ],
    });
    const row5 = screen.getByRole("img", { name: "5: 12 votes, leading" });
    expect(countFilledDotsInRow(row5)).toBe(12);
    expect(countTotalSlotsInRow(row5)).toBe(15);
    expect(getPercentInRow(row5)).toBe("80%");
  });

  it("AE7 — tied leaders (5×2, 8×2, 13×1) border both 5 and 8; 13 stays plain", () => {
    renderBoard(
      [
        { participantId: "p1", value: "5" },
        { participantId: "p2", value: "8" },
        { participantId: "p3", value: "5" },
        { participantId: "p4", value: "8" },
        { participantId: "p5", value: "13" },
      ],
      {
        allAgree: false,
        distribution: [
          { value: "5", count: 2 },
          { value: "8", count: 2 },
          { value: "13", count: 1 },
        ],
      }
    );
    expect(
      screen.getByRole("img", { name: "5: 2 votes, leading" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "8: 2 votes, leading" })
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "13: 1 vote" })).toBeInTheDocument();
  });

  it("AE8 — all-tied (5×2, 8×2) renders no leader border", () => {
    renderBoard(
      [
        { participantId: "p1", value: "5" },
        { participantId: "p2", value: "8" },
        { participantId: "p3", value: "5" },
        { participantId: "p4", value: "8" },
      ],
      {
        allAgree: false,
        distribution: [
          { value: "5", count: 2 },
          { value: "8", count: 2 },
        ],
      }
    );
    expect(screen.queryByRole("img", { name: /leading/i })).not.toBeInTheDocument();
  });

  it("AE9 — single voter (8×1) renders no leader border", () => {
    renderBoard(
      [{ participantId: "p1", value: "8" }],
      {
        allAgree: false,
        distribution: [{ value: "8", count: 1 }],
      }
    );
    expect(screen.getByRole("img", { name: "8: 1 vote" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /leading/i })).not.toBeInTheDocument();
  });

  it("renders empty distribution without errors", () => {
    renderBoard([], {
      allAgree: false,
      distribution: [],
    });
    expect(screen.queryByRole("img", { name: /vote/i })).not.toBeInTheDocument();
  });

  it("AE10 — prefers-reduced-motion does not affect leader border", () => {
    setReducedMotion(true);
    renderBoard(
      [
        { participantId: "p1", value: "5" },
        { participantId: "p2", value: "5" },
        { participantId: "p3", value: "5" },
        { participantId: "p4", value: "8" },
        { participantId: "p5", value: "13" },
      ],
      {
        allAgree: false,
        distribution: [
          { value: "5", count: 3 },
          { value: "8", count: 1 },
          { value: "13", count: 1 },
        ],
      }
    );
    expect(
      screen.getByRole("img", { name: "5: 3 votes, leading" })
    ).toBeInTheDocument();
  });
});
