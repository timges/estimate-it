// Centralized localStorage key strings and their typed values. Importing
// from here keeps every callsite in sync if the schema changes.
import type { FibonacciValue } from "./types";

export const STORAGE_KEYS = {
  clientId: "clientId",
  displayName: "displayName",
  roomAction: "roomAction",
} as const;

export type RoomAction = "create" | "join";

export function isRoomAction(value: string | null): value is RoomAction {
  return value === "create" || value === "join";
}

export function readDisplayName(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.displayName) ?? "";
  } catch {
    return "";
  }
}

export function writeDisplayName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.displayName, name);
  } catch {
    // ignore storage failures (private mode, quota)
  }
}

export function readRoomAction(): RoomAction | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.roomAction);
    return isRoomAction(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function clearRoomAction(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.roomAction);
  } catch {
    // ignore
  }
}

export type { FibonacciValue };
