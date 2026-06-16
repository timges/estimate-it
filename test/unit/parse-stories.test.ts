import { describe, it, expect } from "vitest";
import { parseStoryLines } from "../../src/shared/parse-stories";

describe("parseStoryLines", () => {
  it("returns one title per non-empty line", () => {
    expect(parseStoryLines("Add login\nExport CSV")).toEqual([
      "Add login",
      "Export CSV",
    ]);
  });

  it("ignores blank lines and trims whitespace", () => {
    expect(parseStoryLines("  Add login  \n\n\n  Export CSV\n")).toEqual([
      "Add login",
      "Export CSV",
    ]);
  });

  it("strips dash/star/plus bullet prefixes", () => {
    expect(parseStoryLines("- Add login\n* Export CSV\n+ Fix bug")).toEqual([
      "Add login",
      "Export CSV",
      "Fix bug",
    ]);
  });

  it("strips numbered list prefixes", () => {
    expect(parseStoryLines("1. Add login\n2) Export CSV")).toEqual([
      "Add login",
      "Export CSV",
    ]);
  });

  it("handles CRLF newlines", () => {
    expect(parseStoryLines("Add login\r\nExport CSV")).toEqual([
      "Add login",
      "Export CSV",
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseStoryLines("   \n\n")).toEqual([]);
  });
});
