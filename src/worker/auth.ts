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
  let baseURL = env.BETTER_AUTH_URL;
  if (!baseURL && requestURL) {
    const url = new URL(requestURL);
    const protocol = url.hostname === "localhost" ? "http:" : "https:";
    baseURL = `${protocol}//${url.host}`;
  }
  return betterAuth({
    baseURL,
    ...withCloudflare(
      {
        d1Native: env.DB,
        kv: env.KV as never,
        cf,
      },
      {
        socialProviders: {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            redirectURI: `${baseURL}/api/auth/callback/github`,
          },
        },
      }
    ),
  });
}
