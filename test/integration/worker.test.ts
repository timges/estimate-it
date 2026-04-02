import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("Worker integration", () => {
  it("health check returns ok", async () => {
    const res = await SELF.fetch("http://example.com/api/health");
    expect(res.status).toBe(200);
    const data = await res.json<{ status: string }>();
    expect(data.status).toBe("ok");
  });

  it("returns 404 for unknown non-asset routes", async () => {
    const res = await SELF.fetch("http://example.com/unknown");
    expect(res.status).toBe(404);
  });

  it("rejects WebSocket without room ID", async () => {
    const res = await SELF.fetch("http://example.com/ws/", {
      headers: { Upgrade: "websocket" },
    });
    expect(res.status).toBe(400);
  });
});
