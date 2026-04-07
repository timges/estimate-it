import { Hono } from "hono";
import { Room } from "./room";

// Re-export Room for vitest pool workers (must be a named export from main)
export { Room };

interface Env {
  ROOM: DurableObjectNamespace<Room>;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.get("/robots.txt", (c) =>
  c.text("User-agent: *\nAllow: /\n", { headers: { "Content-Type": "text/plain" } })
);

app.get("/sitemap.xml", (c) =>
  c.text(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://estimate-it.app/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`, { headers: { "Content-Type": "application/xml" } })
);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade") === "websocket") {
      const roomId = url.pathname.replace("/ws/", "");
      if (!roomId) {
        return new Response("Missing room ID", { status: 400 });
      }
      const id = env.ROOM.idFromName(roomId);
      const stub = env.ROOM.get(id);
      return stub.fetch(request);
    }

    if (url.pathname.startsWith("/api/") || url.pathname === "/robots.txt" || url.pathname === "/sitemap.xml") {
      return app.fetch(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};
