import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import ParticleBackground from "../../src/client/components/ParticleBackground";

let reducedMotion = false;

const mockCtx = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  setTransform: vi.fn(),
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 0,
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    mockCtx as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

  window.matchMedia = (query: string): MediaQueryList => ({
    matches: query === "(prefers-reduced-motion: reduce)" ? reducedMotion : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ParticleBackground", () => {
  it("renders a canvas element", () => {
    reducedMotion = false;
    const { container } = render(<ParticleBackground />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
  });

  it("starts the animation loop when motion is allowed", () => {
    reducedMotion = false;
    render(<ParticleBackground />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("does not start the animation loop under prefers-reduced-motion", () => {
    reducedMotion = true;
    render(<ParticleBackground />);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("cleans up animation frame on unmount", () => {
    reducedMotion = false;
    const { unmount } = render(<ParticleBackground />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("registers pointermove and pointerleave listeners on window", () => {
    reducedMotion = false;
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<ParticleBackground />);
    unmount();

    const events = removeSpy.mock.calls.map((c) => c[0]);
    expect(events).toContain("pointermove");
    expect(events).toContain("pointerleave");
  });
});