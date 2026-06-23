import { betterAuth } from "better-auth";

interface AuthEnv {
  DB: D1Database;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  BETTER_AUTH_URL?: string;
}

export function createAuth(env: AuthEnv, requestURL?: string) {
  let baseURL = env.BETTER_AUTH_URL;
  if (!baseURL && requestURL) {
    const url = new URL(requestURL);
    baseURL = `${url.protocol}//${url.host}`;
  }
  return betterAuth({
    database: env.DB,
    baseURL,
    basePath: "/api/auth",
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    },
  });
}
