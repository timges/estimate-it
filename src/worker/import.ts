import { Hono } from "hono";
import { createAuth } from "./auth";
import type { IncomingRequestCfProperties } from "@cloudflare/workers-types";

interface ImportEnv {
  DB: D1Database;
  KV: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

interface ImportResult {
  url: string;
  ok: boolean;
  title?: string;
  body?: string;
  error?: string;
}

const CONCURRENCY_LIMIT = 5;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_URLS = 50;

const ISSUE_URL_PATTERN =
  /^https?:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)\/issues\/(\d+)\/?$/;

function parseUrl(url: string): { owner: string; repo: string; number: number } | null {
  const match = url.match(ISSUE_URL_PATTERN);
  if (!match) return null;
  const [, owner, repo, numStr] = match;
  const number = parseInt(numStr, 10);
  return number > 0 ? { owner, repo, number } : null;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchIssue(
  owner: string,
  repo: string,
  number: number,
  token: string,
): Promise<{ title: string; body: string } | { error: string }> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${number}`;
  try {
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "estimate-it",
        },
      },
      REQUEST_TIMEOUT_MS,
    );

    if (res.status === 404) return { error: "Issue not found" };
    if (res.status === 403) return { error: "No access to this repository" };
    if (res.status === 401) return { error: "GitHub token expired — please re-authenticate" };
    if (res.status === 429) return { error: "Rate limited by GitHub — try again later" };
    if (!res.ok) return { error: `GitHub API error: ${res.status}` };

    const data = (await res.json()) as { title: string; body: string | null };
    return { title: data.title, body: data.body ?? "" };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Request timed out" };
    }
    return { error: "Network error" };
  }
}

async function processBatch<T, R>(
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

export function createImportRoutes() {
  const importApp = new Hono<{ Bindings: ImportEnv }>();

  importApp.post("/api/import", async (c) => {
    // Verify session
    const auth = createAuth(c.env, c.req.raw.cf as IncomingRequestCfProperties, c.req.url);
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session?.user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    // Get the GitHub access token from the account table
    const accountResult = await c.env.DB.prepare(
      "SELECT access_token FROM account WHERE user_id = ? AND provider_id = 'github' LIMIT 1"
    )
      .bind(session.user.id)
      .all();
    const account = (accountResult.results?.[0] as { access_token?: string } | undefined);
    if (!account?.access_token) {
      return c.json({ error: "No GitHub account linked" }, 400);
    }

    // Parse request body
    const body = (await c.req.json()) as { urls?: string[] };
    const urls = body.urls ?? [];

    if (urls.length === 0) {
      return c.json({ results: [] });
    }

    if (urls.length > MAX_URLS) {
      return c.json({ error: `Maximum ${MAX_URLS} URLs per import` }, 400);
    }

    // Parse and fetch
    const parsed = urls.map((url) => ({ url, parsed: parseUrl(url) }));
    const validItems = parsed.filter((p) => p.parsed !== null) as {
      url: string;
      parsed: { owner: string; repo: string; number: number };
    }[];
    const invalidItems = parsed.filter((p) => p.parsed === null);

    const fetchResults = await processBatch(
      validItems,
      async (item) => {
        const result = await fetchIssue(
          item.parsed.owner,
          item.parsed.repo,
          item.parsed.number,
          account.access_token!,
        );
        return { url: item.url, ...result };
      },
      CONCURRENCY_LIMIT,
    );

    // Build response
    const results: ImportResult[] = [
      ...invalidItems.map((item) => ({
        url: item.url,
        ok: false as const,
        error: "Not a valid GitHub issue URL",
      })),
      ...fetchResults.map((r) => {
        if ("error" in r) {
          return { url: r.url, ok: false as const, error: r.error };
        }
        return { url: r.url, ok: true as const, title: r.title, body: r.body };
      }),
    ];

    return c.json({ results });
  });

  return importApp;
}
