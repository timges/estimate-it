import { betterAuth } from "better-auth";

interface AuthEnv {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

export function createAuth(env: AuthEnv) {
  return betterAuth({
    database: env.DB,
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    },
  });
}
