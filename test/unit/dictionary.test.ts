import { describe, it, expect } from "vitest";
import { generateRoomCode, assignColor } from "../../src/shared/dictionary";

describe("generateRoomCode", () => {
  it('returns format "word-word"', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[a-z]+-[a-z]+$/);
  });

  it("never uses the same word twice", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      const [w1, w2] = code.split("-");
      expect(w1).not.toBe(w2);
    }
  });

  it("produces reasonably unique codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateRoomCode());
    }
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe("assignColor", () => {
  it("returns a hex color string", () => {
    const color = assignColor(0);
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("cycles with modulo (index 0 === index 8)", () => {
    expect(assignColor(0)).toBe(assignColor(8));
  });

  it("returns different colors for different indices within one cycle", () => {
    const colors = new Set<string>();
    for (let i = 0; i < 8; i++) {
      colors.add(assignColor(i));
    }
    expect(colors.size).toBe(8);
  });
});
