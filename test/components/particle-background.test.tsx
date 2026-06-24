import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import ParticleBackground from "../../src/client/components/ParticleBackground";

function createMatchMediaMock(matches: boolean) {
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();
  return {
    mock: {
      matches,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener,
      removeEventListener,
      dispatchEvent: vi.fn(() => false),
    },
    addEventListener,
    removeEventListener,
  };
}

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
  for (const fn of Object.values(mockCtx)) {
    if (typeof fn === "function" && "mockClear" in fn) {
      (fn as ReturnType<typeof vi.fn>).mockClear();
    }
  }
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    mockCtx as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ParticleBackground", () => {
  it("renders a canvas element", () => {
    window.matchMedia = vi.fn().mockReturnValue(
      createMatchMediaMock(false).mock,
    ) as typeof window.matchMedia;
    const { container } = render(<ParticleBackground />);
    expect(container.querySelector("canvas")).toBeInTheDocument();
  });

  it("marks the canvas aria-hidden (purely decorative)", () => {
    window.matchMedia = vi.fn().mockReturnValue(
      createMatchMediaMock(false).mock,
    ) as typeof window.matchMedia;
    const { container } = render(<ParticleBackground />);
    expect(container.querySelector("canvas")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("starts the animation loop when motion is allowed", () => {
    window.matchMedia = vi.fn().mockReturnValue(
      createMatchMediaMock(false).mock,
    ) as typeof window.matchMedia;
    render(<ParticleBackground />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("does not start the animation loop under prefers-reduced-motion", () => {
    window.matchMedia = vi.fn().mockReturnValue(
      createMatchMediaMock(true).mock,
    ) as typeof window.matchMedia;
    render(<ParticleBackground />);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("renders the static gradient when prefers-reduced-motion is active", () => {
    window.matchMedia = vi.fn().mockReturnValue(
      createMatchMediaMock(true).mock,
    ) as typeof window.matchMedia;
    render(<ParticleBackground />);
    expect(mockCtx.createLinearGradient).toHaveBeenCalled();
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });

  it("cleans up animation frame on unmount", () => {
    window.matchMedia = vi.fn().mockReturnValue(
      createMatchMediaMock(false).mock,
    ) as typeof window.matchMedia;
    const { unmount } = render(<ParticleBackground />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("removes all window event listeners on unmount", () => {
    window.matchMedia = vi.fn().mockReturnValue(
      createMatchMediaMock(false).mock,
    ) as typeof window.matchMedia;
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<ParticleBackground />);
    unmount();

    const events = removeSpy.mock.calls.map((c) => c[0]);
    expect(events).toContain("pointermove");
    expect(events).toContain("pointerleave");
    expect(events).toContain("resize");
  });

  it("does not call cancelAnimationFrame when no animation was started", () => {
    window.matchMedia = vi.fn().mockReturnValue(
      createMatchMediaMock(true).mock,
    ) as typeof window.matchMedia;
    const { unmount } = render(<ParticleBackground />);
    unmount();
    expect(window.cancelAnimationFrame).not.toHaveBeenCalled();
  });

  it("toggles to static rendering when prefers-reduced-motion changes to true", () => {
    const matchMedia = createMatchMediaMock(false);
    window.matchMedia = vi
      .fn()
      .mockReturnValue(matchMedia.mock) as typeof window.matchMedia;
    const { unmount } = render(<ParticleBackground />);

    mockCtx.createLinearGradient.mockClear();
    mockCtx.fillRect.mockClear();

    act(() => {
      matchMedia.mock.matches = true;
      const handler = matchMedia.addEventListener.mock.calls[0]?.[1] as
        | ((e: MediaQueryListEvent) => void)
        | undefined;
      handler?.({ matches: true } as MediaQueryListEvent);
    });

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(mockCtx.createLinearGradient).toHaveBeenCalled();

    unmount();
  });

  it("toggles to animation when prefers-reduced-motion changes to false", () => {
    const matchMedia = createMatchMediaMock(true);
    window.matchMedia = vi
      .fn()
      .mockReturnValue(matchMedia.mock) as typeof window.matchMedia;
    render(<ParticleBackground />);

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();

    act(() => {
      const handler = matchMedia.addEventListener.mock.calls[0]?.[1] as
        | ((e: MediaQueryListEvent) => void)
        | undefined;
      handler?.({ matches: false } as MediaQueryListEvent);
    });

    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("updates DPR-capped canvas dimensions on resize", () => {
    Object.defineProperty(window, "devicePixelRatio", {
      value: 3,
      configurable: true,
    });
    window.matchMedia = vi.fn().mockReturnValue(
      createMatchMediaMock(false).mock,
    ) as typeof window.matchMedia;
    const { container } = render(<ParticleBackground />);
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;

    fireEvent.resize(window);

    expect(canvas.width).toBe(Math.floor(window.innerWidth * 2));
    expect(canvas.height).toBe(Math.floor(window.innerHeight * 2));
    expect(mockCtx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  it("rebuilds the static gradient when resized under reduced motion", () => {
    Object.defineProperty(window, "devicePixelRatio", {
      value: 1,
      configurable: true,
    });
    window.matchMedia = vi.fn().mockReturnValue(
      createMatchMediaMock(true).mock,
    ) as typeof window.matchMedia;
    render(<ParticleBackground />);

    mockCtx.createLinearGradient.mockClear();
    mockCtx.fillRect.mockClear();

    fireEvent.resize(window);

    expect(mockCtx.createLinearGradient).toHaveBeenCalled();
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });
});