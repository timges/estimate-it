import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { FibonacciValue } from "../../shared/types";
import CardGrid from "../components/CardGrid";
import NamePrompt from "../components/NamePrompt";
import ParticipantList from "../components/ParticipantList";
import RevealBoard from "../components/RevealBoard";
import StoryList from "../components/StoryList";
import { RoomSocket } from "../lib/ws";
import { useRoomStore } from "../store/room";
import styles from "./Room.module.css";

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const wsRef = useRef<RoomSocket | null>(null);
  const [hasName, setHasName] = useState(() => {
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
    handleMessage,
    error,
    setError,
  } = useRoomStore();

  const connectAndJoin = useCallback(
    (displayName: string) => {
      if (!roomId) return;

      const ws = new RoomSocket(roomId, handleMessage, setConnected);
      ws.connect();
      wsRef.current = ws;

      const roomAction = localStorage.getItem("roomAction") || "join";
      localStorage.removeItem("roomAction");
      ws.send({
        type: roomAction === "create" ? "create" : "join",
        displayName,
      });
    },
    [roomId, handleMessage, setConnected],
  );

  useEffect(() => {
    if (!hasName || !roomId) return;

    const storedName = localStorage.getItem("displayName") || "Anonymous";
    connectAndJoin(storedName);

    return () => {
      wsRef.current?.close();
      setError(null);
    };
  }, [hasName, roomId, connectAndJoin, setError]);

  const handleNameSubmit = useCallback(
    (name: string) => {
      localStorage.setItem("displayName", name);
      setHasName(true);
    },
    [],
  );

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

  const handleAddStory = useCallback((title: string, description: string) => {
    wsRef.current?.send({ type: "add_story", title, description });
  }, []);

  const handleRename = useCallback((newName: string) => {
    wsRef.current?.send({ type: "rename", displayName: newName });
    localStorage.setItem("displayName", newName);
  }, []);

  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const activeStory = stories.find((s) => s.status === "active") ?? null;
  const hasNextStory = stories.some((s) => s.status === "pending");

  if (!hasName && roomId) {
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
          <button onClick={handleRoomClick} className={styles.code}>
            {roomId}
          </button>
          {copied && <span className={styles.copiedLabel}>copied</span>}
        </div>
      </header>

      <div className={styles.main}>
        <div className={styles.content}>
          {/*<StoryCard story={activeStory} />*/}
          {/*<AddStory onAdd={handleAddStory} />*/}

          {!revealed ? (
            <>
              <CardGrid
                selected={myEstimate}
                onSelect={handleEstimate}
                onDeselect={handleDeselect}
                disabled={false}
              />
              <div className={styles.revealArea}>
                <button className={styles.revealBtn} onClick={handleReveal}>
                  Reveal Estimates
                </button>
              </div>
            </>
          ) : (
            <RevealBoard
              estimates={estimates}
              revealResult={revealResult}
              participants={participants}
              onReVote={handleReVote}
              onNextStory={handleNextStory}
              hasNextStory={hasNextStory}
            />
          )}
        </div>

        <div className={styles.sidebar}>
          <ParticipantList
            participants={participants}
            currentParticipantId={myParticipantId}
            onRename={handleRename}
          />
          <StoryList stories={stories} />
        </div>
      </div>
    </div>
  );
}
