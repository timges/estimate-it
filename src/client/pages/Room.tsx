import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { FibonacciValue } from "../../shared/types";
import AddStory from "../components/AddStory";
import CardGrid from "../components/CardGrid";
import ImportIssues from "../components/ImportIssues";
import NamePrompt from "../components/NamePrompt";
import ParticipantList from "../components/ParticipantList";
import RevealBoard from "../components/RevealBoard";
import SessionSummary from "../components/SessionSummary";
import StoryList from "../components/StoryList";
import StorySpotlight from "../components/StorySpotlight";
import { RoomSocket } from "../lib/ws";
import { useRoomStore } from "../store/room";
import { useAuthStore } from "../store/auth";
import styles from "./Room.module.css";

// A stable per-browser id so refreshes and reconnects rejoin as the same
// participant instead of creating a new room member. Falls back to a
// session-scoped id when storage is unavailable (e.g. private mode), which
// still keeps reconnects stable for the life of the page.
let inMemoryClientId: string | null = null;

function getClientId(): string {
  try {
    let id = localStorage.getItem("clientId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("clientId", id);
    }
    return id;
  } catch {
    if (!inMemoryClientId) inMemoryClientId = crypto.randomUUID();
    return inMemoryClientId;
  }
}

function getGithubClientId(userId: string): string {
  return `github:${userId}`;
}

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const wsRef = useRef<RoomSocket | null>(null);
  const { user, loading: authLoading, fetchSession } = useAuthStore();
  const [hasName, setHasName] = useState(() => {
    if (useAuthStore.getState().user) return true;
    const stored = localStorage.getItem("displayName");
    return !!stored;
  });

  const {
    connected,
    setConnected,
    room,
    participants,
    myParticipantId,
    stories,
    revealed,
    estimates,
    revealResult,
    myEstimate,
    setMyEstimate,
    currentEstimates,
    handleMessage,
    error,
    setError,
  } = useRoomStore();

  const connectAndJoin = useCallback(
    (displayName: string) => {
      if (!roomId) return;

      const ws = new RoomSocket(roomId, handleMessage, setConnected);
      wsRef.current = ws;

      const currentUser = useAuthStore.getState().user;
      const clientId = currentUser
        ? getGithubClientId(currentUser.id)
        : getClientId();
      const name = currentUser ? currentUser.name : displayName;

      const roomAction = localStorage.getItem("roomAction") || "join";
      localStorage.removeItem("roomAction");
      ws.connect({
        type: roomAction === "create" ? "create" : "join",
        displayName: name,
        clientId,
      });
    },
    [roomId, handleMessage, setConnected],
  );

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (authLoading) return;
    if (!hasName && !user) return;
    if (!roomId) return;

    const storedName = localStorage.getItem("displayName") || "Anonymous";
    connectAndJoin(storedName);

    return () => {
      wsRef.current?.close();
      setError(null);
    };
  }, [hasName, user, authLoading, roomId, connectAndJoin, setError]);

  // Handle login-after-join: upgrade identity when user logs in while in room
  const prevUserRef = useRef(user);
  useEffect(() => {
    if (user && !prevUserRef.current && wsRef.current) {
      // User just logged in while already in the room
      wsRef.current.send({
        type: "upgrade_identity",
        newClientId: getGithubClientId(user.id),
        displayName: user.name,
      });
    }
    prevUserRef.current = user;
  }, [user]);

  const handleNameSubmit = useCallback((name: string) => {
    localStorage.setItem("displayName", name);
    setHasName(true);
  }, []);

  const handleEstimate = useCallback(
    (value: FibonacciValue) => {
      setMyEstimate(value);
      wsRef.current?.send({ type: "estimate", value });
    },
    [setMyEstimate],
  );

  const handleDeselect = useCallback(() => {
    setMyEstimate(null);
    wsRef.current?.send({ type: "clear_estimate" });
  }, [setMyEstimate]);

  const handleReveal = useCallback(() => {
    wsRef.current?.send({ type: "reveal" });
  }, []);

  const handleReVote = useCallback(() => {
    wsRef.current?.send({ type: "re_vote" });
  }, []);

  const handleNextStory = useCallback(() => {
    wsRef.current?.send({ type: "next_story" });
  }, []);

  const handleAddStory = useCallback((title: string, description: string, sourceUrl?: string) => {
    wsRef.current?.send({ type: "add_story", title, description, sourceUrl });
  }, []);

  const handleEditStory = useCallback(
    (id: number, title: string, description: string) => {
      wsRef.current?.send({ type: "edit_story", id, title, description });
    },
    []
  );

  const handleDeleteStory = useCallback((id: number) => {
    wsRef.current?.send({ type: "delete_story", id });
  }, []);

  const handleSelectStory = useCallback((id: number) => {
    wsRef.current?.send({ type: "select_story", id });
  }, []);

  const handleNewSession = useCallback(() => {
    wsRef.current?.send({ type: "reset_session" });
  }, []);

  const handleSetFinalEstimate = useCallback((value: FibonacciValue) => {
    wsRef.current?.send({ type: "set_final_estimate", value });
  }, []);

  const handleRename = useCallback((newName: string) => {
    wsRef.current?.send({ type: "rename", displayName: newName });
    wsRef.current?.updateName(newName);
    localStorage.setItem("displayName", newName);
  }, []);

  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const currentStory =
    stories.find((s) => s.status === "active" || s.status === "revealed") ??
    null;
  const hasNextStory = stories.some((s) => s.status === "pending");
  const doneCount = stories.filter((s) => s.status === "done").length;
  const sessionComplete =
    stories.length > 0 && stories.every((s) => s.status === "done");

  if (!hasName && !user && roomId) {
    return <NamePrompt roomId={roomId} onSubmit={handleNameSubmit} />;
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h1 className={styles.errorTitle}>{error}</h1>
        <p className={styles.errorDescription}>
          The room you tried to join does not exist or is no longer available.
        </p>
        <Link to="/" className={styles.errorLink}>
          Back to Home
        </Link>
      </div>
    );
  }

  async function handleRoomClick() {
    await navigator.clipboard.writeText(roomId ?? "");
    setCopied(true);
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>
          <a href="/">
            estimate-it<span className={styles.dot}>.</span>
          </a>
        </h1>
        <div className={styles.roomInfo}>
          {copied && (
            <span className={styles.copiedLabel} aria-live="polite">
              Copied
            </span>
          )}
          <button
            onClick={handleRoomClick}
            className={styles.code}
            aria-label={`Copy room code ${roomId}`}
          >
            {roomId}
          </button>
        </div>
      </header>

      <div className={styles.main}>
        <div className={styles.content}>
          {sessionComplete ? (
            <SessionSummary
              stories={stories}
              onNewSession={handleNewSession}
              onSelectStory={handleSelectStory}
            />
          ) : !revealed ? (
            <>
              {currentStory ? (
                <StorySpotlight
                  story={currentStory}
                  position={doneCount + 1}
                  total={stories.length}
                />
              ) : (
                <div className={styles.storyPrompt}>
                  <span className={styles.storyPromptText}>
                    No story — add one for context, or just vote.
                  </span>
                  <AddStory onAdd={handleAddStory} />
                </div>
              )}
              <CardGrid
                selected={myEstimate}
                onSelect={handleEstimate}
                onDeselect={handleDeselect}
                disabled={false}
              />
              <div className={styles.revealArea}>
                <button
                  className={styles.revealBtn}
                  onClick={handleReveal}
                  disabled={currentEstimates === 0}
                >
                  Reveal Estimates
                </button>
              </div>
            </>
          ) : (
            <>
              {currentStory && (
                <StorySpotlight
                  story={currentStory}
                  position={doneCount + 1}
                  total={stories.length}
                />
              )}
              <RevealBoard
                estimates={estimates}
                revealResult={revealResult}
                participants={participants}
                onReVote={handleReVote}
                onNextStory={handleNextStory}
                hasNextStory={hasNextStory}
                hasActiveStory={currentStory !== null}
                finalEstimate={currentStory?.finalEstimate ?? null}
                onSetFinalEstimate={handleSetFinalEstimate}
              />
            </>
          )}
        </div>

        <div className={styles.sidebar}>
          <section className={styles.section}>
            <h3 className={styles.sectionHeading}>
              Participants ({participants.length})
            </h3>
            <ParticipantList
              participants={participants}
              currentParticipantId={myParticipantId}
              onRename={handleRename}
            />
          </section>
          <section className={styles.section}>
            <h3 className={styles.sectionHeading}>Stories</h3>
            <div className={styles.storyActions}>
              <AddStory onAdd={handleAddStory} />
              {user && <ImportIssues onImport={handleAddStory} />}
            </div>
            <StoryList
              stories={stories}
              onEditStory={handleEditStory}
              onDeleteStory={handleDeleteStory}
              onSelectStory={handleSelectStory}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
