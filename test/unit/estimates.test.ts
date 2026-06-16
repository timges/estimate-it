import { describe, it, expect } from "vitest";
import type { Story, FibonacciValue } from "../../src/shared/types";
import {
  suggestFinalEstimate,
  summarize,
  summaryMarkdown,
} from "../../src/shared/estimates";

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

describe("suggestFinalEstimate", () => {
  it("returns the most common vote", () => {
    const values: FibonacciValue[] = ["3", "3", "5"];
    expect(suggestFinalEstimate(values)).toBe("3");
  });

  it("breaks ties toward the higher card", () => {
    const values: FibonacciValue[] = ["3", "8"];
    expect(suggestFinalEstimate(values)).toBe("8");
  });

  it("ignores coffee votes", () => {
    const values: FibonacciValue[] = ["5", "☕", "☕"];
    expect(suggestFinalEstimate(values)).toBe("5");
  });

  it("returns null when only coffee was voted", () => {
    const values: FibonacciValue[] = ["☕"];
    expect(suggestFinalEstimate(values)).toBeNull();
  });

  it("returns null for no votes", () => {
    expect(suggestFinalEstimate([])).toBeNull();
  });

  it("breaks a three-way tie toward the highest card", () => {
    const values: FibonacciValue[] = ["1", "2", "3"];
    expect(suggestFinalEstimate(values)).toBe("3");
  });
});

describe("summarize", () => {
  it("sums numeric final estimates and counts unanimous stories", () => {
    const stories = [
      story({ finalEstimate: "5", unanimous: true }),
      story({ finalEstimate: "8", unanimous: false }),
      story({ finalEstimate: "☕", unanimous: false }),
      story({ finalEstimate: null, unanimous: null }),
    ];
    expect(summarize(stories)).toEqual({ totalPoints: 13, unanimousCount: 1 });
  });

  it("returns zeroes for an empty list", () => {
    expect(summarize([])).toEqual({ totalPoints: 0, unanimousCount: 0 });
  });

  it("counts a unanimous story even when no final estimate was recorded", () => {
    expect(summarize([story({ finalEstimate: null, unanimous: true })])).toEqual({
      totalPoints: 0,
      unanimousCount: 1,
    });
  });
});

describe("summaryMarkdown", () => {
  it("renders a list with a totals line", () => {
    const stories = [
      story({ id: 1, title: "Add login", finalEstimate: "5" }),
      story({ id: 2, title: "Export CSV", finalEstimate: null }),
    ];
    expect(summaryMarkdown(stories)).toBe(
      "- Add login — 5\n- Export CSV — —\nTotal: 5 points across 2 stories"
    );
  });
});
