// Matches a leading list marker: "- ", "* ", "+ ", "1. ", "1) " (with surrounding space).
const BULLET_PREFIX = /^\s*(?:[-*+]|\d+[.)])\s+/;

/**
 * Split pasted text into story titles: one per non-empty line, list markers
 * and surrounding whitespace removed.
 */
export function parseStoryLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(BULLET_PREFIX, "").trim())
    .filter((line) => line.length > 0);
}
