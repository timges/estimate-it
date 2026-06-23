import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import type { IncomingRequestCfProperties } from "@cloudflare/workers-types";

interface AuthEnv {
  DB: D1Database;
  KV: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

export function createAuth(env: AuthEnv, cf: IncomingRequestCfProperties) {
  return betterAuth({
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
          },
        },
        rateLimit: {
          enabled: true,
          window: 60,
          max: 100,
        },
      }
    ),
  });
}
