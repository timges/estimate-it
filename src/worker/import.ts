import { Hono } from "hono";
import type { IncomingRequestCfProperties } from "@cloudflare/workers-types";
import type { IssueImportRequest, IssueImportResult } from "../shared/types";
import {
  CONCURRENCY_LIMIT,
  MAX_URLS,
  checkImportRateLimit,
  fetchIssue,
  parseUrl,
  processBatch,
} from "./import-utils";

interface ImportEnv {
  DB: D1Database;
  KV: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

export function createImportRoutes() {
  const importApp = new Hono<{ Bindings: ImportEnv }>();

  importApp.post("/api/import", async (c) => {
    // Verify session
    const { createAuth } = await import("./auth");
    const auth = createAuth(c.env, c.req.raw.cf as IncomingRequestCfProperties, c.req.url);
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session?.user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const rate = await checkImportRateLimit(c.env.KV, session.user.id);
    if (!rate.allowed) {
      return c.json(
        { error: "Rate limit exceeded. Please wait a minute and try again." },
        429,
      );
    }

    // Get the GitHub access token from the account table
    const accountResult = await c.env.DB.prepare(
      "SELECT accessToken FROM account WHERE userId = ? AND providerId = 'github' LIMIT 1"
    )
      .bind(session.user.id)
      .all();
    const account = (accountResult.results?.[0] as { accessToken?: string } | undefined);
    if (!account?.accessToken) {
      return c.json({ error: "No GitHub account linked" }, 400);
    }

    // Parse request body
    const body = (await c.req.json()) as IssueImportRequest;
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
          account.accessToken!,
        );
        return { url: item.url, ...result };
      },
      CONCURRENCY_LIMIT,
    );

    // Build response
    const results: IssueImportResult[] = [
      ...invalidItems.map((item) => ({
        url: item.url,
        ok: false as const,
        error: "Not a valid GitHub issue URL",
      })),
      ...fetchResults.map((r) => {
        if (!r.ok) {
          return { url: r.url, ok: false as const, error: r.error };
        }
        return { url: r.url, ok: true as const, title: r.title, body: r.body };
      }),
    ];

    return c.json({ results });
  });

  return importApp;
}
