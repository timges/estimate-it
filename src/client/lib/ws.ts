import type { ClientMessage, ServerMessage } from "../../shared/types";

export type MessageHandler = (msg: ServerMessage) => void;

// Heartbeat: send a ping on this cadence; if no pong arrives within the
// timeout, treat the connection as dead and force a reconnect. This catches
// silent drops (sleep, wifi blips, idle eviction) that never fire `onclose`.
const PING_INTERVAL_MS = 20_000;
const PONG_TIMEOUT_MS = 10_000;
const PING_MESSAGE = JSON.stringify({ type: "ping" });
// Cap the offline queue so a long disconnection can't pile up unbounded
// messages and amplify load on reconnect.
const MAX_QUEUE = 100;

export class RoomSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessage: MessageHandler;
  private onConnectionChange: (connected: boolean) => void;
  private delay = 1000;
  private closed = false;
  private queue: ClientMessage[] = [];
  // The identity message re-sent on every (re)open so a reconnected socket
  // is re-associated with its participant server-side. We keep this as a
  // "create" until we receive confirmation (room_state) that the room
  // exists, otherwise a quick reconnect would send a stale "join" against a
  // server-side DO that hasn't finished bootstrapping yet.
  private hello: ClientMessage | null = null;
  private pendingCreate = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    roomId: string,
    onMessage: MessageHandler,
    onConnectionChange: (connected: boolean) => void
  ) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.url = `${protocol}//${window.location.host}/ws/${roomId}`;
    this.onMessage = onMessage;
    this.onConnectionChange = onConnectionChange;
  }

  connect(hello?: ClientMessage) {
    if (hello) {
      this.hello = hello;
      this.pendingCreate = hello.type === "create";
    }
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.delay = 1000;
      this.onConnectionChange(true);
      if (this.hello) {
        this.ws!.send(JSON.stringify(this.hello));
      }
      this.flushQueue();
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as ServerMessage | { type: "pong" };
      if (msg.type === "pong") {
        this.clearPongTimer();
        return;
      }
      // The first room_state confirms the room exists; from here on any
      // reconnect should re-join, never re-create.
      if (msg.type === "room_state" && this.pendingCreate) {
        this.pendingCreate = false;
        if (this.hello && this.hello.type === "create") {
          this.hello = {
            type: "join",
            displayName: this.hello.displayName,
            clientId: this.hello.clientId,
          };
        }
      }
      this.onMessage(msg);
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.onConnectionChange(false);
      if (!this.closed) {
        setTimeout(() => {
          this.connect();
          this.delay = Math.min(this.delay * 2, 30000);
        }, this.delay);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

// Keep the identity message in sync (e.g. after a rename) so a reconnect
// restores the latest display name rather than the original.
updateName(displayName: string) {
    if (this.hello && (this.hello.type === "create" || this.hello.type === "join")) {
      this.hello = { ...this.hello, displayName };
    }
  }

  // Update the stable clientId after a login-while-in-room transition. The
  // `type` (create vs join) is preserved so the reconnect after a network
  // blip still uses the correct mode. `pendingCreate` is cleared because
  // the server has already acknowledged our original identity.
  updateIdentity(clientId: string, displayName: string) {
    if (this.hello && (this.hello.type === "create" || this.hello.type === "join")) {
      this.hello = { ...this.hello, clientId, displayName };
      this.pendingCreate = false;
    }
  }

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      if (this.queue.length >= MAX_QUEUE) {
        this.queue.shift();
      }
      this.queue.push(msg);
    }
  }

  private flushQueue() {
    while (this.queue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const msg = this.queue.shift()!;
      this.ws.send(JSON.stringify(msg));
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      this.ws.send(PING_MESSAGE);
      if (!this.pongTimer) {
        this.pongTimer = setTimeout(() => {
          // No pong in time — the socket is dead; closing triggers reconnect.
          this.ws?.close();
        }, PONG_TIMEOUT_MS);
      }
    }, PING_INTERVAL_MS);
  }

  private clearPongTimer() {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.clearPongTimer();
  }

  close() {
    this.closed = true;
    this.stopHeartbeat();
    this.ws?.close();
  }
}
