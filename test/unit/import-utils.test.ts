import { describe, it, expect, vi } from "vitest";
import {
  fetchIssue,
  parseUrl,
  processBatch,
  checkImportRateLimit,
  MAX_URLS,
  CONCURRENCY_LIMIT,
  type KVNamespaceLike,
} from "../../src/worker/import-utils";

describe("parseUrl", () => {
  it("parses a valid GitHub issue URL", () => {
    const result = parseUrl("https://github.com/owner/repo/issues/123");
    expect(result).toEqual({ owner: "owner", repo: "repo", number: 123 });
  });

  it("accepts a trailing slash", () => {
    expect(parseUrl("https://github.com/a/b/issues/1/")).toEqual({ owner: "a", repo: "b", number: 1 });
  });

  it("accepts http (not just https)", () => {
    expect(parseUrl("http://github.com/a/b/issues/1")).toEqual({ owner: "a", repo: "b", number: 1 });
  });

  it("rejects zero and negative issue numbers", () => {
    expect(parseUrl("https://github.com/a/b/issues/0")).toBeNull();
    expect(parseUrl("https://github.com/a/b/issues/-1")).toBeNull();
  });

  it("rejects non-GitHub hosts and pull/issue paths", () => {
    expect(parseUrl("https://gitlab.com/a/b/issues/1")).toBeNull();
    expect(parseUrl("https://github.com/a/b/pull/1")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(parseUrl("")).toBeNull();
  });
});

function mockResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

describe("fetchIssue", () => {
  it("returns the issue title and body on 200", async () => {
    const fetchImpl = vi.fn(async () => mockResponse(200, { title: "Issue 1", body: "Body text" }));
    const result = await fetchIssue("o", "r", 1, "tok", fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, title: "Issue 1", body: "Body text" });
  });

  it("defaults body to empty string when null", async () => {
    const fetchImpl = vi.fn(async () => mockResponse(200, { title: "Issue 2", body: null }));
    const result = await fetchIssue("o", "r", 2, "tok", fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, title: "Issue 2", body: "" });
  });

  it("returns 404 error on not found", async () => {
    const fetchImpl = vi.fn(async () => mockResponse(404));
    const result = await fetchIssue("o", "r", 1, "tok", fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, error: "Issue not found" });
  });

  it("returns 401 error on token expired", async () => {
    const fetchImpl = vi.fn(async () => mockResponse(401));
    const result = await fetchIssue("o", "r", 1, "tok", fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, error: "GitHub token expired — please re-authenticate" });
  });

  it("returns 403 error on no access", async () => {
    const fetchImpl = vi.fn(async () => mockResponse(403));
    const result = await fetchIssue("o", "r", 1, "tok", fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, error: "No access to this repository" });
  });

  it("returns 429 error on rate limited", async () => {
    const fetchImpl = vi.fn(async () => mockResponse(429));
    const result = await fetchIssue("o", "r", 1, "tok", fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, error: "Rate limited by GitHub — try again later" });
  });

  it("returns generic error on 500", async () => {
    const fetchImpl = vi.fn(async () => mockResponse(500));
    const result = await fetchIssue("o", "r", 1, "tok", fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ ok: false, error: "GitHub API error: 500" });
  });

  it("returns timed out when fetch is aborted", async () => {
    const fetchImpl = vi.fn(async (_url: string, opts: RequestInit) => {
      opts.signal!.dispatchEvent(new Event("abort"));
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    });
    const result = await fetchIssue("o", "r", 1, "tok", fetchImpl as unknown as typeof fetch, 1);
    expect(result).toEqual({ ok: false, error: "Request timed out" });
  });

  it("sends Authorization header with the token", async () => {
    const fetchImpl = vi.fn(async () => mockResponse(200, { title: "T", body: null }));
    await fetchIssue("o", "r", 1, "mytoken", fetchImpl as unknown as typeof fetch);
    const opts = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect((opts.headers as Record<string, string>).Authorization).toBe("Bearer mytoken");
  });
});

describe("processBatch", () => {
  it("processes all items with the given concurrency", async () => {
    let inFlight = 0;
    let peak = 0;
    const fn = async (n: number) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 10));
      inFlight--;
      return n * 2;
    };
    const result = await processBatch([1, 2, 3, 4, 5, 6, 7], fn, 3);
    expect(result).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThan(1);
  });

  it("returns empty array for empty input", async () => {
    const result = await processBatch<number, number>([], async () => 1, 5);
    expect(result).toEqual([]);
  });
});

describe("import limits", () => {
  it("exposes a MAX_URLS constant", () => {
    expect(MAX_URLS).toBe(50);
  });

  it("exposes a CONCURRENCY_LIMIT constant", () => {
    expect(CONCURRENCY_LIMIT).toBe(5);
  });
});

describe("checkImportRateLimit", () => {
  function makeKV(values: Map<string, string> = new Map()): KVNamespaceLike {
    return {
      get: vi.fn(async (key: string) => values.get(key) ?? null),
      put: vi.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
    };
  }

  it("allows the first call and increments the counter", async () => {
    const kv = makeKV();
    const result = await checkImportRateLimit(kv, "user1");
    expect(result).toEqual({ allowed: true, count: 1 });
    expect(kv.put).toHaveBeenCalledOnce();
  });

  it("blocks when the limit is reached", async () => {
    const { rateLimitKey } = await import("../../src/worker/import-utils");
    const kv = makeKV(new Map([[rateLimitKey("user2"), "10"]]));
    const result = await checkImportRateLimit(kv, "user2");
    expect(result.allowed).toBe(false);
    expect(result.count).toBe(10);
  });

  it("uses the user id in the rate-limit key", async () => {
    const kv = makeKV();
    await checkImportRateLimit(kv, "user-a", 5);
    await checkImportRateLimit(kv, "user-b", 5);
    const keys = Array.from(kv.put.mock.calls.map(([k]) => k));
    expect(keys[0]).toContain("user-a");
    expect(keys[1]).toContain("user-b");
  });

  it("respects a custom limit", async () => {
    const { rateLimitKey } = await import("../../src/worker/import-utils");
    const kv = makeKV(new Map([[rateLimitKey("user3"), "2"]]));
    const result = await checkImportRateLimit(kv, "user3", 2);
    expect(result.allowed).toBe(false);
  });
});
