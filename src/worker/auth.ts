import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import type { IncomingRequestCfProperties } from "@cloudflare/workers-types";

interface AuthEnv {
  DB: D1Database;
  KV: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  BETTER_AUTH_URL?: string;
}

export function createAuth(env: AuthEnv, cf: IncomingRequestCfProperties, requestURL?: string) {
  let baseURL = env.BETTER_AUTH_URL ?? "";
  if (!baseURL && requestURL) {
    const url = new URL(requestURL);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".localhost");
    const protocol = isLocal || url.protocol === "http:" ? "http:" : "https:";
    baseURL = `${protocol}//${url.host}`;
  }
  const redirectURI = `${baseURL}/api/auth/callback/github`;
  // The browser hits the worker through whatever origin it loaded the SPA
  // from (Vite dev, wrangler direct, or production). Trusted origins must
  // include all of them so cross-origin POSTs are accepted; otherwise the
  // browser gets a 403 "Invalid origin" on the very first sign-in attempt.
  const trustedOrigins: string[] = [
    ...(baseURL ? [baseURL] : []),
    "http://localhost",
    "http://localhost:8787",
    "http://127.0.0.1:8787",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://estimate-it.app",
  ];
  return betterAuth({
    baseURL,
    trustedOrigins,
    ...withCloudflare(
      {
        d1Native: env.DB,
        kv: env.KV as never,
        cf,
      },
      {
        verification: {
          storeInDatabase: true,
        },
        socialProviders: {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            redirectURI,
            mapProfileToUser: (profile) => ({
              email: profile.email ?? `${profile.login}@users.noreply.github.com`,
              emailVerified: Boolean(profile.email),
            }),
          },
        },
      }
    ),
  });
}
