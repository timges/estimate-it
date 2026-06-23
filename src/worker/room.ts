import { DurableObject } from "cloudflare:workers";
import type {
  ServerMessage,
  ClientMessage,
  Room as RoomInfo,
  Story,
  Participant,
  RevealResult,
  FibonacciValue,
} from "../shared/types";
import { FIBONACCI_VALUES } from "../shared/types";
import { assignColor } from "../shared/dictionary";

interface Env {
  ROOM: DurableObjectNamespace<Room>;
}

interface ConnectionData {
  participantId: string;
}

// How long a participant's row is kept after their socket closes, so a refresh
// or transient network drop can reclaim the same identity instead of joining
// as a brand-new member.
const DISCONNECT_GRACE_MS = 15_000;

const NO_STORY_ROUND_ID = 0;

// Heartbeat frames. The exact serialized strings are matched by the Durable
// Object's auto-responder, which replies without waking from hibernation.
const PING_MESSAGE = JSON.stringify({ type: "ping" });
const PONG_MESSAGE = JSON.stringify({ type: "pong" });

export class Room extends DurableObject<Env> {
  private roomId: string;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.roomId = this.ctx.id.toString();
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(PING_MESSAGE, PONG_MESSAGE)
    );
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS room (
          id TEXT PRIMARY KEY,
          name TEXT,
          created_at INTEGER
        )
      `);
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS participant (
          id TEXT PRIMARY KEY,
          display_name TEXT,
          color TEXT,
          joined_at INTEGER,
          client_id TEXT,
          disconnected_at INTEGER
        )
      `);
      // Migrate rooms created before stable-identity columns existed.
      const columns = this.ctx.storage.sql
        .exec("PRAGMA table_info(participant)")
        .toArray()
        .map((row) => String(row["name"]));
      if (!columns.includes("client_id")) {
        this.ctx.storage.sql.exec(
          "ALTER TABLE participant ADD COLUMN client_id TEXT"
        );
      }
      if (!columns.includes("disconnected_at")) {
        this.ctx.storage.sql.exec(
          "ALTER TABLE participant ADD COLUMN disconnected_at INTEGER"
        );
      }
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS story (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          description TEXT,
          position INTEGER,
          status TEXT DEFAULT 'pending'
        )
      `);
      // Migrate story rows created before the result columns existed.
      const storyColumns = this.ctx.storage.sql
        .exec("PRAGMA table_info(story)")
        .toArray()
        .map((row) => String(row["name"]));
      if (!storyColumns.includes("final_estimate")) {
        this.ctx.storage.sql.exec(
          "ALTER TABLE story ADD COLUMN final_estimate TEXT"
        );
      }
      if (!storyColumns.includes("unanimous")) {
        this.ctx.storage.sql.exec(
          "ALTER TABLE story ADD COLUMN unanimous INTEGER"
        );
      }
      if (!storyColumns.includes("source_url")) {
        this.ctx.storage.sql.exec(
          "ALTER TABLE story ADD COLUMN source_url TEXT"
        );
      }
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS estimate (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          story_id INTEGER,
          participant_id TEXT,
          value TEXT,
          created_at INTEGER,
          UNIQUE(story_id, participant_id)
        )
      `);
    });
  }

  // --- WebSocket transport ---

  async fetch(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string): Promise<void> {
    const data = ws.deserializeAttachment() as ConnectionData | null;
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message) as ClientMessage;
    } catch {
      return;
    }

    try {
      switch (msg.type) {
        case "create": {
          this.createRoom();
          const result = this.join(msg.displayName.slice(0, 64), msg.clientId);
          ws.serializeAttachment({ participantId: result.participant.id });
          this.sendToClient(ws, {
            type: "room_state",
            room: result.room,
            participants: result.participants,
            stories: result.stories,
            currentEstimates: result.currentEstimates,
            totalParticipants: result.totalParticipants,
            myParticipantId: result.participant.id,
          });
          if (result.isNew) {
            this.broadcast(
              {
                type: "participant_joined",
                participant: result.participant,
              },
              ws
            );
          }
          break;
        }
        case "join": {
          if (!this.roomExists()) {
            this.sendToClient(ws, {
              type: "error",
              message: "Room not found",
            });
            break;
          }
          const result = this.join(msg.displayName.slice(0, 64), msg.clientId);
          ws.serializeAttachment({ participantId: result.participant.id });
          this.sendToClient(ws, {
            type: "room_state",
            room: result.room,
            participants: result.participants,
            stories: result.stories,
            currentEstimates: result.currentEstimates,
            totalParticipants: result.totalParticipants,
            myParticipantId: result.participant.id,
          });
          // A reconnecting participant is still present in everyone's list during
          // the grace window, so only announce genuinely new members.
          if (result.isNew) {
            this.broadcast(
              {
                type: "participant_joined",
                participant: result.participant,
              },
              ws
            );
          }
          break;
        }
        case "estimate":
          if (data && FIBONACCI_VALUES.includes(msg.value)) {
            this.estimate(data.participantId, msg.value);
            this.broadcast({
              type: "estimate_received",
              participantId: data.participantId,
            });
          }
          break;
        case "clear_estimate":
          if (data) {
            this.clearEstimate(data.participantId);
            this.broadcast({
              type: "estimate_cleared",
              participantId: data.participantId,
            });
          }
          break;
        case "reveal": {
          const result = this.reveal();
          if (result) this.broadcast({ type: "revealed", ...result });
          break;
        }
        case "next_story": {
          const stories = this.nextStory();
          for (const s of stories) {
            this.broadcast({ type: "story_changed", story: s });
          }
          break;
        }
        case "re_vote":
          this.reVote();
          this.broadcast({ type: "re_vote_started" });
          break;
        case "rename":
          if (data) {
            const displayName = msg.displayName.slice(0, 64);
            this.rename(data.participantId, displayName);
            this.broadcast({
              type: "participant_renamed",
              participantId: data.participantId,
              displayName,
            });
          }
          break;
        case "add_story": {
          const story = this.addStory(
            msg.title.slice(0, 200),
            msg.description.slice(0, 2000),
            msg.sourceUrl
          );
          this.broadcast({ type: "story_added", story });
          if (story.status === "active") {
            const estimatedIds = this.ctx.storage.sql
              .exec("SELECT participant_id FROM estimate WHERE story_id = ?", story.id)
              .toArray()
              .map((row) => String(row["participant_id"]));
            this.broadcast({
              type: "story_changed",
              story,
              estimateCount: this.getEstimateCount(),
              estimatedParticipantIds: estimatedIds.length > 0 ? estimatedIds : undefined,
            });
          }
          break;
        }
        case "set_final_estimate": {
          if (msg.value !== null && !FIBONACCI_VALUES.includes(msg.value)) break;
          const story = this.setFinalEstimate(msg.value);
          if (story) this.broadcast({ type: "story_updated", story });
          break;
        }
        case "edit_story": {
          const story = this.editStory(
            msg.id,
            msg.title.slice(0, 200),
            msg.description.slice(0, 2000)
          );
          if (story) this.broadcast({ type: "story_updated", story });
          break;
        }
        case "delete_story": {
          const promoted = this.deleteStory(msg.id);
          this.broadcast({ type: "story_deleted", storyId: msg.id });
          if (promoted) this.broadcast({ type: "story_changed", story: promoted });
          break;
        }
        case "select_story": {
          const statusRows = this.ctx.storage.sql
            .exec("SELECT status FROM story WHERE id = ?", msg.id)
            .toArray();
          const wasDone = statusRows.length > 0 && statusRows[0]["status"] === "done";
          const stories = this.setActiveStory(msg.id);
          const estimateCount = wasDone
            ? Number(
                this.ctx.storage.sql
                  .exec(
                    "SELECT COUNT(*) as count FROM estimate WHERE story_id = ?",
                    msg.id
                  )
                  .one()!["count"]
              )
            : undefined;
          for (const s of stories) {
            if (s.id === msg.id && estimateCount !== undefined) {
              this.broadcast({ type: "story_changed", story: s, estimateCount });
            } else {
              this.broadcast({ type: "story_changed", story: s });
            }
          }
          break;
        }
        case "upgrade_identity": {
          if (!data) break;
          const newClientId = msg.newClientId.slice(0, 128);
          const displayName = msg.displayName.slice(0, 64);

          // Check if newClientId is already taken by another participant
          const existing = this.ctx.storage.sql
            .exec("SELECT id FROM participant WHERE client_id = ?", newClientId)
            .toArray();
          if (existing.length > 0) {
            const existingId = String(existing[0]["id"]);
            if (existingId !== data.participantId) {
              this.sendToClient(ws, {
                type: "error",
                message: "Identity already in use",
              });
              break;
            }
          }

          // Update participant's client_id and display_name
          this.ctx.storage.sql.exec(
            "UPDATE participant SET client_id = ?, display_name = ? WHERE id = ?",
            newClientId,
            displayName,
            data.participantId
          );

          // Update the connection data
          ws.serializeAttachment({ participantId: data.participantId });

          this.broadcast({
            type: "participant_renamed",
            participantId: data.participantId,
            displayName,
          });
          break;
        }
        case "reset_session": {
          this.resetSession();
          const state = this.getRoomState();
          for (const ws of this.ctx.getWebSockets()) {
            const wsData = ws.deserializeAttachment() as ConnectionData | null;
            if (wsData && ws.readyState === WebSocket.OPEN) {
              this.sendToClient(ws, {
                type: "room_state",
                ...state,
                myParticipantId: wsData.participantId,
              });
            }
          }
          break;
        }
      }
    } catch (e) {
      console.error("webSocketMessage:", e);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const data = ws.deserializeAttachment() as ConnectionData | null;
    if (!data) return;

    // Another open socket (e.g. a second tab) still represents this
    // participant — keep them present.
    const stillConnected = this.ctx.getWebSockets().some((other) => {
      if (other === ws || other.readyState !== WebSocket.OPEN) return false;
      const otherData = other.deserializeAttachment() as ConnectionData | null;
      return otherData?.participantId === data.participantId;
    });
    if (stillConnected) return;

    try {
      // Defer removal: mark disconnected and schedule reaping so a quick
      // reconnect can reclaim the identity.
      this.ctx.storage.sql.exec(
        "UPDATE participant SET disconnected_at = ? WHERE id = ?",
        Date.now(),
        data.participantId
      );
      const existingAlarm = await this.ctx.storage.getAlarm();
      if (existingAlarm === null) {
        await this.ctx.storage.setAlarm(Date.now() + DISCONNECT_GRACE_MS);
      }
    } catch (e) {
      console.error("webSocketClose:", e);
    }
  }

  async alarm(): Promise<void> {
    try {
      const cutoff = Date.now() - DISCONNECT_GRACE_MS;
      const expired = this.ctx.storage.sql
        .exec(
          "SELECT id FROM participant WHERE disconnected_at IS NOT NULL AND disconnected_at <= ?",
          cutoff
        )
        .toArray();

      for (const row of expired) {
        const participantId = String(row["id"]);
        this.removeParticipant(participantId);
        this.broadcast({ type: "participant_left", participantId });
      }

      // Re-arm if anyone is still inside their grace window.
      const next = this.ctx.storage.sql
        .exec(
          "SELECT MIN(disconnected_at) as next FROM participant WHERE disconnected_at IS NOT NULL"
        )
        .one()["next"];
      if (next !== null) {
        await this.ctx.storage.setAlarm(Number(next) + DISCONNECT_GRACE_MS);
      }
    } catch (e) {
      console.error("alarm:", e);
    }
  }

  // --- Room existence ---

  roomExists(): boolean {
    const rows = this.ctx.storage.sql
      .exec("SELECT 1 FROM room WHERE id = ?", this.roomId)
      .toArray();
    return rows.length > 0;
  }

  createRoom(): void {
    this.ensureRoomExists();
  }

  // --- RPC methods (testable core logic) ---

  join(
    displayName: string,
    clientId?: string
  ): {
    participant: Participant;
    isNew: boolean;
    room: RoomInfo;
    participants: Participant[];
    stories: Story[];
    currentEstimates: number;
    totalParticipants: number;
  } {
    // A client without a stable id (e.g. legacy clients) always joins fresh.
    const stableClientId = clientId ?? crypto.randomUUID();

    const existing = this.ctx.storage.sql
      .exec(
        "SELECT id, color FROM participant WHERE client_id = ?",
        stableClientId
      )
      .toArray();

    let participantId: string;
    let color: string;
    let isNew: boolean;

    if (existing.length > 0) {
      // Reconnect: reuse the existing identity, clear any pending removal,
      // and accept the latest display name.
      participantId = String(existing[0]["id"]);
      color = String(existing[0]["color"]);
      isNew = false;
      this.ctx.storage.sql.exec(
        "UPDATE participant SET display_name = ?, disconnected_at = NULL WHERE id = ?",
        displayName,
        participantId
      );
    } else {
      const participantCount = Number(
        this.ctx.storage.sql
          .exec("SELECT COUNT(*) as count FROM participant")
          .one()!["count"]
      );
      participantId = crypto.randomUUID();
      color = assignColor(participantCount);
      isNew = true;
      this.ctx.storage.sql.exec(
        "INSERT INTO participant (id, display_name, color, joined_at, client_id, disconnected_at) VALUES (?, ?, ?, ?, ?, NULL)",
        participantId,
        displayName,
        color,
        Date.now(),
        stableClientId
      );
    }

    this.ensureRoomExists();

    const roomRow = this.ctx.storage.sql
      .exec("SELECT * FROM room WHERE id = ?", this.roomId)
      .one()!;

    const roundId = this.getActiveStoryId() ?? NO_STORY_ROUND_ID;
    const hasEstimated =
      this.ctx.storage.sql
        .exec(
          "SELECT 1 FROM estimate WHERE story_id = ? AND participant_id = ?",
          roundId,
          participantId
        )
        .toArray().length > 0;

    const participant: Participant = {
      id: participantId,
      displayName,
      color,
      hasEstimated,
    };

    const participants = this.getParticipants();

    return {
      participant,
      isNew,
      room: {
        id: String(roomRow["id"]),
        name: String(roomRow["name"]),
        createdAt: Number(roomRow["created_at"]),
      },
      participants,
      stories: this.getStories(),
      currentEstimates: this.getEstimateCount(),
      totalParticipants: participants.length,
    };
  }

  estimate(participantId: string, value: FibonacciValue): void {
    const roundId = this.getActiveStoryId() ?? NO_STORY_ROUND_ID;

    this.ctx.storage.sql.exec(
      `INSERT INTO estimate (story_id, participant_id, value, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(story_id, participant_id) DO UPDATE SET value = excluded.value, created_at = excluded.created_at`,
      roundId,
      participantId,
      value,
      Date.now()
    );
  }

  clearEstimate(participantId: string): void {
    const roundId = this.getActiveStoryId() ?? NO_STORY_ROUND_ID;

    this.ctx.storage.sql.exec(
      "DELETE FROM estimate WHERE story_id = ? AND participant_id = ?",
      roundId,
      participantId
    );
  }

  reveal(): {
    estimates: { participantId: string; value: FibonacciValue }[];
    revealResult: RevealResult | null;
  } | null {
    const roundId = this.getActiveStoryId() ?? NO_STORY_ROUND_ID;

    const estimateRows = this.ctx.storage.sql
      .exec(
        "SELECT participant_id, value FROM estimate WHERE story_id = ?",
        roundId
      )
      .toArray();

    if (estimateRows.length === 0) {
      const activeStoryId = this.getActiveStoryId();
      if (activeStoryId) {
        this.ctx.storage.sql.exec(
          "UPDATE story SET status = 'revealed', unanimous = 0 WHERE id = ?",
          activeStoryId
        );
      }
      return { estimates: [], revealResult: null };
    }

    const values = estimateRows.map((row) => String(row["value"]) as FibonacciValue);

    // Distribution
    const valueCounts = new Map<string, number>();
    for (const v of values) {
      valueCounts.set(v, (valueCounts.get(v) ?? 0) + 1);
    }

    const nonCoffeeValues = values.filter((v) => v !== "☕");
    const allAgree = nonCoffeeValues.length > 1 && new Set(nonCoffeeValues).size === 1;

    const distribution: { value: FibonacciValue; count: number }[] = [];
    for (const v of FIBONACCI_VALUES) {
      const count = valueCounts.get(v) ?? 0;
      if (count > 0) distribution.push({ value: v, count });
    }

    const revealResult: RevealResult = {
      distribution,
      allAgree,
    };

    const activeStoryId = this.getActiveStoryId();
    if (activeStoryId) {
      if (allAgree) {
        // A unanimous round (coffee abstains) has a single agreed value; record
        // it as the final estimate so the team needn't re-pick it by hand.
        const agreedValue = nonCoffeeValues[0];
        this.ctx.storage.sql.exec(
          "UPDATE story SET status = 'revealed', unanimous = 1, final_estimate = ? WHERE id = ?",
          agreedValue,
          activeStoryId
        );
      } else {
        this.ctx.storage.sql.exec(
          "UPDATE story SET status = 'revealed', unanimous = 0 WHERE id = ?",
          activeStoryId
        );
      }
    }

    return {
      estimates: values.map((value, i) => ({
        participantId: String(estimateRows[i]["participant_id"]),
        value,
      })),
      revealResult,
    };
  }

  nextStory(): Story[] {
    const activeStoryId = this.getActiveStoryId();

    if (activeStoryId) {
      this.ctx.storage.sql.exec(
        "UPDATE story SET status = 'done' WHERE id = ?",
        activeStoryId
      );
    }

    const pendingRows = this.ctx.storage.sql
      .exec(
        "SELECT id, title, description, position, status, final_estimate, unanimous, source_url FROM story WHERE status = 'pending' ORDER BY position ASC LIMIT 1"
      )
      .toArray();

    if (pendingRows.length > 0) {
      this.ctx.storage.sql.exec(
        "UPDATE story SET status = 'active' WHERE id = ?",
        pendingRows[0]["id"]
      );
    }

    return this.getStories();
  }

  setActiveStory(id: number): Story[] {
    // Demote whichever story is currently in play back to pending; its
    // estimates are preserved so the team can resume it later.
    this.ctx.storage.sql.exec(
      "UPDATE story SET status = 'pending' WHERE status IN ('active', 'revealed') AND id != ?",
      id
    );
    this.ctx.storage.sql.exec(
      "UPDATE story SET status = 'active' WHERE id = ?",
      id
    );
    return this.getStories();
  }

  setFinalEstimate(value: FibonacciValue | null): Story | null {
    const activeStoryId = this.getActiveStoryId();
    if (!activeStoryId) return null;
    this.ctx.storage.sql.exec(
      "UPDATE story SET final_estimate = ? WHERE id = ?",
      value,
      activeStoryId
    );
    return this.getStoryById(activeStoryId);
  }

  reVote(): void {
    const roundId = this.getActiveStoryId() ?? NO_STORY_ROUND_ID;

    this.ctx.storage.sql.exec(
      "DELETE FROM estimate WHERE story_id = ?",
      roundId
    );

    // Only update story status if there's an actual story
    const activeStoryId = this.getActiveStoryId();
    if (activeStoryId) {
      this.ctx.storage.sql.exec(
        "UPDATE story SET status = 'active' WHERE id = ?",
        activeStoryId
      );
    }
  }

  resetSession(): void {
    this.ctx.storage.sql.exec(
      "DELETE FROM estimate WHERE story_id IN (SELECT id FROM story)"
    );
    this.ctx.storage.sql.exec("DELETE FROM story");
  }

  addStory(title: string, description: string, sourceUrl?: string): Story {
    const maxPos = Number(
      this.ctx.storage.sql
        .exec("SELECT COALESCE(MAX(position), 0) as max_pos FROM story")
        .one()!["max_pos"]
    );

    const autoActivated = this.getActiveStoryId() === null;

    const initialStatus = autoActivated ? "active" : "pending";

    this.ctx.storage.sql.exec(
      "INSERT INTO story (title, description, position, status, source_url) VALUES (?, ?, ?, ?, ?)",
      title,
      description,
      maxPos + 1,
      initialStatus,
      sourceUrl ?? null
    );

    const row = this.ctx.storage.sql
      .exec(
        "SELECT id, title, description, position, status, final_estimate, unanimous, source_url FROM story WHERE id = last_insert_rowid()"
      )
      .one();

    const story = this.rowToStory(row);

    if (autoActivated && !Number.isNaN(story.id)) {
      this.ctx.storage.sql.exec(
        `INSERT INTO estimate (story_id, participant_id, value, created_at)
         SELECT ?, participant_id, value, created_at FROM estimate WHERE story_id = 0
         ON CONFLICT(story_id, participant_id) DO UPDATE SET
           value = excluded.value, created_at = excluded.created_at`,
        story.id
      );
      this.ctx.storage.sql.exec("DELETE FROM estimate WHERE story_id = 0");
    }

    return story;
  }

  editStory(id: number, title: string, description: string): Story | null {
    this.ctx.storage.sql.exec(
      "UPDATE story SET title = ?, description = ? WHERE id = ?",
      title,
      description,
      id
    );
    return this.getStoryById(id);
  }

  deleteStory(id: number): Story | null {
    const wasCurrent = this.getActiveStoryId() === id;

    this.ctx.storage.sql.exec("DELETE FROM estimate WHERE story_id = ?", id);
    this.ctx.storage.sql.exec("DELETE FROM story WHERE id = ?", id);

    if (!wasCurrent) return null;

    // The current round was deleted; promote the next pending story so the
    // team keeps moving instead of landing on an empty spotlight.
    const pendingRows = this.ctx.storage.sql
      .exec(
        "SELECT id FROM story WHERE status = 'pending' ORDER BY position ASC LIMIT 1"
      )
      .toArray();
    if (pendingRows.length === 0) return null;

    const newId = Number(pendingRows[0]["id"]);
    this.ctx.storage.sql.exec(
      "UPDATE story SET status = 'active', final_estimate = NULL, unanimous = NULL WHERE id = ?",
      newId
    );
    return this.getStoryById(newId);
  }

  getRoomState(): {
    room: RoomInfo;
    participants: Participant[];
    stories: Story[];
    currentEstimates: number;
    totalParticipants: number;
  } {
    this.ensureRoomExists();
    const roomRow = this.ctx.storage.sql
      .exec("SELECT * FROM room WHERE id = ?", this.roomId)
      .one()!;

    const participants = this.getParticipants();

    return {
      room: {
        id: String(roomRow["id"]),
        name: String(roomRow["name"]),
        createdAt: Number(roomRow["created_at"]),
      },
      participants,
      stories: this.getStories(),
      currentEstimates: this.getEstimateCount(),
      totalParticipants: participants.length,
    };
  }

  rename(participantId: string, displayName: string): void {
    this.ctx.storage.sql.exec(
      "UPDATE participant SET display_name = ? WHERE id = ?",
      displayName,
      participantId
    );
  }

  // --- Private helpers ---

  private ensureRoomExists(): void {
    const rows = this.ctx.storage.sql
      .exec("SELECT 1 FROM room WHERE id = ?", this.roomId)
      .toArray();
    if (rows.length === 0) {
      this.ctx.storage.sql.exec(
        "INSERT INTO room (id, name, created_at) VALUES (?, ?, ?)",
        this.roomId,
        this.roomId,
        Date.now()
      );
    }
  }

  removeParticipant(participantId: string): void {
    const roundId = this.getActiveStoryId() ?? NO_STORY_ROUND_ID;
    this.ctx.storage.sql.exec(
      "DELETE FROM estimate WHERE participant_id = ? AND story_id = ?",
      participantId,
      roundId
    );
    this.ctx.storage.sql.exec(
      "DELETE FROM participant WHERE id = ?",
      participantId
    );
  }

  private getParticipants(): Participant[] {
    const roundId = this.getActiveStoryId() ?? NO_STORY_ROUND_ID;
    const estimatorIds = new Set(
      this.ctx.storage.sql
        .exec("SELECT participant_id FROM estimate WHERE story_id = ?", roundId)
        .toArray()
        .map((row) => String(row["participant_id"]))
    );
    return this.ctx.storage.sql
      .exec("SELECT id, display_name, color FROM participant ORDER BY joined_at ASC")
      .toArray()
      .map((row) => ({
        id: String(row["id"]),
        displayName: String(row["display_name"]),
        color: String(row["color"]),
        hasEstimated: estimatorIds.has(String(row["id"])),
      }));
  }

  private rowToStory(row: Record<string, SqlStorageValue>): Story {
    const finalEstimate = row["final_estimate"];
    const unanimous = row["unanimous"];
    const sourceUrl = row["source_url"];
    return {
      id: Number(row["id"]),
      title: String(row["title"]),
      description: String(row["description"]),
      position: Number(row["position"]),
      status: String(row["status"]) as Story["status"],
      finalEstimate:
        finalEstimate === null || finalEstimate === undefined
          ? null
          : (String(finalEstimate) as FibonacciValue),
      unanimous:
        unanimous === null || unanimous === undefined
          ? null
          : Number(unanimous) === 1,
      sourceUrl:
        sourceUrl === null || sourceUrl === undefined
          ? undefined
          : String(sourceUrl),
    };
  }

  private getStoryById(id: number): Story | null {
    const rows = this.ctx.storage.sql
      .exec(
        "SELECT id, title, description, position, status, final_estimate, unanimous, source_url FROM story WHERE id = ?",
        id
      )
      .toArray();
    return rows.length > 0 ? this.rowToStory(rows[0]) : null;
  }

  private getStories(): Story[] {
    return this.ctx.storage.sql
      .exec(
        "SELECT id, title, description, position, status, final_estimate, unanimous, source_url FROM story ORDER BY position ASC"
      )
      .toArray()
      .map((row) => this.rowToStory(row));
  }

  private getActiveStoryId(): number | null {
    const rows = this.ctx.storage.sql
      .exec("SELECT id FROM story WHERE status IN ('active', 'revealed') LIMIT 1")
      .toArray();
    return rows.length > 0 ? Number(rows[0]["id"]) : null;
  }

  private getEstimateCount(): number {
    const roundId = this.getActiveStoryId() ?? NO_STORY_ROUND_ID;
    return Number(
      this.ctx.storage.sql
        .exec(
          "SELECT COUNT(*) as count FROM estimate WHERE story_id = ?",
          roundId
        )
        .one()!["count"]
    );
  }

  private sendToClient(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(message: ServerMessage, exclude?: WebSocket): void {
    const json = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
        ws.send(json);
      }
    }
  }
}
