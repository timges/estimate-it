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
    // Cloudflare terminates TLS — force https for production domains
    const protocol = url.hostname === "localhost" ? "http:" : "https:";
    baseURL = `${protocol}//${url.host}`;
  }
  return betterAuth({
    database: env.DB,
    baseURL,
    basePath: "/api/auth",
    trustedOrigins: ["http://localhost:5173"],
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        redirectURI: `${baseURL}/api/auth/callback/github`,
      },
    },
  });
}
