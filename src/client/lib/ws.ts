import type { ClientMessage, ServerMessage } from "../../shared/types";

export type MessageHandler = (msg: ServerMessage) => void;

export class RoomSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessage: MessageHandler;
  private onConnectionChange: (connected: boolean) => void;
  private delay = 1000;
  private closed = false;
  private queue: ClientMessage[] = [];

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

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.delay = 1000;
      this.onConnectionChange(true);
      this.flushQueue();
    };

    this.ws.onmessage = (event) => {
      const msg: ServerMessage = JSON.parse(event.data);
      this.onMessage(msg);
    };

    this.ws.onclose = () => {
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

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.queue.push(msg);
    }
  }

  private flushQueue() {
    while (this.queue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const msg = this.queue.shift()!;
      this.ws.send(JSON.stringify(msg));
    }
  }

  close() {
    this.closed = true;
    this.ws?.close();
  }
}
