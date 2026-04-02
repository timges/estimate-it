import { Hono } from "hono";
import { Room } from "./room";

// Re-export Room for vitest pool workers (must be a named export from main)
export { Room };

interface Env {
  ROOM: DurableObjectNamespace<Room>;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ status: "ok" }));

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

    if (url.pathname.startsWith("/api/")) {
      return app.fetch(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};
