// Pure functions for /api/import. Extracted for unit testing.

import type { IssueImportResult } from "../shared/types";

export const CONCURRENCY_LIMIT = 5;
export const REQUEST_TIMEOUT_MS = 10_000;
export const MAX_URLS = 50;
export const IMPORT_RATE_LIMIT_PER_MINUTE = 10;
export const IMPORT_RATE_WINDOW_SECONDS = 60;

export const ISSUE_URL_PATTERN =
  /^https?:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)\/issues\/(\d+)\/?$/;

export interface ParsedIssue {
  owner: string;
  repo: string;
  number: number;
}

export function parseUrl(url: string): ParsedIssue | null {
  const match = url.match(ISSUE_URL_PATTERN);
  if (!match) return null;
  const [, owner, repo, numStr] = match;
  const number = parseInt(numStr, 10);
  return number > 0 ? { owner, repo, number } : null;
}

export type FetchIssueResult =
  | { ok: true; title: string; body: string }
  | { ok: false; error: string };

export async function fetchIssue(
  owner: string,
  repo: string,
  number: number,
  token: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<FetchIssueResult> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${number}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "estimate-it",
      },
      signal: controller.signal,
    });

    if (res.status === 404) return { ok: false, error: "Issue not found" };
    if (res.status === 403) return { ok: false, error: "No access to this repository" };
    if (res.status === 401) return { ok: false, error: "GitHub token expired — please re-authenticate" };
    if (res.status === 429) return { ok: false, error: "Rate limited by GitHub — try again later" };
    if (!res.ok) return { ok: false, error: `GitHub API error: ${res.status}` };

    const data = (await res.json()) as { title: string; body: string | null };
    return { ok: true, title: data.title, body: data.body ?? "" };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Request timed out" };
    }
    return { ok: false, error: "Network error" };
  } finally {
    clearTimeout(timer);
  }
}

export async function processBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export function rateLimitKey(userId: string, nowMs = Date.now()): string {
  const window = Math.floor(nowMs / 1000 / IMPORT_RATE_WINDOW_SECONDS);
  return `rl:import:${userId}:${window}`;
}

export async function checkImportRateLimit(
  kv: KVNamespaceLike,
  userId: string,
  limit: number = IMPORT_RATE_LIMIT_PER_MINUTE,
): Promise<{ allowed: boolean; count: number }> {
  const key = rateLimitKey(userId);
  const current = Number((await kv.get(key)) ?? "0");
  if (current >= limit) {
    return { allowed: false, count: current };
  }
  await kv.put(key, String(current + 1), {
    expirationTtl: IMPORT_RATE_WINDOW_SECONDS * 2,
  });
  return { allowed: true, count: current + 1 };
}
